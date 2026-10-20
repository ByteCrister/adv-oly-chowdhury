import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { withErrorHandler } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import {
  validateCronSecret,
  getOneMonthRetentionCutoff,
  acquireCronLock,
} from "@/lib/helpers/cron.helper";
import { recordAuditLog, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/helpers/audit.helper";
import { deleteFromCloudinary } from "@/lib/services/cloudinary.service";
import { ASSET_STATUSES } from "@/const/asset.const";

// Mongoose Models
import { Asset } from "@/db/models/Asset.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { User } from "@/db/models/User.model";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { CaseExpense } from "@/db/models/CaseExpense.model";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { CaseEvent } from "@/db/models/CaseEvent.model";

// Response Types
import type { CronMediaCleanupResponse } from "@/types/cron.types";

const DEFAULT_BATCH_LIMIT = 50;
const MAX_BATCH_LIMIT = 100;

/**
 * Checks if a physical Asset is genuinely unreferenced across all application collections.
 *
 * Checks:
 * 1. AssetReference collection: counts ALL references (active or in retention).
 * 2. User profile: checks direct signatureAssetId reference.
 * 3. Defensive entity guards: checks if any legacy/unnormalized document directly references the assetId.
 */
async function isAssetGenuinelyOrphaned(
  assetId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<boolean> {
  // 1. Any AssetReference existing in the database (active or within retention window)
  const refQuery = AssetReference.countDocuments({ assetId });
  if (session) refQuery.session(session);
  const refCount = await refQuery;
  if (refCount > 0) {
    return false;
  }

  // 2. Direct reference in User model (signatureAssetId points directly to Asset)
  const userDirectQuery = User.exists({ signatureAssetId: assetId });
  if (session) userDirectQuery.session(session);
  const userDirect = await userDirectQuery;
  if (userDirect) {
    return false;
  }

  // 3. Defensive checks on document collections
  const [caseDoc, clientDoc, expense, payment, event] = await Promise.all([
    CaseDocument.exists({ assetReferenceId: assetId }),
    ClientDocument.exists({ assetReferenceId: assetId }),
    CaseExpense.exists({ receiptAssetReferenceId: assetId }),
    ClientPayment.exists({ receiptAssetreferenceId: assetId }),
    CaseEvent.exists({ assetReferenceId: assetId }),
  ]);

  if (caseDoc || clientDoc || expense || payment || event) {
    return false;
  }

  return true;
}

/**
 * Shared Core Cleanup Handler for Deleted Asset References and Orphaned Cloudinary Assets.
 *
 * Sequence & Guarantees:
 * 1. Retry Phase: Re-attempts Cloudinary destruction for any assets previously stuck in 'deleted' status.
 * 2. Reference Purge Phase: Permanently removes soft-deleted AssetReferences whose retention period has passed.
 * 3. Orphan Detection & Safe Cloudinary Purge Phase:
 *    - Re-evaluates unlinked physical assets older than the 1-month retention period.
 *    - Atomically claims the asset in MongoDB ('ready' -> 'deleted') to prevent concurrent reuse.
 *    - Re-verifies reference count inside the claimed state.
 *    - Calls Cloudinary uploader.destroy outside database transactions to avoid open transaction timeouts.
 *    - On Cloudinary success ('ok' or 'not found'), permanently removes the MongoDB Asset record.
 *    - On Cloudinary network/rate-limit error, leaves the asset in 'deleted' state for safe retry.
 */
async function handleMediaCleanup(req: NextRequest): Promise<NextResponse> {
  // 1. Authenticate with dedicated CRON_SECRET using constant-time verification
  const authCheck = validateCronSecret(req);
  if (!authCheck.isValid) {
    return authCheck.response;
  }

  // 2. Parse bounded batch limits
  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit"));
  const batchLimit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_BATCH_LIMIT)
      : DEFAULT_BATCH_LIMIT;

  // 3. Compute precise 1 calendar month retention cutoff timestamp in UTC
  const now = new Date();
  const cutoffDate = getOneMonthRetentionCutoff(now);

  // 4. Acquire exclusive distributed execution lock
  const lock = await acquireCronLock("media", 300);
  if (!lock.acquired) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Conflict: Another media assets cleanup job is currently executing.",
        skipped: true,
      },
      { status: 409 }
    );
  }

  const referencesResult = {
    scanned: 0,
    eligible: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };

  const assetsResult = {
    retried: 0,
    orphansScanned: 0,
    eligible: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };

  let totalPurgedFromCloudinary = 0;
  let hasMore = false;

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Retry Previous Partial Failures (Assets in 'deleted' status)
    // -------------------------------------------------------------------------
    const pendingRetryAssets = await Asset.find({
      status: ASSET_STATUSES.DELETED,
    })
      .limit(batchLimit)
      .lean();

    for (const pendingAsset of pendingRetryAssets) {
      try {
        // Re-confirm genuinely orphaned before deleting remote CDN file
        const stillOrphaned = await isAssetGenuinelyOrphaned(pendingAsset._id);
        if (!stillOrphaned) {
          // Asset acquired a reference; restore status to READY
          await Asset.updateOne(
            { _id: pendingAsset._id },
            { $set: { status: ASSET_STATUSES.READY } }
          );
          assetsResult.skipped++;
          continue;
        }

        // Call Cloudinary to destroy the remote resource
        const cloudResult = await deleteFromCloudinary(
          pendingAsset.publicId,
          pendingAsset.resourceType as "image" | "video" | "raw" | "auto"
        );

        if (cloudResult.result === "ok" || cloudResult.result === "not found") {
          await Asset.deleteOne({
            _id: pendingAsset._id,
            status: ASSET_STATUSES.DELETED,
          });
          assetsResult.retried++;
          totalPurgedFromCloudinary++;
        } else {
          console.warn(
            `[CRON MEDIA] Cloudinary retry returned unexpected result for ${pendingAsset.publicId}:`,
            cloudResult
          );
        }
      } catch (retryErr) {
        assetsResult.failed++;
        console.error(
          `[CRON MEDIA] Retry failed for pending asset ${pendingAsset._id} (${pendingAsset.publicId}):`,
          retryErr
        );
      }
    }

    // -------------------------------------------------------------------------
    // Phase 2: Permanently Delete Soft-Deleted AssetReferences
    // -------------------------------------------------------------------------
    const eligibleReferences = await AssetReference.find({
      deletedAt: { $ne: null, $lte: cutoffDate },
    })
      .limit(batchLimit + 1)
      .lean();

    if (eligibleReferences.length > batchLimit) {
      hasMore = true;
      eligibleReferences.pop();
    }

    referencesResult.scanned = eligibleReferences.length;
    referencesResult.eligible = eligibleReferences.length;

    // Track unlinked asset IDs to inspect for orphan status in Phase 3
    const candidateAssetIds = new Set<string>();

    for (const ref of eligibleReferences) {
      try {
        await withTransaction(async (session) => {
          // Atomic deletion: only delete if still soft-deleted and retention elapsed
          const deletedRef = await AssetReference.findOneAndDelete(
            {
              _id: ref._id,
              deletedAt: { $ne: null, $lte: cutoffDate },
            },
            { session }
          );

          if (!deletedRef) {
            referencesResult.skipped++;
            return;
          }

          referencesResult.deleted++;
          candidateAssetIds.add(deletedRef.assetId.toString());

          await recordAuditLog({
            req,
            action: AUDIT_ACTIONS.DELETE,
            entityType: AUDIT_ENTITY_TYPES.ASSET_REFERENCE,
            entityId: ref._id,
            oldValues: {
              assetId: ref.assetId,
              originalFileName: ref.originalFileName,
              deletedAt: ref.deletedAt,
            },
            description: `Permanently purged soft-deleted media reference "${ref.originalFileName || ref._id}"`,
            session,
          });
        });
      } catch (refErr) {
        referencesResult.failed++;
        console.error(
          `[CRON MEDIA] Failed to delete AssetReference ${ref._id}:`,
          refErr
        );
      }
    }

    // -------------------------------------------------------------------------
    // Phase 3: Evaluate & Clean Up Orphaned Assets Across MongoDB & Cloudinary
    // -------------------------------------------------------------------------
    // Collect candidate assets: those affected by Phase 2 plus unreferenced assets created before cutoffDate
    const candidateIdObjects = Array.from(candidateAssetIds).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const candidateAssets = await Asset.find({
      $or: [
        { _id: { $in: candidateIdObjects }, status: ASSET_STATUSES.READY },
        {
          status: ASSET_STATUSES.READY,
          createdAt: { $lte: cutoffDate },
        },
      ],
    })
      .limit(batchLimit)
      .lean();

    assetsResult.orphansScanned = candidateAssets.length;

    for (const asset of candidateAssets) {
      try {
        // 1. Retention Requirement: Asset must be at least 1 month old to protect active in-flight uploads
        if (new Date(asset.createdAt) > cutoffDate) {
          assetsResult.skipped++;
          continue;
        }

        // 2. Pre-check: Verify no references remain in database
        const isOrphan = await isAssetGenuinelyOrphaned(asset._id);
        if (!isOrphan) {
          assetsResult.skipped++;
          continue;
        }

        assetsResult.eligible++;

        // 3. Atomic Claim: Transition asset status to 'deleted' to prevent concurrent deduplication or reuse
        const claimedAsset = await Asset.findOneAndUpdate(
          {
            _id: asset._id,
            status: ASSET_STATUSES.READY,
            createdAt: { $lte: cutoffDate },
          },
          {
            $set: { status: ASSET_STATUSES.DELETED },
          },
          { new: true }
        );

        if (!claimedAsset) {
          // Another worker claimed the asset or it was modified
          assetsResult.skipped++;
          continue;
        }

        // 4. Double-check inside claimed state: ensure no reference was linked concurrently
        const postClaimOrphan = await isAssetGenuinelyOrphaned(claimedAsset._id);
        if (!postClaimOrphan) {
          // Revert claim
          await Asset.updateOne(
            { _id: claimedAsset._id },
            { $set: { status: ASSET_STATUSES.READY } }
          );
          assetsResult.skipped++;
          continue;
        }

        // 5. Cloudinary Destruction (Outside MongoDB transaction to prevent transaction timeouts)
        try {
          const cloudResult = await deleteFromCloudinary(
            claimedAsset.publicId,
            claimedAsset.resourceType as "image" | "video" | "raw" | "auto"
          );

          if (cloudResult.result === "ok" || cloudResult.result === "not found") {
            // 6. Cloudinary deletion confirmed: permanently remove Asset record from MongoDB
            await Asset.deleteOne({
              _id: claimedAsset._id,
              status: ASSET_STATUSES.DELETED,
            });
            assetsResult.deleted++;
            totalPurgedFromCloudinary++;
          } else {
            console.warn(
              `[CRON MEDIA] Cloudinary returned non-ok result for asset ${claimedAsset.publicId}:`,
              cloudResult
            );
          }
        } catch (cloudErr) {
          // Cloudinary network/rate-limit error: Asset remains marked 'deleted' in MongoDB
          // and will be safely retried during Phase 1 on the next cron execution
          assetsResult.failed++;
          console.error(
            `[CRON MEDIA] Cloudinary API call failed for asset ${claimedAsset._id} (${claimedAsset.publicId}). Marked for retry:`,
            cloudErr
          );
        }
      } catch (assetErr) {
        assetsResult.failed++;
        console.error(
          `[CRON MEDIA] Unexpected error during asset cleanup for ${asset._id}:`,
          assetErr
        );
      }
    }

    const totalFailed = referencesResult.failed + assetsResult.failed;

    const responsePayload: CronMediaCleanupResponse = {
      success: totalFailed === 0,
      job: "cleanup-orphaned-media",
      retentionCutoff: cutoffDate.toISOString(),
      processedAt: now.toISOString(),
      batchLimit,
      references: referencesResult,
      assets: assetsResult,
      totalPurgedFromCloudinary,
      hasMore,
      message: `Media cleanup completed. ${referencesResult.deleted} references deleted, ${assetsResult.deleted} orphaned assets purged from Cloudinary and MongoDB, ${assetsResult.retried} retried, ${totalFailed} failed.`,
    };

    return NextResponse.json(responsePayload, {
      status: totalFailed > 0 && referencesResult.deleted === 0 && assetsResult.deleted === 0 ? 500 : 200,
    });
  } finally {
    await lock.release();
  }
}

/**
 * GET /api/cron/media
 * External scheduler trigger (e.g. Vercel Cron, Google Cloud Scheduler).
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  return handleMediaCleanup(req);
});

/**
 * POST /api/cron/media
 * External webhook/scheduler trigger (e.g. GitHub Actions, QStash, AWS EventBridge).
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  return handleMediaCleanup(req);
});
