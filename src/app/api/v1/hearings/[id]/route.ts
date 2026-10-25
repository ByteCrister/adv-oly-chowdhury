import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { Hearing } from "@/db/models/Hearing.model";
import { Case } from "@/db/models/Case.model";
import { Court } from "@/db/models/Court.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import { updateHearingSchema } from "@/utils/zod/hearing.validation";
import { formatHearingListItem, syncCaseNextHearingDate, extractIdString } from "../route";
import type {
  HearingDetailDto,
  HearingActionResponse,
  HearingDeleteResponse,
  IPopulatedHearingDoc,
} from "@/types/hearing.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Fetch and construct the HearingDetailDto for a hearing record with parallelized lookups.
 */
async function buildHearingDetailDto(
  hearingId: mongoose.Types.ObjectId,
  dbSession?: mongoose.ClientSession
): Promise<HearingDetailDto> {
  const query = Hearing.findById(hearingId)
    .select(
      "_id caseId courtId hearingDate startTime hearingType purpose outcome nextDate status adjournmentReason notes createdAt updatedAt"
    )
    .populate({
      path: "caseId",
      select:
        "_id internalReference caseNumber title caseType caseStatus priority courtId clientId filingDate nextHearingDate",
      populate: [
        {
          path: "clientId",
          select: "_id name clientNumber organizationName clientType phone email",
        },
        {
          path: "courtId",
          select: "_id name courtType district roomOrHall address presidingJudgeTitle",
        },
      ],
    })
    .populate({
      path: "courtId",
      select: "_id name courtType district roomOrHall address presidingJudgeTitle",
    });

  if (dbSession) {
    query.session(dbSession);
  }

  const assetQuery = AssetReference.countDocuments({
    ownerType: ASSET_OWNER_TYPES.HEARING,
    ownerId: hearingId,
    deletedAt: null,
  });
  if (dbSession) {
    assetQuery.session(dbSession);
  }

  // Execute hearing detail fetch and document reference count in parallel
  const [hearing, documentsCount] = await Promise.all([
    query.lean(),
    assetQuery,
  ]);

  if (!hearing) {
    throw ApiError.notFound("Hearing record not found or has been removed.");
  }

  // Fallback court lookup only if courtId was not set and not resolved via case
  let fallbackCourtsMap: Map<string, Record<string, unknown>> | undefined;
  const rawCaseObj = hearing.caseId as unknown as Record<string, unknown> | null;
  if (!hearing.courtId && rawCaseObj && typeof rawCaseObj === "object" && rawCaseObj.courtId) {
    const cId = rawCaseObj.courtId;
    if (typeof cId === "string" || cId instanceof mongoose.Types.ObjectId) {
      const courtDoc = await Court.findById(cId)
        .select("_id name courtType district roomOrHall address presidingJudgeTitle")
        .lean();
      if (courtDoc) {
        fallbackCourtsMap = new Map([
          [(courtDoc._id as mongoose.Types.ObjectId).toString(), courtDoc as unknown as Record<string, unknown>],
        ]);
      }
    }
  }

  const formattedItem = formatHearingListItem(
    hearing as unknown as IPopulatedHearingDoc,
    fallbackCourtsMap,
    documentsCount === 0
  );

  return {
    ...formattedItem,
    documentsCount,
    isDeletable: documentsCount === 0,
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
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid hearing ID format");
    }

    const body = await req.json();
    const validated = updateHearingSchema.parse(body);

    const objectId = new mongoose.Types.ObjectId(id);

    // Execute update inside a single ACID transaction without redundant pre-fetching
    await withTransaction(async (dbSession) => {
      const hearing = await Hearing.findById(objectId)
        .select(
          "_id caseId courtId hearingDate startTime hearingType purpose outcome nextDate status adjournmentReason notes"
        )
        .session(dbSession);
      if (!hearing) {
        throw ApiError.notFound("Hearing record not found or has been removed.");
      }

      const beforeState = {
        caseId: hearing.caseId,
        courtId: hearing.courtId,
        hearingDate: hearing.hearingDate,
        startTime: hearing.startTime,
        hearingType: hearing.hearingType,
        purpose: hearing.purpose,
        outcome: hearing.outcome,
        nextDate: hearing.nextDate,
        status: hearing.status,
        adjournmentReason: hearing.adjournmentReason,
        notes: hearing.notes,
      };
      let targetCaseId = hearing.caseId;
      const oldCaseId = hearing.caseId;

      // Verify Case if caseId is changing
      if (validated.caseId && validated.caseId !== hearing.caseId.toString()) {
        const targetCaseExists = await Case.exists({
          _id: new mongoose.Types.ObjectId(validated.caseId),
          deletedAt: null,
        }).session(dbSession);

        if (!targetCaseExists) {
          throw ApiError.notFound(`Case with ID "${validated.caseId}" not found or has been removed.`);
        }
        targetCaseId = new mongoose.Types.ObjectId(validated.caseId);
      }

      // Verify Court if courtId is explicitly provided
      let targetCourtId = hearing.courtId;
      if (validated.courtId !== undefined) {
        if (validated.courtId) {
          const targetCourtExists = await Court.exists({
            _id: new mongoose.Types.ObjectId(validated.courtId),
            deletedAt: null,
          }).session(dbSession);

          if (!targetCourtExists) {
            throw ApiError.notFound(`Court with ID "${validated.courtId}" not found or has been removed.`);
          }
          targetCourtId = new mongoose.Types.ObjectId(validated.courtId);
        } else {
          targetCourtId = null;
        }
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

      // Record audit log for hearing update with clean sanitized state
      const afterState = {
        caseId: hearing.caseId,
        courtId: hearing.courtId,
        hearingDate: hearing.hearingDate,
        startTime: hearing.startTime,
        hearingType: hearing.hearingType,
        purpose: hearing.purpose,
        outcome: hearing.outcome,
        nextDate: hearing.nextDate,
        status: hearing.status,
        adjournmentReason: hearing.adjournmentReason,
        notes: hearing.notes,
      };
      const diff = calculateAuditDiff(beforeState, afterState);
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: AUDIT_ENTITY_TYPES.HEARING,
        entityId: hearing._id,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        description: `Updated hearing scheduled for ${hearing.hearingDate.toISOString()}`,
        session: dbSession,
      });
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
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid hearing ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);

    // Concurrently fetch the target hearing and check attached document references
    const [hearing, attachedFilesCount] = await Promise.all([
      Hearing.findById(objectId).select(
        "_id caseId courtId hearingDate startTime hearingType purpose outcome nextDate status adjournmentReason notes"
      ),
      AssetReference.countDocuments({
        ownerType: ASSET_OWNER_TYPES.HEARING,
        ownerId: objectId,
        deletedAt: null,
      }),
    ]);

    if (!hearing) {
      throw ApiError.notFound("Hearing record not found or already deleted.");
    }

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
      const hearingSnapshot = {
        caseId: hearing.caseId,
        courtId: hearing.courtId,
        hearingDate: hearing.hearingDate,
        startTime: hearing.startTime,
        hearingType: hearing.hearingType,
        purpose: hearing.purpose,
        outcome: hearing.outcome,
        nextDate: hearing.nextDate,
        status: hearing.status,
        adjournmentReason: hearing.adjournmentReason,
        notes: hearing.notes,
      };

      await Hearing.findByIdAndDelete(objectId).session(dbSession);

      // Recalculate case's next hearing date
      await syncCaseNextHearingDate(caseId, dbSession);

      // Record audit log for hearing hard deletion
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.DELETE,
        entityType: AUDIT_ENTITY_TYPES.HEARING,
        entityId: hearing._id,
        oldValues: hearingSnapshot,
        newValues: null,
        description: `Deleted hearing record for case ${extractIdString(caseId)}`,
        session: dbSession,
      });
    });

    const response: HearingDeleteResponse = {
      success: true,
      message: "Hearing deleted successfully and case schedule updated.",
      id,
    };

    return NextResponse.json(response);
  }
);
