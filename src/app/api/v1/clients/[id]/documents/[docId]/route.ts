import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import ConnectDB from "@/db";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import {
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentType,
} from "@/const/client-document.const";
import { updateClientDocumentSchema } from "@/utils/zod/client-document.validation";
import { formatSafeIsoDate } from "@/app/api/v1/clients/route";
import type {
  ClientDocumentItemDto,
  ClientDocumentActionResponse,
  ClientDocumentDeleteResponse,
} from "@/types/client-document.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

interface RouteParams {
  params: Promise<{ id: string; docId: string }>;
}

/**
 * Helper to format a ClientDocument document into ClientDocumentItemDto.
 */
function formatClientDocumentItem(
  doc: Record<string, unknown>,
  assetRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null
): ClientDocumentItemDto {
  const asset = assetRef?.assetId;
  const docType = doc.documentType as ClientDocumentType;

  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    clientId: (doc.clientId as mongoose.Types.ObjectId).toString(),
    assetReferenceId: assetRef?._id
      ? assetRef._id.toString()
      : (doc.assetReferenceId as mongoose.Types.ObjectId).toString(),
    assetId: asset?._id ? asset._id.toString() : "",
    documentType: docType,
    documentTypeLabel: CLIENT_DOCUMENT_TYPE_LABELS[docType] || String(doc.documentType),
    title: doc.title as string,
    documentDate: formatSafeIsoDate(doc.documentDate),
    expiryDate: formatSafeIsoDate(doc.expiryDate),
    notes: (doc.notes as string) || null,
    originalFileName:
      assetRef?.originalFileName || asset?.originalFilename || (doc.title as string),
    fileUrl: asset?.secureUrl || "",
    publicId: asset?.publicId || "",
    mimeType: asset?.mimeType || "application/octet-stream",
    sizeBytes: asset?.bytes || 0,
    format: asset?.format || null,
    width: asset?.width || null,
    height: asset?.height || null,
    pages: asset?.pages || null,
    createdAt: formatSafeIsoDate(doc.createdAt) || new Date().toISOString(),
    updatedAt: formatSafeIsoDate(doc.updatedAt) || new Date().toISOString(),
  };
}

/**
 * GET /api/v1/clients/[id]/documents/[docId]
 *
 * Retrieve an individual active document for a client.
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

    await ConnectDB();

    const doc = await ClientDocument.findOne({
      _id: docObjectId,
      clientId: clientObjectId,
      deletedAt: null,
    })
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    if (!doc) {
      throw ApiError.notFound("Document not found for this client");
    }

    const itemDto = formatClientDocumentItem(
      doc,
      doc.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      })
    );

    return NextResponse.json({
      success: true,
      data: itemDto,
    });
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

    const body = await req.json();
    const validated = updateClientDocumentSchema.parse(body);

    await ConnectDB();

    await withTransaction(async (dbSession) => {
      const doc = await ClientDocument.findOne({
        _id: docObjectId,
        clientId: clientObjectId,
        deletedAt: null,
      }).session(dbSession);

      if (!doc) {
        throw ApiError.notFound("Document not found for this client");
      }

      const beforeState = doc.toObject();

      // Handle file replacement if a new assetReferenceId is supplied
      if (validated.assetReferenceId) {
        const newAssetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

        // Verify the new AssetReference exists and is active
        const newRef = await AssetReference.findOne({
          _id: newAssetRefId,
          deletedAt: null,
        }).session(dbSession);

        if (!newRef) {
          throw ApiError.badRequest(
            "The replacement media file does not exist or has been deleted."
          );
        }

        // Soft-delete the previous AssetReference to avoid orphaned active records
        if (doc.assetReferenceId) {
          await AssetReference.findByIdAndUpdate(
            doc.assetReferenceId,
            { deletedAt: new Date() },
            { session: dbSession }
          );
        }

        // Bind the new AssetReference to this client
        newRef.ownerType = ASSET_OWNER_TYPES.CLIENT;
        newRef.ownerId = clientObjectId;
        await newRef.save({ session: dbSession });

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
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const itemDto = formatClientDocumentItem(
      updatedDoc!,
      updatedDoc!.assetReferenceId as unknown as (IAssetReferenceDocument & {
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

    await ConnectDB();

    const doc = await ClientDocument.findOne({
      _id: docObjectId,
      clientId: clientObjectId,
      deletedAt: null,
    });

    if (!doc) {
      throw ApiError.notFound("Document not found for this client or has already been removed");
    }

    await withTransaction(async (dbSession) => {
      // 1. Soft-delete the logical AssetReference
      if (doc.assetReferenceId) {
        await AssetReference.findByIdAndUpdate(
          doc.assetReferenceId,
          { deletedAt: new Date() },
          { session: dbSession }
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
