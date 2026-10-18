import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import ConnectDB from "@/db";
import { Hearing } from "@/db/models/Hearing.model";
import { Case } from "@/db/models/Case.model";
import { Court } from "@/db/models/Court.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import { updateHearingSchema } from "@/utils/zod/hearing.validation";
import { formatHearingListItem, syncCaseNextHearingDate } from "../route";
import type {
  HearingDetailDto,
  HearingActionResponse,
  HearingDeleteResponse,
} from "@/types/hearing.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Fetch and construct the HearingDetailDto for a hearing record.
 */
async function buildHearingDetailDto(
  hearingId: mongoose.Types.ObjectId,
  dbSession?: mongoose.ClientSession
): Promise<HearingDetailDto> {
  const query = Hearing.findById(hearingId)
    .populate({
      path: "caseId",
      select:
        "internalReference caseNumber title caseType caseStatus priority courtId clientId filingDate nextHearingDate",
      populate: {
        path: "clientId",
        select: "name clientNumber organizationName clientType phone email",
      },
    })
    .populate({
      path: "courtId",
      select: "name courtType district roomOrHall address presidingJudgeTitle",
    });

  if (dbSession) {
    query.session(dbSession);
  }

  const hearing = await query.lean();
  if (!hearing) {
    throw ApiError.notFound("Hearing record not found or has been removed.");
  }

  // Fallback court lookup if courtId was not set on hearing
  let fallbackCourtsMap: Map<string, Record<string, unknown>> | undefined;
  const rawCaseObj = hearing.caseId as unknown as Record<string, unknown> | null;
  if (!hearing.courtId && rawCaseObj && typeof rawCaseObj === "object" && rawCaseObj.courtId) {
    const cId = rawCaseObj.courtId;
    if (typeof cId === "string" || cId instanceof mongoose.Types.ObjectId) {
      const courtDoc = await Court.findById(cId).lean();
      if (courtDoc) {
        fallbackCourtsMap = new Map([
          [(courtDoc._id as mongoose.Types.ObjectId).toString(), courtDoc as unknown as Record<string, unknown>],
        ]);
      }
    }
  }

  // Count attached documents in AssetReference
  const documentsCount = await AssetReference.countDocuments({
    ownerType: ASSET_OWNER_TYPES.HEARING,
    ownerId: hearingId,
    deletedAt: null,
  });

  const formattedItem = formatHearingListItem(
    hearing as unknown as Record<string, unknown>,
    fallbackCourtsMap
  );

  return {
    ...formattedItem,
    documentsCount,
  };
}

