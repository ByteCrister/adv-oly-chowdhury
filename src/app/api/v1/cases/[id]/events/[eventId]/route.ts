import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
// Ensure models are registered in Mongoose schema cache for nested populate
import "@/db/models/Asset.model";
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
      .select(
        "_id caseId eventType title description eventDate assetReferenceId createdAt updatedAt"
      )
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        select: "_id originalFileName assetId",
        match: { deletedAt: null },
        populate: {
          path: "assetId",
          select: "_id secureUrl publicId originalFilename mimeType bytes",
        },
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

      const beforeState = {
        title: eventDoc.title,
        eventType: eventDoc.eventType,
        description: eventDoc.description,
        eventDate: eventDoc.eventDate,
        assetReferenceId: eventDoc.assetReferenceId,
      };

      // Handle attachment replacement if provided
      if (validated.assetReferenceId !== undefined) {
        if (validated.assetReferenceId) {
          const newAssetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

          const newRef = await AssetReference.findOneAndUpdate(
            {
              _id: newAssetRefId,
              deletedAt: null,
            },
            {
              $set: {
                ownerType: ASSET_OWNER_TYPES.CASE_EVENT,
                ownerId: caseObjectId,
              },
            },
            { session: dbSession, select: "_id" }
          );

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
              { session: dbSession, select: "_id" }
            );
          }

          eventDoc.assetReferenceId = newAssetRefId;
        } else {
          // If assetReferenceId is set to null, soft-delete existing reference
          if (eventDoc.assetReferenceId) {
            await AssetReference.findByIdAndUpdate(
              eventDoc.assetReferenceId,
              { deletedAt: new Date() },
              { session: dbSession, select: "_id" }
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

      const afterState = {
        title: eventDoc.title,
        eventType: eventDoc.eventType,
        description: eventDoc.description,
        eventDate: eventDoc.eventDate,
        assetReferenceId: eventDoc.assetReferenceId,
      };

      // Record audit log for case event update
      const diff = calculateAuditDiff(beforeState, afterState);
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
      .select(
        "_id caseId eventType title description eventDate assetReferenceId createdAt updatedAt"
      )
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        select: "_id originalFileName assetId",
        match: { deletedAt: null },
        populate: {
          path: "assetId",
          select: "_id secureUrl publicId originalFilename mimeType bytes",
        },
      })
      .lean();

    if (!updatedDoc) {
      throw ApiError.notFound("Case event record not found");
    }

    const itemDto = formatCaseEventItem(
      updatedDoc,
      updatedDoc.assetReferenceId as unknown as (IAssetReferenceDocument & {
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
    }).select("_id title eventType eventDate assetReferenceId description");

    if (!eventDoc) {
      throw ApiError.notFound("Event not found for this case.");
    }

    const oldValues = {
      _id: String(eventDoc._id),
      title: eventDoc.title,
      eventType: eventDoc.eventType,
      eventDate: eventDoc.eventDate,
      assetReferenceId: eventDoc.assetReferenceId ? String(eventDoc.assetReferenceId) : null,
      description: eventDoc.description,
    };

    await withTransaction(async (dbSession) => {
      // 1. Soft-delete attached AssetReference if present
      if (eventDoc.assetReferenceId) {
        await AssetReference.findByIdAndUpdate(
          eventDoc.assetReferenceId,
          { deletedAt: new Date() },
          { session: dbSession, select: "_id" }
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
        oldValues,
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
