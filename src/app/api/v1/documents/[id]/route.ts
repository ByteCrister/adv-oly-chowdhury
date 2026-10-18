import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import { DOCUMENT_ENTITY_TYPES } from "@/const/document.const";
import {
  CASE_DOCUMENT_TYPE_LABELS,
  CaseDocumentType,
} from "@/const/case-document.const";
import {
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentType,
} from "@/const/client-document.const";
import { updateUnifiedDocumentSchema } from "@/utils/zod/document.validation";
import type {
  UnifiedDocumentItemDto,
  DocumentActionResponse,
  DocumentDeleteResponse,
} from "@/types/document.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";
import ConnectDB from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function formatCaseDocumentItem(
  doc: Record<string, unknown>,
  assetRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null,
  caseInfo?: Record<string, unknown> | null
): UnifiedDocumentItemDto {
  const asset = assetRef?.assetId;
  const docType = doc.documentType as CaseDocumentType;

  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    entityType: DOCUMENT_ENTITY_TYPES.CASE,
    assetReferenceId: assetRef?._id
      ? assetRef._id.toString()
      : (doc.assetReferenceId as mongoose.Types.ObjectId).toString(),
    assetId: asset?._id ? asset._id.toString() : "",
    documentType: docType,
    documentTypeLabel: CASE_DOCUMENT_TYPE_LABELS[docType] || String(doc.documentType),
    title: doc.title as string,
    documentDate: doc.documentDate ? new Date(doc.documentDate as Date).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt as Date).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as Date).toISOString() : "",
    originalFileName: assetRef?.originalFileName || asset?.originalFilename || (doc.title as string),
    fileUrl: asset?.secureUrl || "",
    publicId: asset?.publicId || "",
    mimeType: asset?.mimeType || "application/octet-stream",
    sizeBytes: asset?.bytes || 0,
    format: asset?.format || null,
    width: asset?.width || null,
    height: asset?.height || null,
    pages: asset?.pages || null,
    caseId: caseInfo?._id
      ? (caseInfo._id as mongoose.Types.ObjectId).toString()
      : doc.caseId
      ? (doc.caseId as mongoose.Types.ObjectId).toString()
      : null,
    caseDetails: caseInfo
      ? {
          id: (caseInfo._id as mongoose.Types.ObjectId).toString(),
          title: (caseInfo.title as string) || "Untitled Case",
          caseNumber: (caseInfo.caseNumber as string) || "",
          internalReference: (caseInfo.internalReference as string) || "",
          caseStatus: (caseInfo.caseStatus as string) || undefined,
        }
      : null,
    description: (doc.description as string) || null,
    exhibitNumber: (doc.exhibitNumber as string) || null,
    isConfidential: Boolean(doc.isConfidential),
  };
}

function formatClientDocumentItem(
  doc: Record<string, unknown>,
  assetRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null,
  clientInfo?: Record<string, unknown> | null
): UnifiedDocumentItemDto {
  const asset = assetRef?.assetId;
  const docType = doc.documentType as ClientDocumentType;

  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    entityType: DOCUMENT_ENTITY_TYPES.CLIENT,
    assetReferenceId: assetRef?._id
      ? assetRef._id.toString()
      : (doc.assetReferenceId as mongoose.Types.ObjectId).toString(),
    assetId: asset?._id ? asset._id.toString() : "",
    documentType: docType,
    documentTypeLabel: CLIENT_DOCUMENT_TYPE_LABELS[docType] || String(doc.documentType),
    title: doc.title as string,
    documentDate: doc.documentDate ? new Date(doc.documentDate as Date).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt as Date).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as Date).toISOString() : "",
    originalFileName: assetRef?.originalFileName || asset?.originalFilename || (doc.title as string),
    fileUrl: asset?.secureUrl || "",
    publicId: asset?.publicId || "",
    mimeType: asset?.mimeType || "application/octet-stream",
    sizeBytes: asset?.bytes || 0,
    format: asset?.format || null,
    width: asset?.width || null,
    height: asset?.height || null,
    pages: asset?.pages || null,
    clientId: clientInfo?._id
      ? (clientInfo._id as mongoose.Types.ObjectId).toString()
      : doc.clientId
      ? (doc.clientId as mongoose.Types.ObjectId).toString()
      : null,
    clientDetails: clientInfo
      ? {
          id: (clientInfo._id as mongoose.Types.ObjectId).toString(),
          name: (clientInfo.name as string) || "Unnamed Client",
          clientNumber: (clientInfo.clientNumber as string) || "",
          organizationName: (clientInfo.organizationName as string) || null,
          phone: (clientInfo.phone as string) || null,
        }
      : null,
    expiryDate: doc.expiryDate ? new Date(doc.expiryDate as Date).toISOString() : null,
    notes: (doc.notes as string) || null,
  };
}