/**
 * GET /api/v1/hearings/[id]
 *
 * Retrieve full details of a specific hearing by its ObjectId.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid hearing ID format");
    }

    await ConnectDB();

    const objectId = new mongoose.Types.ObjectId(id);
    const detailDto = await buildHearingDetailDto(objectId);

    const response: HearingActionResponse = {
      success: true,
      message: "Hearing details retrieved successfully.",
      data: detailDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PATCH /api/v1/hearings/[id]
 *
 * Update hearing details inside a database transaction and synchronize nextHearingDate.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid hearing ID format");
    }

    const body = await req.json();
    const validated = updateHearingSchema.parse(body);

    await ConnectDB();

    const objectId = new mongoose.Types.ObjectId(id);
    const existingHearing = await Hearing.findById(objectId);

    if (!existingHearing) {
      throw ApiError.notFound("Hearing record not found or has been removed.");
    }

    // Verify Case if caseId is changing
    let targetCaseId = existingHearing.caseId;
    const oldCaseId = existingHearing.caseId;
    if (validated.caseId && validated.caseId !== existingHearing.caseId.toString()) {
      const targetCase = await Case.findOne({
        _id: new mongoose.Types.ObjectId(validated.caseId),
        deletedAt: null,
      });
      if (!targetCase) {
        throw ApiError.notFound(`Case with ID "${validated.caseId}" not found.`);
      }
      targetCaseId = targetCase._id;
    }

    // Verify Court if courtId is explicitly provided
    let targetCourtId = existingHearing.courtId;
    if (validated.courtId !== undefined) {
      if (validated.courtId) {
        const targetCourt = await Court.findOne({
          _id: new mongoose.Types.ObjectId(validated.courtId),
          deletedAt: null,
        });
        if (!targetCourt) {
          throw ApiError.notFound(`Court with ID "${validated.courtId}" not found.`);
        }
        targetCourtId = targetCourt._id;
      } else {
        targetCourtId = null;
      }
    }

    // Execute update inside a transaction
    await withTransaction(async (dbSession) => {
      const hearing = await Hearing.findById(objectId).session(dbSession);
      if (!hearing) {
        throw ApiError.notFound("Hearing record not found.");
      }

      if (validated.caseId !== undefined) {
        hearing.caseId = targetCaseId;
      }
      if (validated.courtId !== undefined) {
        hearing.courtId = targetCourtId;
      }
      if (validated.hearingDate !== undefined) {
        hearing.hearingDate = new Date(validated.hearingDate);
      }
      if (validated.startTime !== undefined) {
        hearing.startTime = validated.startTime?.trim() || null;
      }
      if (validated.hearingType !== undefined) {
        hearing.hearingType = validated.hearingType?.trim() || null;
      }
      if (validated.purpose !== undefined) {
        hearing.purpose = validated.purpose?.trim() || null;
      }
      if (validated.outcome !== undefined) {
        hearing.outcome = validated.outcome?.trim() || null;
      }
      if (validated.nextDate !== undefined) {
        hearing.nextDate = validated.nextDate ? new Date(validated.nextDate) : null;
      }
      if (validated.status !== undefined) {
        hearing.status = validated.status;
      }
      if (validated.adjournmentReason !== undefined) {
        hearing.adjournmentReason = validated.adjournmentReason?.trim() || null;
      }
      if (validated.notes !== undefined) {
        hearing.notes = validated.notes?.trim() || null;
      }

      await hearing.save({ session: dbSession });

      // Synchronize nextHearingDate on affected case(s)
      await syncCaseNextHearingDate(targetCaseId, dbSession);
      if (oldCaseId.toString() !== targetCaseId.toString()) {
        await syncCaseNextHearingDate(oldCaseId, dbSession);
      }
    });

    const updatedDto = await buildHearingDetailDto(objectId);

    const response: HearingActionResponse = {
      success: true,
      message: "Hearing updated successfully.",
      data: updatedDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PUT /api/v1/hearings/[id]
 *
 * Alias for PATCH handler.
 */
export const PUT = PATCH;

/**
 * DELETE /api/v1/hearings/[id]
 *
 * Delete a hearing record with relational integrity checks and sync the case's nextHearingDate.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid hearing ID format");
    }

    await ConnectDB();

    const objectId = new mongoose.Types.ObjectId(id);
    const hearing = await Hearing.findById(objectId);

    if (!hearing) {
      throw ApiError.notFound("Hearing record not found or already deleted.");
    }

    // Association guard: check if hearing has attached files in AssetReference
    const attachedFilesCount = await AssetReference.countDocuments({
      ownerType: ASSET_OWNER_TYPES.HEARING,
      ownerId: objectId,
      deletedAt: null,
    });

    if (attachedFilesCount > 0) {
      throw ApiError.conflict(
        `Cannot delete hearing. There are ${attachedFilesCount} attached document(s) or order sheet(s) linked to this hearing. Please remove or reassign those files first.`,
        {
          hearingId: id,
          attachedFilesCount,
        }
      );
    }

    const caseId = hearing.caseId;

    // Execute deletion inside a transaction
    await withTransaction(async (dbSession) => {
      await Hearing.findByIdAndDelete(objectId).session(dbSession);

      // Recalculate case's next hearing date
      await syncCaseNextHearingDate(caseId, dbSession);
    });

    const response: HearingDeleteResponse = {
      success: true,
      message: "Hearing deleted successfully and case schedule updated.",
      id,
    };

    return NextResponse.json(response);
  }
);
