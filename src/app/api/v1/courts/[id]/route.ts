import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { escapeRegex } from "@/lib/helpers/search.helper";
import { Court } from "@/db/models/Court.model";
import { Case } from "@/db/models/Case.model";
import { Hearing } from "@/db/models/Hearing.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import { updateCourtSchema, courtIdParamSchema } from "@/utils/zod/court.validation";
import { formatCourtItem } from "../route";
import type {
  CourtActionResponse,
  CourtDeleteResponse,
} from "@/types/court.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Validates and extracts a valid MongoDB ObjectId from the route params.
 */
async function getValidatedCourtId(params: Promise<{ id: string }>): Promise<{ id: string; objectId: mongoose.Types.ObjectId }> {
  const resolved = await params;
  const parsed = courtIdParamSchema.safeParse(resolved);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid court ID format");
  }
  return {
    id: parsed.data.id,
    objectId: new mongoose.Types.ObjectId(parsed.data.id),
  };
}

/**
 * GET /api/v1/courts/[id]
 *
 * Retrieve full details of a specific court by its ObjectId, including
 * live associated case, hearing, and asset reference counts.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { objectId } = await getValidatedCourtId(params);

    const court = await Court.findOne({
      _id: objectId,
      deletedAt: null,
    })
      .select(
        "_id name courtType district division roomOrHall address presidingJudgeTitle isActive createdAt updatedAt"
      )
      .lean();

    if (!court) {
      throw ApiError.notFound("Court not found or has already been removed");
    }

    // Compute relation counts for response DTO in parallel
    const [casesCount, hearingsCount, assetsCount] = await Promise.all([
      Case.countDocuments({ courtId: objectId, deletedAt: null }),
      Hearing.countDocuments({ courtId: objectId }),
      AssetReference.countDocuments({
        ownerType: ASSET_OWNER_TYPES.COURT,
        ownerId: objectId,
        deletedAt: null,
      }),
    ]);

    const dto = formatCourtItem(court, {
      cases: casesCount,
      hearings: hearingsCount,
      assets: assetsCount,
    });

    const response: CourtActionResponse = {
      success: true,
      message: "Court details retrieved successfully.",
      data: dto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PATCH /api/v1/courts/[id]
 *
 * Update an existing court record using a transaction with full audit logging and conflict guards.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { objectId } = await getValidatedCourtId(params);

    const body = await req.json().catch(() => ({}));
    const validated = updateCourtSchema.parse(body);

    // If name or district is updated, check for duplicate conflict with other courts
    if (validated.name || validated.district) {
      const existingRecord = await Court.findOne({
        _id: objectId,
        deletedAt: null,
      })
        .select("name district")
        .lean();

      if (!existingRecord) {
        throw ApiError.notFound("Court not found");
      }

      const targetName = (validated.name ?? existingRecord.name).trim();
      const targetDistrict = (validated.district ?? existingRecord.district).trim();

      const duplicate = await Court.findOne({
        _id: { $ne: objectId },
        deletedAt: null,
        name: { $regex: new RegExp(`^${escapeRegex(targetName)}$`, "i") },
        district: { $regex: new RegExp(`^${escapeRegex(targetDistrict)}$`, "i") },
      })
        .select("_id")
        .lean();

      if (duplicate) {
        throw ApiError.conflict(
          `Another court named "${targetName}" already exists in ${targetDistrict} district.`
        );
      }
    }

    // Execute update inside a transaction
    const updatedCourt = await withTransaction(async (dbSession) => {
      const court = await Court.findOne({
        _id: objectId,
        deletedAt: null,
      })
        .select(
          "_id name courtType district division roomOrHall address presidingJudgeTitle isActive deletedAt createdAt updatedAt"
        )
        .session(dbSession);

      if (!court) {
        throw ApiError.notFound("Court not found");
      }

      const beforeState = court.toObject();

      if (validated.name !== undefined) court.name = validated.name.trim();
      if (validated.courtType !== undefined) court.courtType = validated.courtType;
      if (validated.district !== undefined) court.district = validated.district.trim();
      if (validated.division !== undefined) court.division = validated.division?.trim() || null;
      if (validated.roomOrHall !== undefined)
        court.roomOrHall = validated.roomOrHall?.trim() || null;
      if (validated.address !== undefined) court.address = validated.address?.trim() || null;
      if (validated.presidingJudgeTitle !== undefined)
        court.presidingJudgeTitle = validated.presidingJudgeTitle?.trim() || null;
      if (validated.isActive !== undefined) court.isActive = validated.isActive;

      await court.save({ session: dbSession });

      // Record audit log for court update if any tracked fields changed
      const diff = calculateAuditDiff(beforeState, court.toObject());
      if (diff.oldValues !== null || diff.newValues !== null) {
        await recordAuditLog({
          req,
          userId,
          action: AUDIT_ACTIONS.UPDATE,
          entityType: AUDIT_ENTITY_TYPES.COURT,
          entityId: court._id,
          oldValues: diff.oldValues,
          newValues: diff.newValues,
          description: `Updated court "${court.name}"`,
          session: dbSession,
        });
      }

      return court;
    });

    // Compute relation counts for response DTO in parallel
    const [casesCount, hearingsCount, assetsCount] = await Promise.all([
      Case.countDocuments({ courtId: objectId, deletedAt: null }),
      Hearing.countDocuments({ courtId: objectId }),
      AssetReference.countDocuments({
        ownerType: ASSET_OWNER_TYPES.COURT,
        ownerId: objectId,
        deletedAt: null,
      }),
    ]);

    const dto = formatCourtItem(updatedCourt.toObject(), {
      cases: casesCount,
      hearings: hearingsCount,
      assets: assetsCount,
    });

    const response: CourtActionResponse = {
      success: true,
      message: `Court "${updatedCourt.name}" updated successfully.`,
      data: dto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PUT /api/v1/courts/[id]
 *
 * Alias to PATCH handler for full/partial update flexibility.
 */
