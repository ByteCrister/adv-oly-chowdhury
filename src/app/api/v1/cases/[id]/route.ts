import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import ConnectDB from "@/db";
import { Case } from "@/db/models/Case.model";
import { Client } from "@/db/models/Client.model";
import { Court } from "@/db/models/Court.model";
import { Hearing } from "@/db/models/Hearing.model";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { CaseEvent } from "@/db/models/CaseEvent.model";
import { CaseParty } from "@/db/models/CaseParty.model";
import { CASE_STATUSES } from "@/const/case.const";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import { updateCaseSchema } from "@/utils/zod/case.validation";
import { formatCaseListItem } from "../route";
import type {
  CaseDetailDto,
  CaseActionResponse,
  CaseDeleteResponse,
} from "@/types/case.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/cases/[id]
 *
 * Retrieve single case details with populated client, court, and relation counts.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case ID format");
    }

    await ConnectDB();

    const caseObjectId = new mongoose.Types.ObjectId(id);

    const [caseDoc, hearingsCount, documentsCount, eventsCount, partiesCount] =
      await Promise.all([
        Case.findOne({ _id: caseObjectId, deletedAt: null })
          .populate("clientId", "name clientNumber organizationName clientType phone email")
          .populate("courtId", "name courtType district roomOrHall presidingJudgeTitle")
          .lean(),
        Hearing.countDocuments({ caseId: caseObjectId }),
        CaseDocument.countDocuments({ caseId: caseObjectId, deletedAt: null }),
        CaseEvent.countDocuments({ caseId: caseObjectId }),
        CaseParty.countDocuments({ caseId: caseObjectId }),
      ]);

    if (!caseDoc) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    const counts = {
      hearings: hearingsCount,
      documents: documentsCount,
      events: eventsCount,
      parties: partiesCount,
    };

    const listItem = formatCaseListItem(caseDoc, counts);
    const detailDto: CaseDetailDto = {
      ...listItem,
      counts,
    };

    const response: CaseActionResponse = {
      success: true,
      message: "Case details retrieved successfully.",
      data: detailDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PATCH /api/v1/cases/[id]
 *
 * Update case metadata, status, priority, or relational assignments.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case ID format");
    }

    const body = await req.json();
    const validated = updateCaseSchema.parse(body);

    await ConnectDB();

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const caseDoc = await Case.findOne({ _id: caseObjectId, deletedAt: null });

    if (!caseDoc) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    const beforeState = caseDoc.toObject();

    // If internalReference is modified, ensure uniqueness
    if (
      validated.internalReference &&
      validated.internalReference.trim().toUpperCase() !== caseDoc.internalReference
    ) {
      const newRef = validated.internalReference.trim().toUpperCase();
      const existingRef = await Case.exists({
        _id: { $ne: caseObjectId },
        internalReference: newRef,
      });
      if (existingRef) {
        throw ApiError.badRequest(
          `A case with internal reference "${newRef}" already exists. Please choose a unique reference.`
        );
      }
      caseDoc.internalReference = newRef;
    }

    // Validate updated client reference if provided
    if (validated.clientId) {
      const clientObjectId = new mongoose.Types.ObjectId(validated.clientId);
      const clientExists = await Client.exists({ _id: clientObjectId, deletedAt: null });
      if (!clientExists) {
        throw ApiError.badRequest("Selected client does not exist or has been archived.");
      }
      caseDoc.clientId = clientObjectId;
    }

    // Validate updated court reference if provided
    if (validated.courtId) {
      const courtObjectId = new mongoose.Types.ObjectId(validated.courtId);
      const courtExists = await Court.exists({ _id: courtObjectId, deletedAt: null });
      if (!courtExists) {
        throw ApiError.badRequest("Selected court does not exist or has been archived.");
      }
      caseDoc.courtId = courtObjectId;
    }

    // Apply metadata updates
    if (validated.title !== undefined) caseDoc.title = validated.title.trim();
    if (validated.caseNumber !== undefined) caseDoc.caseNumber = validated.caseNumber?.trim() || null;
    if (validated.filingYear !== undefined) caseDoc.filingYear = validated.filingYear ?? null;
    if (validated.caseType !== undefined) caseDoc.caseType = validated.caseType;
    if (validated.caseCategory !== undefined) caseDoc.caseCategory = validated.caseCategory?.trim() || null;
    if (validated.filingDate !== undefined) {
      caseDoc.filingDate = validated.filingDate ? new Date(validated.filingDate) : null;
    }
    if (validated.priority !== undefined) caseDoc.priority = validated.priority;
    if (validated.description !== undefined) caseDoc.description = validated.description?.trim() || null;
    if (validated.legalIssues !== undefined) caseDoc.legalIssues = validated.legalIssues?.trim() || null;
    if (validated.opposingCounsel !== undefined) caseDoc.opposingCounsel = validated.opposingCounsel?.trim() || null;
    if (validated.opposingParties !== undefined) caseDoc.opposingParties = validated.opposingParties;

    // Handle status transitions
    if (validated.caseStatus !== undefined) {
      caseDoc.caseStatus = validated.caseStatus;

      // If transitioning to closed or disposed
      if (
        validated.caseStatus === CASE_STATUSES.CLOSED ||
        validated.caseStatus === CASE_STATUSES.DISPOSED
      ) {
        if (!caseDoc.closedAt && !validated.closedAt) {
          caseDoc.closedAt = new Date();
        }
      } else if (caseDoc.closedAt && validated.closedAt === undefined) {
        // If reopening the case and no explicit closedAt was supplied, clear closure timestamp
        caseDoc.closedAt = null;
        caseDoc.closureReason = null;
      }
    }


    if (validated.closedAt !== undefined) {
      caseDoc.closedAt = validated.closedAt ? new Date(validated.closedAt) : null;
    }

    if (validated.closureReason !== undefined) {
      caseDoc.closureReason = validated.closureReason?.trim() || null;
    }

    const diff = calculateAuditDiff(beforeState, caseDoc.toObject());

    await withTransaction(async (dbSession) => {
      await caseDoc.save({ session: dbSession });

      // Record audit log for case update
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: AUDIT_ENTITY_TYPES.CASE,
        entityId: caseDoc._id,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        description: `Updated case "${caseDoc.title}" (${caseDoc.internalReference})`,
        session: dbSession,
      });
    });

    // Fetch updated populated case and relation counts
    const [updatedDoc, hearingsCount, documentsCount, eventsCount, partiesCount] =
      await Promise.all([
        Case.findById(caseObjectId)
          .populate("clientId", "name clientNumber organizationName clientType phone email")
          .populate("courtId", "name courtType district roomOrHall presidingJudgeTitle")
          .lean(),
        Hearing.countDocuments({ caseId: caseObjectId }),
        CaseDocument.countDocuments({ caseId: caseObjectId, deletedAt: null }),
        CaseEvent.countDocuments({ caseId: caseObjectId }),
        CaseParty.countDocuments({ caseId: caseObjectId }),
      ]);

    const counts = {
      hearings: hearingsCount,
      documents: documentsCount,
      events: eventsCount,
      parties: partiesCount,
    };

    const listItem = formatCaseListItem(updatedDoc!, counts);
    const detailDto: CaseDetailDto = {
      ...listItem,
      counts,
    };

    const response: CaseActionResponse = {
      success: true,
      message: `Case "${detailDto.title}" (${detailDto.internalReference}) updated successfully.`,
      data: detailDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PUT /api/v1/cases/[id]
 *
 * Alias for PATCH handler.
 */
export const PUT = PATCH;

/**
 * DELETE /api/v1/cases/[id]
 *
 * Soft-delete a case record. Preserves audit trail and related records.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case ID format");
    }

    await ConnectDB();

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const caseDoc = await Case.findOne({ _id: caseObjectId, deletedAt: null });

    if (!caseDoc) {
      throw ApiError.notFound("Case not found or has already been archived.");
    }

    await withTransaction(async (dbSession) => {
      // Soft-delete the case
      caseDoc.deletedAt = new Date();
      await caseDoc.save({ session: dbSession });

      // Record audit log for case soft deletion
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.SOFT_DELETE,
        entityType: AUDIT_ENTITY_TYPES.CASE,
        entityId: caseDoc._id,
        oldValues: { deletedAt: null },
        newValues: { deletedAt: caseDoc.deletedAt },
        description: `Archived case "${caseDoc.title}" (${caseDoc.internalReference})`,
        session: dbSession,
      });
    });

    const response: CaseDeleteResponse = {
      success: true,
      message: `Case "${caseDoc.title}" (${caseDoc.internalReference}) was archived successfully.`,
      id,
    };

    return NextResponse.json(response);
  }
);