/**
 * GET /api/v1/documents/[id]
 *
 * Retrieve document details by ID. Checks CaseDocument or ClientDocument.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid document ID format");
    }

    await ConnectDB();

    const objectId = new mongoose.Types.ObjectId(id);
    const { searchParams } = new URL(req.url);
    const entityTypeParam = searchParams.get("entityType");

    // Check CaseDocument first if entityType is CASE or omitted
    if (!entityTypeParam || entityTypeParam === DOCUMENT_ENTITY_TYPES.CASE) {
      const caseDoc = await CaseDocument.findOne({ _id: objectId, deletedAt: null })
        .populate<{ caseId: Record<string, unknown> }>("caseId", "title caseNumber internalReference caseStatus")
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          populate: { path: "assetId" },
        })
        .lean();

      if (caseDoc) {
        const itemDto = formatCaseDocumentItem(
          caseDoc,
          caseDoc.assetReferenceId as unknown as (IAssetReferenceDocument & { assetId: IAsset }),
          caseDoc.caseId as unknown as Record<string, unknown>
        );
        return NextResponse.json({ success: true, data: itemDto });
      }
    }

    // Check ClientDocument
    if (!entityTypeParam || entityTypeParam === DOCUMENT_ENTITY_TYPES.CLIENT) {
      const clientDoc = await ClientDocument.findOne({ _id: objectId, deletedAt: null })
        .populate<{ clientId: Record<string, unknown> }>("clientId", "name clientNumber organizationName phone")
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          populate: { path: "assetId" },
        })
        .lean();

      if (clientDoc) {
        const itemDto = formatClientDocumentItem(
          clientDoc,
          clientDoc.assetReferenceId as unknown as (IAssetReferenceDocument & { assetId: IAsset }),
          clientDoc.clientId as unknown as Record<string, unknown>
        );
        return NextResponse.json({ success: true, data: itemDto });
      }
    }

    throw ApiError.notFound("Document not found");
  }
);

/**
 * PATCH /api/v1/documents/[id]
 *
 * Update document metadata or safely replace its physical asset reference.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid document ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const body = await req.json();
    const validated = updateUnifiedDocumentSchema.parse(body);

    await ConnectDB();

    if (validated.entityType === DOCUMENT_ENTITY_TYPES.CASE) {
      await withTransaction(async (dbSession) => {
        const doc = await CaseDocument.findOne({
          _id: objectId,
          deletedAt: null,
        }).session(dbSession);

        if (!doc) {
          throw ApiError.notFound("Case document not found or has already been deleted.");
        }

        // File replacement handling
        if (validated.assetReferenceId) {
          const newAssetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

          const newRef = await AssetReference.findOne({
            _id: newAssetRefId,
            deletedAt: null,
          }).session(dbSession);

          if (!newRef) {
            throw ApiError.badRequest(
              "The replacement media file does not exist or has been deleted."
            );
          }

          // Soft-delete previous AssetReference
          if (doc.assetReferenceId) {
            await AssetReference.findByIdAndUpdate(
              doc.assetReferenceId,
              { deletedAt: new Date() },
              { session: dbSession }
            );
          }

          // Bind new AssetReference
          newRef.ownerType = ASSET_OWNER_TYPES.CASE;
          newRef.ownerId = doc.caseId;
          await newRef.save({ session: dbSession });

          doc.assetReferenceId = newAssetRefId;
        }

        // Metadata fields
        if (validated.title !== undefined) doc.title = validated.title.trim();
        if (validated.documentType !== undefined) {
          doc.documentType = validated.documentType as CaseDocumentType;
        }
        if (validated.documentDate !== undefined) {
          doc.documentDate = validated.documentDate ? new Date(validated.documentDate) : null;
        }
        if (validated.description !== undefined) {
          doc.description = validated.description?.trim() || null;
        }
        if (validated.exhibitNumber !== undefined) {
          doc.exhibitNumber = validated.exhibitNumber?.trim() || null;
        }
        if (validated.isConfidential !== undefined) {
          doc.isConfidential = Boolean(validated.isConfidential);
        }

        await doc.save({ session: dbSession });
      });

      const updated = await CaseDocument.findById(objectId)
        .populate<{ caseId: Record<string, unknown> }>("caseId", "title caseNumber internalReference caseStatus")
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          populate: { path: "assetId" },
        })
        .lean();

      const itemDto = formatCaseDocumentItem(
        updated!,
        updated!.assetReferenceId as unknown as (IAssetReferenceDocument & { assetId: IAsset }),
        updated!.caseId as unknown as Record<string, unknown>
      );

      const response: DocumentActionResponse = {
        success: true,
        message: `Case document "${itemDto.title}" updated successfully.`,
        data: itemDto,
      };

      return NextResponse.json(response);
    } else {
      // CLIENT DOCUMENT UPDATE
      await withTransaction(async (dbSession) => {
        const doc = await ClientDocument.findOne({
          _id: objectId,
          deletedAt: null,
        }).session(dbSession);

        if (!doc) {
          throw ApiError.notFound("Client document not found or has already been deleted.");
        }

        // File replacement handling
        if (validated.assetReferenceId) {
          const newAssetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

          const newRef = await AssetReference.findOne({
            _id: newAssetRefId,
            deletedAt: null,
          }).session(dbSession);

          if (!newRef) {
            throw ApiError.badRequest(
              "The replacement media file does not exist or has been deleted."
            );
          }

          // Soft-delete previous AssetReference
          if (doc.assetReferenceId) {
            await AssetReference.findByIdAndUpdate(
              doc.assetReferenceId,
              { deletedAt: new Date() },
              { session: dbSession }
            );
          }

          // Bind new AssetReference
          newRef.ownerType = ASSET_OWNER_TYPES.CLIENT;
          newRef.ownerId = doc.clientId;
          await newRef.save({ session: dbSession });

          doc.assetReferenceId = newAssetRefId;
        }

        // Metadata fields
        if (validated.title !== undefined) doc.title = validated.title.trim();
        if (validated.documentType !== undefined) {
          doc.documentType = validated.documentType as ClientDocumentType;
        }
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
      });

      const updated = await ClientDocument.findById(objectId)
        .populate<{ clientId: Record<string, unknown> }>("clientId", "name clientNumber organizationName phone")
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          populate: { path: "assetId" },
        })
        .lean();

      const itemDto = formatClientDocumentItem(
        updated!,
        updated!.assetReferenceId as unknown as (IAssetReferenceDocument & { assetId: IAsset }),
        updated!.clientId as unknown as Record<string, unknown>
      );

      const response: DocumentActionResponse = {
        success: true,
        message: `Client document "${itemDto.title}" updated successfully.`,
        data: itemDto,
      };

      return NextResponse.json(response);
    }
  }
);

/**
 * DELETE /api/v1/documents/[id]
 *
 * Safely soft-delete a document (Case or Client document).
 * Marks the document with deletedAt: new Date() and marks its AssetReference
 * with deletedAt: new Date() to preserve physical asset deduplication.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid document ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const { searchParams } = new URL(req.url);
    const entityTypeParam = searchParams.get("entityType");

    await ConnectDB();

    // Try finding CaseDocument first if entityType is CASE or not specified
    if (!entityTypeParam || entityTypeParam === DOCUMENT_ENTITY_TYPES.CASE) {
      const caseDoc = await CaseDocument.findOne({
        _id: objectId,
        deletedAt: null,
      });

      if (caseDoc) {
        await withTransaction(async (dbSession) => {
          // 1. Soft-delete the CaseDocument record
          caseDoc.deletedAt = new Date();
          await caseDoc.save({ session: dbSession });

          // 2. Soft-delete the logical AssetReference
          if (caseDoc.assetReferenceId) {
            await AssetReference.findByIdAndUpdate(
              caseDoc.assetReferenceId,
              { deletedAt: new Date() },
              { session: dbSession }
            );
          }
        });

        const response: DocumentDeleteResponse = {
          success: true,
          message: `Case document "${caseDoc.title}" moved to archive successfully.`,
          id,
          entityType: DOCUMENT_ENTITY_TYPES.CASE,
        };

        return NextResponse.json(response);
      }
    }

    // Try finding ClientDocument
    if (!entityTypeParam || entityTypeParam === DOCUMENT_ENTITY_TYPES.CLIENT) {
      const clientDoc = await ClientDocument.findOne({
        _id: objectId,
        deletedAt: null,
      });

      if (clientDoc) {
        await withTransaction(async (dbSession) => {
          // 1. Soft-delete the ClientDocument record
          clientDoc.deletedAt = new Date();
          await clientDoc.save({ session: dbSession });

          // 2. Soft-delete the logical AssetReference
          if (clientDoc.assetReferenceId) {
            await AssetReference.findByIdAndUpdate(
              clientDoc.assetReferenceId,
              { deletedAt: new Date() },
              { session: dbSession }
            );
          }
        });

        const response: DocumentDeleteResponse = {
          success: true,
          message: `Client document "${clientDoc.title}" moved to archive successfully.`,
          id,
          entityType: DOCUMENT_ENTITY_TYPES.CLIENT,
        };

        return NextResponse.json(response);
      }
    }

    throw ApiError.notFound("Document not found or has already been deleted.");
  }
);