export const PUT = PATCH;

/**
 * DELETE /api/v1/courts/[id]
 *
 * Safely soft-deletes a court record (sets deletedAt timestamp and marks inactive).
 * Enforces reference integrity by checking for linked active Cases, Hearings,
 * and AssetReferences before moving to trash. Uses transaction for atomic soft-deletion and audit logging.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id, objectId } = await getValidatedCourtId(params);

    const court = await Court.findOne({
      _id: objectId,
      deletedAt: null,
    }).select(
      "_id name courtType district division roomOrHall address presidingJudgeTitle isActive deletedAt createdAt updatedAt"
    );

    if (!court) {
      throw ApiError.notFound("Court not found or already deleted");
    }

    const beforeState = court.toObject();

    // Association guard: check if court is referenced anywhere
    const [caseCount, hearingCount, assetCount] = await Promise.all([
      Case.countDocuments({ courtId: objectId, deletedAt: null }),
      Hearing.countDocuments({ courtId: objectId }),
      AssetReference.countDocuments({
        ownerType: ASSET_OWNER_TYPES.COURT,
        ownerId: objectId,
        deletedAt: null,
      }),
    ]);

    if (caseCount > 0 || hearingCount > 0 || assetCount > 0) {
      const reasons: string[] = [];
      if (caseCount > 0) {
        reasons.push(`${caseCount} active case${caseCount > 1 ? "s" : ""}`);
      }
      if (hearingCount > 0) {
        reasons.push(`${hearingCount} scheduled hearing${hearingCount > 1 ? "s" : ""}`);
      }
      if (assetCount > 0) {
        reasons.push(`${assetCount} attached file${assetCount > 1 ? "s" : ""}`);
      }

      throw ApiError.conflict(
        `Cannot delete court "${court.name}". It is currently referenced by ${reasons.join(", ")}. Please reassign or delete these related records before removing the court.`,
        {
          courtId: id,
          courtName: court.name,
          associations: {
            cases: caseCount,
            hearings: hearingCount,
            assets: assetCount,
          },
        }
      );
    }

    // Perform atomic soft deletion and audit logging inside transaction
    await withTransaction(async (dbSession) => {
      court.deletedAt = new Date();
      court.isActive = false;
      await court.save({ session: dbSession });

      // Record audit log for court soft deletion
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.SOFT_DELETE,
        entityType: AUDIT_ENTITY_TYPES.COURT,
        entityId: court._id,
        oldValues: { deletedAt: null, isActive: beforeState.isActive },
        newValues: { deletedAt: court.deletedAt, isActive: false },
        description: `Archived court "${court.name}"`,
        session: dbSession,
      });
    });

    const response: CourtDeleteResponse = {
      success: true,
      message: `Court "${court.name}" was moved to trash successfully.`,
      id,
    };

    return NextResponse.json(response);
  }
);
