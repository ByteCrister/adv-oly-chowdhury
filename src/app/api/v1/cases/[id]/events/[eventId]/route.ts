import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { CaseEvent } from "@/db/models/CaseEvent.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import { updateCaseEventSchema } from "@/utils/zod/case-event.validation";
import { formatCaseEventItem } from "../route";
import type {
  CaseEventActionResponse,
  CaseEventDeleteResponse,
} from "@/types/case-event.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

/**
 * GET /api/v1/cases/[id]/events/[eventId]
 *
 * Retrieve an individual event belonging to a case.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, eventId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(eventId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    const eventDoc = await CaseEvent.findOne({
      _id: eventObjectId,
      caseId: caseObjectId,
    })
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    if (!eventDoc) {
      throw ApiError.notFound("Event not found for this case.");
    }

    const itemDto = formatCaseEventItem(
      eventDoc,
      eventDoc.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }) | null
    );

    return NextResponse.json({
      success: true,
      data: itemDto,
    });
  }
);

/**
 * PATCH /api/v1/cases/[id]/events/[eventId]
 *
 * Update event metadata or safely replace its physical attachment reference.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id, eventId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(eventId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    const body = await req.json();
    const validated = updateCaseEventSchema.parse(body);

    await withTransaction(async (dbSession) => {
      const eventDoc = await CaseEvent.findOne({
        _id: eventObjectId,
        caseId: caseObjectId,
      }).session(dbSession);

      if (!eventDoc) {
        throw ApiError.notFound("Event not found for this case.");
      }

      const beforeState = eventDoc.toObject();

      // Handle attachment replacement if provided
      if (validated.assetReferenceId !== undefined) {
        if (validated.assetReferenceId) {
          const newAssetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

          const newRef = await AssetReference.findOne({
            _id: newAssetRefId,
            deletedAt: null,
          }).session(dbSession);

          if (!newRef) {
            throw ApiError.badRequest(
              "The replacement attachment file does not exist or has been deleted."
            );
          }

          // Soft-delete old reference if different
          if (
            eventDoc.assetReferenceId &&
            eventDoc.assetReferenceId.toString() !== newAssetRefId.toString()
          ) {
            await AssetReference.findByIdAndUpdate(
              eventDoc.assetReferenceId,
              { deletedAt: new Date() },
              { session: dbSession }
            );
          }

          // Bind new reference
          newRef.ownerType = ASSET_OWNER_TYPES.CASE_EVENT;
          newRef.ownerId = caseObjectId;
          await newRef.save({ session: dbSession });

          eventDoc.assetReferenceId = newAssetRefId;
        } else {
          // If assetReferenceId is set to null, soft-delete existing reference
          if (eventDoc.assetReferenceId) {
            await AssetReference.findByIdAndUpdate(
              eventDoc.assetReferenceId,
              { deletedAt: new Date() },
              { session: dbSession }
            );
          }
          eventDoc.assetReferenceId = null;
        }
      }

      if (validated.title !== undefined) eventDoc.title = validated.title.trim();
      if (validated.eventType !== undefined) eventDoc.eventType = validated.eventType;
      if (validated.description !== undefined) {
        eventDoc.description = validated.description?.trim() || null;
      }
      if (validated.eventDate !== undefined) {
        eventDoc.eventDate = new Date(validated.eventDate);
      }

      await eventDoc.save({ session: dbSession });

      // Record audit log for case event update
      const diff = calculateAuditDiff(beforeState, eventDoc.toObject());
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: AUDIT_ENTITY_TYPES.CASE_EVENT,
        entityId: eventDoc._id,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        description: `Updated case event "${eventDoc.title}"`,
        session: dbSession,
      });
    });

    const updatedDoc = await CaseEvent.findById(eventObjectId)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const itemDto = formatCaseEventItem(
      updatedDoc!,
      updatedDoc!.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }) | null
    );

    const response: CaseEventActionResponse = {
      success: true,
      message: `Event "${itemDto.title}" updated successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PUT /api/v1/cases/[id]/events/[eventId]
 *
 * Alias for PATCH handler.
 */
export const PUT = PATCH;

/**
 * DELETE /api/v1/cases/[id]/events/[eventId]
 *
 * Delete a case event and safely soft-delete any associated AssetReference.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id, eventId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(eventId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    const eventDoc = await CaseEvent.findOne({
      _id: eventObjectId,
      caseId: caseObjectId,
    });

    if (!eventDoc) {
      throw ApiError.notFound("Event not found for this case.");
    }

    const eventSnapshot = eventDoc.toObject();

    await withTransaction(async (dbSession) => {
      // 1. Soft-delete attached AssetReference if present
      if (eventDoc.assetReferenceId) {
        await AssetReference.findByIdAndUpdate(
          eventDoc.assetReferenceId,
          { deletedAt: new Date() },
          { session: dbSession }
        );
      }

      // 2. Delete the CaseEvent document
      await eventDoc.deleteOne({ session: dbSession });

      // Record audit log for case event hard deletion
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.DELETE,
        entityType: AUDIT_ENTITY_TYPES.CASE_EVENT,
        entityId: eventDoc._id,
        oldValues: eventSnapshot,
        newValues: null,
        description: `Deleted case event "${eventDoc.title}"`,
        session: dbSession,
      });
    });

    const response: CaseEventDeleteResponse = {
      success: true,
      message: `Event "${eventDoc.title}" was removed successfully.`,
      id: eventId,
    };

    return NextResponse.json(response);
  }
);
