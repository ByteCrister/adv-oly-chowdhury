import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { Court } from "@/db/models/Court.model";
import { Case } from "@/db/models/Case.model";
import { Hearing } from "@/db/models/Hearing.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { COURT_TYPE_LABELS, CourtType } from "@/const/court.const";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import { updateCourtSchema } from "@/utils/zod/court.validation";
import type {
  CourtListItemDto,
  CourtActionResponse,
  CourtDeleteResponse,
} from "@/types/court.types";
import type { ICourtDocument } from "@/types/db/court.type";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Helper to format a Court document into CourtListItemDto.
 */
function formatCourtItem(
  court: ICourtDocument | Record<string, unknown>,
  counts?: { cases?: number; hearings?: number; assets?: number }
): CourtListItemDto {
  const cType = court.courtType as CourtType;
  const cases = counts?.cases ?? 0;
  const hearings = counts?.hearings ?? 0;
  const assets = counts?.assets ?? 0;

  return {
    id: (court._id as mongoose.Types.ObjectId).toString(),
    name: court.name as string,
    courtType: cType,
    courtTypeLabel: COURT_TYPE_LABELS[cType] || (court.courtType as string),
    district: court.district as string,
    division: (court.division as string) || null,
    roomOrHall: (court.roomOrHall as string) || null,
    address: (court.address as string) || null,
    presidingJudgeTitle: (court.presidingJudgeTitle as string) || null,
    isActive: Boolean(court.isActive),
    totalCases: cases,
    totalHearings: hearings,
    totalAssets: assets,
    isDeletable: cases === 0 && hearings === 0 && assets === 0,
    createdAt: court.createdAt ? new Date(court.createdAt as Date).toISOString() : "",
    updatedAt: court.updatedAt ? new Date(court.updatedAt as Date).toISOString() : "",
  };
}

/**
 * PATCH /api/v1/courts/[id]
 *
 * Update an existing court record using a transaction.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid court ID format");
    }

    const body = await req.json();
    const validated = updateCourtSchema.parse(body);

    const objectId = new mongoose.Types.ObjectId(id);

    // If name or district is updated, check for duplicate conflict with other courts
    if (validated.name || validated.district) {
      const existingRecord = await Court.findOne({
        _id: objectId,
        deletedAt: null,
      }).lean();
      if (!existingRecord) {
        throw ApiError.notFound("Court not found");
      }

      const targetName = (validated.name ?? existingRecord.name).trim();
      const targetDistrict = (validated.district ?? existingRecord.district).trim();

      const duplicate = await Court.findOne({
        _id: { $ne: objectId },
        deletedAt: null,
        name: { $regex: new RegExp(`^${targetName}$`, "i") },
        district: { $regex: new RegExp(`^${targetDistrict}$`, "i") },
      });

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
      }).session(dbSession);
      if (!court) {
        throw ApiError.notFound("Court not found");
      }

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
      return court;
    });

    // Compute relation counts for response DTO
    const [casesCount, hearingsCount, assetsCount] = await Promise.all([
      Case.countDocuments({ courtId: objectId, deletedAt: null }),
      Hearing.countDocuments({ courtId: objectId }),
      AssetReference.countDocuments({
        ownerType: ASSET_OWNER_TYPES.COURT,
        ownerId: objectId,
        deletedAt: null,
      }),
    ]);

    const dto = formatCourtItem(updatedCourt, {
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
 * and AssetReferences before moving to trash.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid court ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const court = await Court.findOne({
      _id: objectId,
      deletedAt: null,
    });
    if (!court) {
      throw ApiError.notFound("Court not found or already deleted");
    }

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

    // Perform soft delete
    court.deletedAt = new Date();
    court.isActive = false;
    await court.save();

    const response: CourtDeleteResponse = {
      success: true,
      message: `Court "${court.name}" was moved to trash successfully.`,
      id,
    };

    return NextResponse.json(response);
  }
);
