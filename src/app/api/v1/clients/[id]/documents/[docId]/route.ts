import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { Client } from "@/db/models/Client.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
// Ensure models are registered in Mongoose schema cache for nested populate
import "@/db/models/Asset.model";
import { updateClientDocumentSchema } from "@/utils/zod/client-document.validation";
import { formatClientDocumentItem } from "../route";
import type {
  ClientDocumentActionResponse,
  ClientDocumentDeleteResponse,
  SingleClientDocumentApiResponse,
} from "@/types/client-document.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

interface RouteParams {
  params: Promise<{ id: string; docId: string }>;
}

/**
 * GET /api/v1/clients/[id]/documents/[docId]
 *
 * Retrieve an individual active document for a client with strict projection.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, docId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const clientObjectId = new mongoose.Types.ObjectId(id);
    const docObjectId = new mongoose.Types.ObjectId(docId);

    const [clientExists, doc] = await Promise.all([
      Client.exists({ _id: clientObjectId, deletedAt: null }),
      ClientDocument.findOne({
        _id: docObjectId,
        clientId: clientObjectId,
        deletedAt: null,
      })
        .select(
          "_id clientId assetReferenceId documentType title documentDate expiryDate notes createdAt updatedAt"
        )
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          select: "_id originalFileName assetId",
          match: { deletedAt: null },
          populate: {
            path: "assetId",
            select: "_id secureUrl publicId originalFilename format mimeType bytes width height pages",
          },
        })
        .lean(),
    ]);

    if (!clientExists) {
      throw ApiError.notFound("Client not found");
    }

    if (!doc) {
      throw ApiError.notFound("Document not found for this client");
    }

    const itemDto = formatClientDocumentItem(
      doc,
      doc.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      })
    );

    const response: SingleClientDocumentApiResponse = {
      success: true,
      data: itemDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PATCH /api/v1/clients/[id]/documents/[docId]
 *
 * Update document metadata or safely replace its physical asset reference.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id, docId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const clientObjectId = new mongoose.Types.ObjectId(id);
    const docObjectId = new mongoose.Types.ObjectId(docId);

    const clientExists = await Client.exists({ _id: clientObjectId, deletedAt: null });
    if (!clientExists) {
      throw ApiError.notFound("Client not found");
    }

    const body = await req.json();
    const validated = updateClientDocumentSchema.parse(body);

    await withTransaction(async (dbSession) => {
      const doc = await ClientDocument.findOne({
        _id: docObjectId,
        clientId: clientObjectId,
        deletedAt: null,
      })
        .select(
          "_id clientId assetReferenceId documentType title documentDate expiryDate notes createdAt updatedAt"
        )
        .session(dbSession);

      if (!doc) {
        throw ApiError.notFound("Document not found for this client");
      }

      const beforeState = doc.toObject();

      // Handle file replacement if a new assetReferenceId is supplied
      if (validated.assetReferenceId) {
        const newAssetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

        // Verify the new AssetReference exists and is active, binding it to this client
        const newRef = await AssetReference.findOneAndUpdate(
          { _id: newAssetRefId, deletedAt: null },
          {
            ownerType: ASSET_OWNER_TYPES.CLIENT,
            ownerId: clientObjectId,
          },
          { session: dbSession, select: "_id" }
        );

        if (!newRef) {
          throw ApiError.badRequest(
            "The replacement media file does not exist or has been deleted."
          );
        }

        // Soft-delete the previous AssetReference only if replacing with a different file
        if (
          doc.assetReferenceId &&
          doc.assetReferenceId.toString() !== newAssetRefId.toString()
        ) {
          await AssetReference.findByIdAndUpdate(
            doc.assetReferenceId,
            { deletedAt: new Date() },
            { session: dbSession, select: "_id" }
          );
        }

        doc.assetReferenceId = newAssetRefId;
      }

      // Update metadata fields if provided
      if (validated.title !== undefined) doc.title = validated.title.trim();
      if (validated.documentType !== undefined) doc.documentType = validated.documentType;
      if (validated.documentDate !== undefined) {
        doc.documentDate = validated.documentDate ? new Date(validated.documentDate) : null;
      }
      if (validated.expiryDate !== undefined) {
        doc.expiryDate = validated.expiryDate ? new Date(validated.expiryDate) : null;
      }
      if (validated.notes !== undefined) {
        doc.notes = validated.notes?.trim() || null;
      }

      await doc.save({ session: dbSession });

      // Record audit log for client document update
      const diff = calculateAuditDiff(beforeState, doc.toObject());
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: AUDIT_ENTITY_TYPES.CLIENT_DOCUMENT,
        entityId: doc._id,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        description: `Updated client document "${doc.title}"`,
        session: dbSession,
      });
    });

    const updatedDoc = await ClientDocument.findById(docObjectId)
      .select(
        "_id clientId assetReferenceId documentType title documentDate expiryDate notes createdAt updatedAt"
      )
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        select: "_id originalFileName assetId",
        populate: {
          path: "assetId",
          select: "_id secureUrl publicId originalFilename format mimeType bytes width height pages",
        },
      })
      .lean();

    if (!updatedDoc) {
      throw ApiError.notFound("Client document record not found");
    }

    const itemDto = formatClientDocumentItem(
      updatedDoc,
      updatedDoc.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      })
    );

    const response: ClientDocumentActionResponse = {
      success: true,
      message: `Document "${itemDto.title}" updated successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PUT /api/v1/clients/[id]/documents/[docId]
 *
 * Alias for PATCH handler.
 */
export const PUT = PATCH;

/**
 * DELETE /api/v1/clients/[id]/documents/[docId]
 *
 * Safely soft-deletes a client document and its AssetReference.
 * Preserves the underlying physical asset for shared files and records an audit log.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id, docId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const clientObjectId = new mongoose.Types.ObjectId(id);
    const docObjectId = new mongoose.Types.ObjectId(docId);

    const doc = await ClientDocument.findOne({
      _id: docObjectId,
      clientId: clientObjectId,
      deletedAt: null,
    }).select("_id title assetReferenceId deletedAt");

    if (!doc) {
      throw ApiError.notFound("Document not found for this client or has already been removed");
    }

    await withTransaction(async (dbSession) => {
      // 1. Soft-delete the logical AssetReference
      if (doc.assetReferenceId) {
        await AssetReference.findByIdAndUpdate(
          doc.assetReferenceId,
          { deletedAt: new Date() },
          { session: dbSession, select: "_id" }
        );
      }

      // 2. Soft-delete the ClientDocument record
      doc.deletedAt = new Date();
      await doc.save({ session: dbSession });

      // Record audit log for client document soft deletion
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.SOFT_DELETE,
        entityType: AUDIT_ENTITY_TYPES.CLIENT_DOCUMENT,
        entityId: doc._id,
        oldValues: { deletedAt: null },
        newValues: { deletedAt: doc.deletedAt },
        description: `Archived client document "${doc.title}"`,
        session: dbSession,
      });
    });

    const response: ClientDocumentDeleteResponse = {
      success: true,
      message: `Document "${doc.title}" was moved to archive successfully.`,
      id: docId,
    };

    return NextResponse.json(response);
  }
);
