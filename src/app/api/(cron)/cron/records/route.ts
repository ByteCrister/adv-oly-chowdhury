import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import {
  validateCronSecret,
  getOneMonthRetentionCutoff,
  acquireCronLock,
} from "@/lib/helpers/cron.helper";
import { recordAuditLog, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/helpers/audit.helper";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";

// Mongoose Models
import { Task } from "@/db/models/Task.model";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { Case } from "@/db/models/Case.model";
import { Hearing } from "@/db/models/Hearing.model";
import { CaseEvent } from "@/db/models/CaseEvent.model";
import { CaseExpense } from "@/db/models/CaseExpense.model";
import { CaseParty } from "@/db/models/CaseParty.model";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { Client } from "@/db/models/Client.model";
import { Court } from "@/db/models/Court.model";
import { AssetReference } from "@/db/models/AssetReference.model";

// Response Types
import type {
  CronRecordsCleanupResponse,
  CronCollectionCleanResult,
} from "@/types/cron.types";

const DEFAULT_BATCH_LIMIT = 50;
const MAX_BATCH_LIMIT = 100;

function createEmptyCleanResult(): CronCollectionCleanResult {
  return { scanned: 0, eligible: 0, deleted: 0, skipped: 0, failed: 0 };
}

/**
 * Shared Core Cleanup Handler for Soft-Deleted Database Records.
 *
 * Implements strict referential integrity in topological dependency order:
 * 1. Tasks (Independent leaf documents)
 * 2. CaseDocuments (Case-linked leaf documents)
 * 3. ClientDocuments (Client-linked leaf documents)
 * 4. Cases (Aggregates; verifies no remaining documents or active tasks, cascades tightly-coupled
 *    hearings/parties/events/expenses, unlinks financial payments, and purges case)
 * 5. Clients (Root entities; verifies no remaining cases, financial payments, documents, active tasks, or parties)
 * 6. Courts (Chamber registries; verifies no remaining cases, hearings, or active attachments)
 */
async function handleRecordsCleanup(req: NextRequest): Promise<NextResponse> {
  // 1. Authenticate with dedicated CRON_SECRET using constant-time verification
  const authCheck = validateCronSecret(req);
  if (!authCheck.isValid) {
    return authCheck.response;
  }

  // 2. Parse bounded batch limits from query parameters
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
  const lock = await acquireCronLock("records", 300);
  if (!lock.acquired) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Conflict: Another database records cleanup job is currently executing.",
        skipped: true,
      },
      { status: 409 }
    );
  }

  const counts: CronRecordsCleanupResponse["counts"] = {
    tasks: createEmptyCleanResult(),
    caseDocuments: createEmptyCleanResult(),
    clientDocuments: createEmptyCleanResult(),
    cases: createEmptyCleanResult(),
    clients: createEmptyCleanResult(),
    courts: createEmptyCleanResult(),
  };

  let hasMore = false;

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Purge Soft-Deleted Tasks (Leaf Entities)
    // -------------------------------------------------------------------------
    const eligibleTasks = await Task.find({
      deletedAt: { $ne: null, $lte: cutoffDate },
    })
      .limit(batchLimit + 1)
      .lean();

    if (eligibleTasks.length > batchLimit) {
      hasMore = true;
      eligibleTasks.pop();
    }

    counts.tasks.scanned = eligibleTasks.length;
    counts.tasks.eligible = eligibleTasks.length;

    for (const task of eligibleTasks) {
      try {
        await withTransaction(async (session) => {
          // Re-verify eligibility inside transaction to prevent racing concurrent restoration
          const deletedTask = await Task.findOneAndDelete(
            {
              _id: task._id,
              deletedAt: { $ne: null, $lte: cutoffDate },
            },
            { session }
          );

          if (!deletedTask) {
            counts.tasks.skipped++;
            return;
          }

          counts.tasks.deleted++;

          // Record permanent deletion audit log
          await recordAuditLog({
            req,
            action: AUDIT_ACTIONS.DELETE,
            entityType: AUDIT_ENTITY_TYPES.TASK,
            entityId: task._id,
            oldValues: { title: task.title, deletedAt: task.deletedAt },
            description: `Permanently purged soft-deleted task "${task.title}" (exceeded 1-month retention)`,
            session,
          });
        });
      } catch (taskErr) {
        counts.tasks.failed++;
        console.error(`[CRON CLEANUP] Failed to permanently delete task ${task._id}:`, taskErr);
      }
    }

    // -------------------------------------------------------------------------
    // Phase 2: Purge Soft-Deleted Case Documents (Leaf Entities)
    // -------------------------------------------------------------------------
    const eligibleCaseDocs = await CaseDocument.find({
      deletedAt: { $ne: null, $lte: cutoffDate },
    })
      .limit(batchLimit + 1)
      .lean();

    if (eligibleCaseDocs.length > batchLimit) {
      hasMore = true;
      eligibleCaseDocs.pop();
    }

    counts.caseDocuments.scanned = eligibleCaseDocs.length;
    counts.caseDocuments.eligible = eligibleCaseDocs.length;

    for (const doc of eligibleCaseDocs) {
      try {
        await withTransaction(async (session) => {
          const deletedDoc = await CaseDocument.findOneAndDelete(
            {
              _id: doc._id,
              deletedAt: { $ne: null, $lte: cutoffDate },
            },
            { session }
          );

          if (!deletedDoc) {
            counts.caseDocuments.skipped++;
            return;
          }

          counts.caseDocuments.deleted++;

          await recordAuditLog({
            req,
            action: AUDIT_ACTIONS.DELETE,
            entityType: AUDIT_ENTITY_TYPES.CASE_DOCUMENT,
            entityId: doc._id,
            oldValues: { title: doc.title, caseId: doc.caseId, deletedAt: doc.deletedAt },
            description: `Permanently purged soft-deleted case document "${doc.title}" (exceeded 1-month retention)`,
            session,
          });
        });
      } catch (docErr) {
        counts.caseDocuments.failed++;
        console.error(`[CRON CLEANUP] Failed to permanently delete CaseDocument ${doc._id}:`, docErr);
      }
    }

    // -------------------------------------------------------------------------
    // Phase 3: Purge Soft-Deleted Client Documents (Leaf Entities)
    // -------------------------------------------------------------------------
    const eligibleClientDocs = await ClientDocument.find({
      deletedAt: { $ne: null, $lte: cutoffDate },
    })
      .limit(batchLimit + 1)
      .lean();

    if (eligibleClientDocs.length > batchLimit) {
      hasMore = true;
      eligibleClientDocs.pop();
    }

    counts.clientDocuments.scanned = eligibleClientDocs.length;
    counts.clientDocuments.eligible = eligibleClientDocs.length;

    for (const doc of eligibleClientDocs) {
      try {
        await withTransaction(async (session) => {
          const deletedDoc = await ClientDocument.findOneAndDelete(
            {
              _id: doc._id,
              deletedAt: { $ne: null, $lte: cutoffDate },
            },
            { session }
          );

          if (!deletedDoc) {
            counts.clientDocuments.skipped++;
            return;
          }

          counts.clientDocuments.deleted++;

          await recordAuditLog({
            req,
            action: AUDIT_ACTIONS.DELETE,
            entityType: AUDIT_ENTITY_TYPES.CLIENT_DOCUMENT,
            entityId: doc._id,
            oldValues: { title: doc.title, clientId: doc.clientId, deletedAt: doc.deletedAt },
            description: `Permanently purged soft-deleted client document "${doc.title}" (exceeded 1-month retention)`,
            session,
          });
        });
      } catch (docErr) {
        counts.clientDocuments.failed++;
        console.error(`[CRON CLEANUP] Failed to permanently delete ClientDocument ${doc._id}:`, docErr);
      }
    }

    // -------------------------------------------------------------------------
    // Phase 4: Purge Soft-Deleted Cases (With Referential Integrity Guards)
    // -------------------------------------------------------------------------
    const candidateCases = await Case.find({
      deletedAt: { $ne: null, $lte: cutoffDate },
    })
      .limit(batchLimit + 1)
      .lean();

    if (candidateCases.length > batchLimit) {
      hasMore = true;
      candidateCases.pop();
    }

    counts.cases.scanned = candidateCases.length;

    for (const caseItem of candidateCases) {
      try {
        // Referential Integrity Check 1: Ensure no case documents remain (active or unpurged)
        const remainingDocs = await CaseDocument.countDocuments({
          caseId: caseItem._id,
        });

        if (remainingDocs > 0) {
          counts.cases.skipped++;
          continue;
        }

        // Referential Integrity Check 2: Ensure no active tasks reference this case
        const activeTasks = await Task.countDocuments({
          caseId: caseItem._id,
          deletedAt: null,
        });

        if (activeTasks > 0) {
          counts.cases.skipped++;
          continue;
        }

        counts.cases.eligible++;

        await withTransaction(async (session) => {
          // Double-check case is still eligible inside atomic transaction
          const caseToDelete = await Case.findOne({
            _id: caseItem._id,
            deletedAt: { $ne: null, $lte: cutoffDate },
          }).session(session);

          if (!caseToDelete) {
            counts.cases.skipped++;
            return;
          }

          // Cascade delete tightly coupled non-soft-deleted child records
          await Hearing.deleteMany({ caseId: caseItem._id }, { session });
          await CaseEvent.deleteMany({ caseId: caseItem._id }, { session });
          await CaseExpense.deleteMany({ caseId: caseItem._id }, { session });
          await CaseParty.deleteMany({ caseId: caseItem._id }, { session });

          // Decouple optional references in financial payments and tasks
          await ClientPayment.updateMany(
            { caseId: caseItem._id },
            { $set: { caseId: null } },
            { session }
          );
          await Task.updateMany(
            { caseId: caseItem._id },
            { $set: { caseId: null } },
            { session }
          );

          // Soft-delete any remaining asset references directly owned by this case
          await AssetReference.updateMany(
            {
              ownerType: ASSET_OWNER_TYPES.CASE,
              ownerId: caseItem._id,
              deletedAt: null,
            },
            { $set: { deletedAt: new Date() } },
            { session }
          );

          // Permanently purge case record
          await Case.deleteOne({ _id: caseItem._id }, { session });
          counts.cases.deleted++;

          await recordAuditLog({
            req,
            action: AUDIT_ACTIONS.DELETE,
            entityType: AUDIT_ENTITY_TYPES.CASE,
            entityId: caseItem._id,
            oldValues: {
              title: caseItem.title,
              internalReference: caseItem.internalReference,
              deletedAt: caseItem.deletedAt,
            },
            description: `Permanently purged archived case "${caseItem.title}" (${caseItem.internalReference}) and cascaded child records`,
            session,
          });
        });
      } catch (caseErr) {
        counts.cases.failed++;
        console.error(`[CRON CLEANUP] Failed to permanently delete Case ${caseItem._id}:`, caseErr);
      }
    }

    // -------------------------------------------------------------------------
    // Phase 5: Purge Soft-Deleted Clients (With Association Guards)
    // -------------------------------------------------------------------------
    const candidateClients = await Client.find({
      deletedAt: { $ne: null, $lte: cutoffDate },
    })
      .limit(batchLimit + 1)
      .lean();

    if (candidateClients.length > batchLimit) {
      hasMore = true;
      candidateClients.pop();
    }

    counts.clients.scanned = candidateClients.length;

    for (const clientItem of candidateClients) {
      try {
        // Association Guard: Check linked cases (active or archived), payments, docs, tasks, parties
        const [linkedCases, linkedPayments, linkedDocs, linkedTasks, linkedParties] =
          await Promise.all([
            Case.countDocuments({ clientId: clientItem._id }),
            ClientPayment.countDocuments({ clientId: clientItem._id }),
            ClientDocument.countDocuments({ clientId: clientItem._id }),
            Task.countDocuments({ clientId: clientItem._id, deletedAt: null }),
            CaseParty.countDocuments({ clientId: clientItem._id }),
          ]);

        if (
          linkedCases > 0 ||
          linkedPayments > 0 ||
          linkedDocs > 0 ||
          linkedTasks > 0 ||
          linkedParties > 0
        ) {
          counts.clients.skipped++;
          continue;
        }

        counts.clients.eligible++;

        await withTransaction(async (session) => {
          const clientToDelete = await Client.findOne({
            _id: clientItem._id,
            deletedAt: { $ne: null, $lte: cutoffDate },
          }).session(session);

          if (!clientToDelete) {
            counts.clients.skipped++;
            return;
          }

          // Soft-delete remaining asset references owned by this client
          await AssetReference.updateMany(
            {
              ownerType: ASSET_OWNER_TYPES.CLIENT,
              ownerId: clientItem._id,
              deletedAt: null,
            },
            { $set: { deletedAt: new Date() } },
            { session }
          );

          // Decouple soft-deleted task client references
          await Task.updateMany(
            { clientId: clientItem._id },
            { $set: { clientId: null } },
            { session }
          );

          // Permanently purge client record
          await Client.deleteOne({ _id: clientItem._id }, { session });
          counts.clients.deleted++;

          await recordAuditLog({
            req,
            action: AUDIT_ACTIONS.DELETE,
            entityType: AUDIT_ENTITY_TYPES.CLIENT,
            entityId: clientItem._id,
            oldValues: {
              name: clientItem.name,
              clientNumber: clientItem.clientNumber,
              deletedAt: clientItem.deletedAt,
            },
            description: `Permanently purged archived client "${clientItem.name}" (${clientItem.clientNumber})`,
            session,
          });
        });
      } catch (clientErr) {
        counts.clients.failed++;
        console.error(`[CRON CLEANUP] Failed to permanently delete Client ${clientItem._id}:`, clientErr);
      }
    }

    // -------------------------------------------------------------------------
    // Phase 6: Purge Soft-Deleted Courts (With Association Guards)
    // -------------------------------------------------------------------------
    const candidateCourts = await Court.find({
      deletedAt: { $ne: null, $lte: cutoffDate },
    })
      .limit(batchLimit + 1)
      .lean();

    if (candidateCourts.length > batchLimit) {
      hasMore = true;
      candidateCourts.pop();
    }

    counts.courts.scanned = candidateCourts.length;

    for (const courtItem of candidateCourts) {
      try {
        const [linkedCases, linkedHearings, linkedAssets] = await Promise.all([
          Case.countDocuments({ courtId: courtItem._id }),
          Hearing.countDocuments({ courtId: courtItem._id }),
          AssetReference.countDocuments({
            ownerType: ASSET_OWNER_TYPES.COURT,
            ownerId: courtItem._id,
            deletedAt: null,
          }),
        ]);

        if (linkedCases > 0 || linkedHearings > 0 || linkedAssets > 0) {
          counts.courts.skipped++;
          continue;
        }

        counts.courts.eligible++;

        await withTransaction(async (session) => {
          const courtToDelete = await Court.findOne({
            _id: courtItem._id,
            deletedAt: { $ne: null, $lte: cutoffDate },
          }).session(session);

          if (!courtToDelete) {
            counts.courts.skipped++;
            return;
          }

          await Court.deleteOne({ _id: courtItem._id }, { session });
          counts.courts.deleted++;

          await recordAuditLog({
            req,
            action: AUDIT_ACTIONS.DELETE,
            entityType: AUDIT_ENTITY_TYPES.COURT,
            entityId: courtItem._id,
            oldValues: {
              name: courtItem.name,
              courtType: courtItem.courtType,
              deletedAt: courtItem.deletedAt,
            },
            description: `Permanently purged archived court "${courtItem.name}"`,
            session,
          });
        });
      } catch (courtErr) {
        counts.courts.failed++;
        console.error(`[CRON CLEANUP] Failed to permanently delete Court ${courtItem._id}:`, courtErr);
      }
    }

    const totalScanned =
      counts.tasks.scanned +
      counts.caseDocuments.scanned +
      counts.clientDocuments.scanned +
      counts.cases.scanned +
      counts.clients.scanned +
      counts.courts.scanned;

    const totalEligible =
      counts.tasks.eligible +
      counts.caseDocuments.eligible +
      counts.clientDocuments.eligible +
      counts.cases.eligible +
      counts.clients.eligible +
      counts.courts.eligible;

    const totalDeleted =
      counts.tasks.deleted +
      counts.caseDocuments.deleted +
      counts.clientDocuments.deleted +
      counts.cases.deleted +
      counts.clients.deleted +
      counts.courts.deleted;

    const totalSkipped =
      counts.tasks.skipped +
      counts.caseDocuments.skipped +
      counts.clientDocuments.skipped +
      counts.cases.skipped +
      counts.clients.skipped +
      counts.courts.skipped;

    const totalFailed =
      counts.tasks.failed +
      counts.caseDocuments.failed +
      counts.clientDocuments.failed +
      counts.cases.failed +
      counts.clients.failed +
      counts.courts.failed;

    const responsePayload: CronRecordsCleanupResponse = {
      success: totalFailed === 0,
      job: "cleanup-soft-deleted-records",
      retentionCutoff: cutoffDate.toISOString(),
      processedAt: now.toISOString(),
      batchLimit,
      counts,
      totalScanned,
      totalEligible,
      totalDeleted,
      totalSkipped,
      totalFailed,
      hasMore,
      message: `Database records cleanup completed. ${totalDeleted} permanently deleted, ${totalSkipped} skipped due to dependencies/restoration, ${totalFailed} failed.`,
    };

    return NextResponse.json(responsePayload, {
      status: totalFailed > 0 && totalDeleted === 0 ? 500 : 200,
    });
  } finally {
    await lock.release();
  }
}

/**
 * GET /api/cron/records
 * External scheduler trigger (e.g. Vercel Cron, Google Cloud Scheduler).
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  return handleRecordsCleanup(req);
});

/**
 * POST /api/cron/records
 * External webhook/scheduler trigger (e.g. GitHub Actions, QStash, AWS EventBridge).
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  return handleRecordsCleanup(req);
});
