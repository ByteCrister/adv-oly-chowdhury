import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { AssetReference } from "@/db/models/AssetReference.model";
// Ensure models are registered in Mongoose schema cache for nested populate
import "@/db/models/Asset.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import { DOCUMENT_ENTITY_TYPES, DOCUMENT_ENTITY_TYPE_LIST } from "@/const/document.const";
import { CaseDocumentType } from "@/const/case-document.const";
import { ClientDocumentType } from "@/const/client-document.const";
import {
  updateUnifiedDocumentSchema,
  documentObjectIdValidator,
} from "@/utils/zod/document.validation";
import {
  formatCaseDocumentItem,
  formatClientDocumentItem,
  CASE_POPULATE_SELECT,
  CLIENT_POPULATE_SELECT,
  ASSET_REF_POPULATE_SELECT,
  ASSET_POPULATE_SELECT,
  CASE_DOCUMENT_SELECT,
  CLIENT_DOCUMENT_SELECT,
} from "@/lib/helpers/document.helper";
import type {
  DocumentActionResponse,
  DocumentDeleteResponse,
} from "@/types/document.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/documents/[id]
 *
 * Retrieve document details by ID from either CaseDocument or ClientDocument.
 * Validates entityType parameter when provided and uses targeted projections.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    const parsedId = documentObjectIdValidator.safeParse(id);
    if (!parsedId.success) {
      throw ApiError.badRequest("Invalid document ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const { searchParams } = new URL(req.url);
    const entityTypeParam = searchParams.get("entityType");

    if (
      entityTypeParam &&
      !DOCUMENT_ENTITY_TYPE_LIST.includes(entityTypeParam as (typeof DOCUMENT_ENTITY_TYPE_LIST)[number])
    ) {
      throw ApiError.badRequest(
        `Invalid entityType parameter "${entityTypeParam}". Must be one of: ${DOCUMENT_ENTITY_TYPE_LIST.join(", ")}`
      );
    }

    // Check CaseDocument first if entityType is CASE or omitted
    if (!entityTypeParam || entityTypeParam === DOCUMENT_ENTITY_TYPES.CASE) {
      const caseDoc = await CaseDocument.findOne({ _id: objectId, deletedAt: null })
        .select(CASE_DOCUMENT_SELECT)
        .populate<{ caseId: Record<string, unknown> }>("caseId", CASE_POPULATE_SELECT)
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          select: ASSET_REF_POPULATE_SELECT,
          populate: { path: "assetId", select: ASSET_POPULATE_SELECT },
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
        .select(CLIENT_DOCUMENT_SELECT)
        .populate<{ clientId: Record<string, unknown> }>("clientId", CLIENT_POPULATE_SELECT)
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          select: ASSET_REF_POPULATE_SELECT,
          populate: { path: "assetId", select: ASSET_POPULATE_SELECT },
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

    throw ApiError.notFound("Document not found or has already been deleted.");
  }
);

/**
 * PATCH /api/v1/documents/[id]
 *
 * Update document metadata or safely replace its physical asset reference.
 * Prevents accidental self-deletion of media files and ensures transactional consistency.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    const parsedId = documentObjectIdValidator.safeParse(id);
    if (!parsedId.success) {
      throw ApiError.badRequest("Invalid document ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const body = await req.json().catch(() => null);
    if (!body) {
      throw ApiError.badRequest("Invalid or missing JSON request body");
    }

    const validated = updateUnifiedDocumentSchema.parse(body);

    // If entityType is not provided, resolve whether target document is Case or Client
    let targetEntityType = validated.entityType;
    if (!targetEntityType) {
      const isCase = await CaseDocument.exists({ _id: objectId, deletedAt: null });
      if (isCase) {
        targetEntityType = DOCUMENT_ENTITY_TYPES.CASE;
      } else {
        const isClient = await ClientDocument.exists({ _id: objectId, deletedAt: null });
        if (isClient) {
          targetEntityType = DOCUMENT_ENTITY_TYPES.CLIENT;
        } else {
          throw ApiError.notFound("Document not found or has already been deleted.");
        }
      }
    }

    if (targetEntityType === DOCUMENT_ENTITY_TYPES.CASE) {
      await withTransaction(async (dbSession) => {
        const doc = await CaseDocument.findOne({
          _id: objectId,
          deletedAt: null,
        })
          .select(
            "_id caseId assetReferenceId documentType title documentDate description exhibitNumber isConfidential deletedAt createdAt updatedAt"
          )
          .session(dbSession);

        if (!doc) {
          throw ApiError.notFound("Case document not found or has already been deleted.");
        }

        const beforeState = {
          title: doc.title,
          documentType: doc.documentType,
          documentDate: doc.documentDate,
          description: doc.description,
          exhibitNumber: doc.exhibitNumber,
          isConfidential: doc.isConfidential,
          assetReferenceId: doc.assetReferenceId,
        };

        // File replacement handling
        if (
          validated.assetReferenceId &&
          validated.assetReferenceId !== doc.assetReferenceId?.toString()
        ) {
          const newAssetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

          const newRef = await AssetReference.findOne({
            _id: newAssetRefId,
            deletedAt: null,
          })
            .select("_id ownerType ownerId")
            .session(dbSession);

          if (!newRef) {
            throw ApiError.badRequest(
              "The replacement media file does not exist or has been deleted."
            );
          }

          // Check if new asset reference is already attached elsewhere
          const [usedInCase, usedInClient] = await Promise.all([
            CaseDocument.exists({
              _id: { $ne: doc._id },
              assetReferenceId: newAssetRefId,
              deletedAt: null,
            }).session(dbSession),
            ClientDocument.exists({
              _id: { $ne: doc._id },
              assetReferenceId: newAssetRefId,
              deletedAt: null,
            }).session(dbSession),
          ]);

          if (usedInCase || usedInClient) {
            throw ApiError.conflict(
              "The replacement media file is already attached to another active document."
            );
          }

          // Soft-delete previous AssetReference only if not referenced by any other document
          if (doc.assetReferenceId) {
            const [otherCase, otherClient] = await Promise.all([
              CaseDocument.exists({
                _id: { $ne: doc._id },
                assetReferenceId: doc.assetReferenceId,
                deletedAt: null,
              }).session(dbSession),
              ClientDocument.exists({
                _id: { $ne: doc._id },
                assetReferenceId: doc.assetReferenceId,
                deletedAt: null,
              }).session(dbSession),
            ]);

            if (!otherCase && !otherClient) {
              await AssetReference.findByIdAndUpdate(
                doc.assetReferenceId,
                { deletedAt: new Date() },
                { session: dbSession }
              );
            }
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

        const afterState = {
          title: doc.title,
          documentType: doc.documentType,
          documentDate: doc.documentDate,
          description: doc.description,
          exhibitNumber: doc.exhibitNumber,
          isConfidential: doc.isConfidential,
          assetReferenceId: doc.assetReferenceId,
        };

        const diff = calculateAuditDiff(beforeState, afterState);
        if (diff.oldValues || diff.newValues) {
          await recordAuditLog({
            req,
            userId,
            action: AUDIT_ACTIONS.UPDATE,
            entityType: AUDIT_ENTITY_TYPES.CASE_DOCUMENT,
            entityId: doc._id,
            oldValues: diff.oldValues,
            newValues: diff.newValues,
            description: `Updated case document "${doc.title}"`,
            session: dbSession,
          });
        }
      });

      const updated = await CaseDocument.findById(objectId)
        .select(CASE_DOCUMENT_SELECT)
        .populate<{ caseId: Record<string, unknown> }>("caseId", CASE_POPULATE_SELECT)
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          select: ASSET_REF_POPULATE_SELECT,
          populate: { path: "assetId", select: ASSET_POPULATE_SELECT },
        })
        .lean();

      if (!updated) {
        throw ApiError.notFound("Case document not found after update.");
      }

      const itemDto = formatCaseDocumentItem(
        updated,
        updated.assetReferenceId as unknown as (IAssetReferenceDocument & { assetId: IAsset }),
        updated.caseId as unknown as Record<string, unknown>
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
        })
          .select(
            "_id clientId assetReferenceId documentType title documentDate expiryDate notes deletedAt createdAt updatedAt"
          )
          .session(dbSession);

        if (!doc) {
          throw ApiError.notFound("Client document not found or has already been deleted.");
        }

        const beforeState = {
          title: doc.title,
          documentType: doc.documentType,
          documentDate: doc.documentDate,
          expiryDate: doc.expiryDate,
          notes: doc.notes,
          assetReferenceId: doc.assetReferenceId,
        };

        // File replacement handling
        if (
          validated.assetReferenceId &&
          validated.assetReferenceId !== doc.assetReferenceId?.toString()
        ) {
          const newAssetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

          const newRef = await AssetReference.findOne({
            _id: newAssetRefId,
            deletedAt: null,
          })
            .select("_id ownerType ownerId")
            .session(dbSession);

          if (!newRef) {
            throw ApiError.badRequest(
              "The replacement media file does not exist or has been deleted."
            );
          }

          // Check if new asset reference is already attached elsewhere
          const [usedInCase, usedInClient] = await Promise.all([
            CaseDocument.exists({
              _id: { $ne: doc._id },
              assetReferenceId: newAssetRefId,
              deletedAt: null,
            }).session(dbSession),
            ClientDocument.exists({
              _id: { $ne: doc._id },
              assetReferenceId: newAssetRefId,
              deletedAt: null,
            }).session(dbSession),
          ]);

          if (usedInCase || usedInClient) {
            throw ApiError.conflict(
              "The replacement media file is already attached to another active document."
            );
          }

          // Soft-delete previous AssetReference only if not referenced by any other document
          if (doc.assetReferenceId) {
            const [otherCase, otherClient] = await Promise.all([
              CaseDocument.exists({
                _id: { $ne: doc._id },
                assetReferenceId: doc.assetReferenceId,
                deletedAt: null,
              }).session(dbSession),
              ClientDocument.exists({
                _id: { $ne: doc._id },
                assetReferenceId: doc.assetReferenceId,
                deletedAt: null,
              }).session(dbSession),
            ]);

            if (!otherCase && !otherClient) {
              await AssetReference.findByIdAndUpdate(
                doc.assetReferenceId,
                { deletedAt: new Date() },
                { session: dbSession }
              );
            }
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

        const afterState = {
          title: doc.title,
          documentType: doc.documentType,
          documentDate: doc.documentDate,
          expiryDate: doc.expiryDate,
          notes: doc.notes,
          assetReferenceId: doc.assetReferenceId,
        };

        const diff = calculateAuditDiff(beforeState, afterState);
        if (diff.oldValues || diff.newValues) {
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
        }
      });

      const updated = await ClientDocument.findById(objectId)
        .select(CLIENT_DOCUMENT_SELECT)
        .populate<{ clientId: Record<string, unknown> }>("clientId", CLIENT_POPULATE_SELECT)
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          select: ASSET_REF_POPULATE_SELECT,
          populate: { path: "assetId", select: ASSET_POPULATE_SELECT },
        })
        .lean();

      if (!updated) {
        throw ApiError.notFound("Client document not found after update.");
      }

      const itemDto = formatClientDocumentItem(
        updated,
        updated.assetReferenceId as unknown as (IAssetReferenceDocument & { assetId: IAsset }),
        updated.clientId as unknown as Record<string, unknown>
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
 * Marks the document with deletedAt: new Date() and soft-deletes its AssetReference
 * only if no other active document references the same physical asset reference.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    const parsedId = documentObjectIdValidator.safeParse(id);
    if (!parsedId.success) {
      throw ApiError.badRequest("Invalid document ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const { searchParams } = new URL(req.url);
    const entityTypeParam = searchParams.get("entityType");

    if (
      entityTypeParam &&
      !DOCUMENT_ENTITY_TYPE_LIST.includes(entityTypeParam as (typeof DOCUMENT_ENTITY_TYPE_LIST)[number])
    ) {
      throw ApiError.badRequest(
        `Invalid entityType parameter "${entityTypeParam}". Must be one of: ${DOCUMENT_ENTITY_TYPE_LIST.join(", ")}`
      );
    }

    const deleteDate = new Date();

    // Check CaseDocument inside transaction
    if (!entityTypeParam || entityTypeParam === DOCUMENT_ENTITY_TYPES.CASE) {
      const caseResult = await withTransaction(async (dbSession) => {
        const caseDoc = await CaseDocument.findOne({
          _id: objectId,
          deletedAt: null,
        })
          .select("_id title assetReferenceId deletedAt")
          .session(dbSession);

        if (!caseDoc) return null;

        // 1. Soft-delete the CaseDocument record
        caseDoc.deletedAt = deleteDate;
        await caseDoc.save({ session: dbSession });

        // 2. Soft-delete the logical AssetReference only if not referenced by another active document
        if (caseDoc.assetReferenceId) {
          const [otherCase, otherClient] = await Promise.all([
            CaseDocument.exists({
              _id: { $ne: caseDoc._id },
              assetReferenceId: caseDoc.assetReferenceId,
              deletedAt: null,
            }).session(dbSession),
            ClientDocument.exists({
              _id: { $ne: caseDoc._id },
              assetReferenceId: caseDoc.assetReferenceId,
              deletedAt: null,
            }).session(dbSession),
          ]);

          if (!otherCase && !otherClient) {
            await AssetReference.findByIdAndUpdate(
              caseDoc.assetReferenceId,
              { deletedAt: deleteDate },
              { session: dbSession }
            );
          }
        }

        // 3. Record audit log
        await recordAuditLog({
          req,
          userId,
          action: AUDIT_ACTIONS.SOFT_DELETE,
          entityType: AUDIT_ENTITY_TYPES.CASE_DOCUMENT,
          entityId: caseDoc._id,
          oldValues: { deletedAt: null },
          newValues: { deletedAt: deleteDate },
          description: `Soft deleted case document "${caseDoc.title}"`,
          session: dbSession,
        });

        return caseDoc;
      });

      if (caseResult) {
        const response: DocumentDeleteResponse = {
          success: true,
          message: `Case document "${caseResult.title}" moved to archive successfully.`,
          id,
          entityType: DOCUMENT_ENTITY_TYPES.CASE,
        };

        return NextResponse.json(response);
      }
    }

    // Check ClientDocument inside transaction
    if (!entityTypeParam || entityTypeParam === DOCUMENT_ENTITY_TYPES.CLIENT) {
      const clientResult = await withTransaction(async (dbSession) => {
        const clientDoc = await ClientDocument.findOne({
          _id: objectId,
          deletedAt: null,
        })
          .select("_id title assetReferenceId deletedAt")
          .session(dbSession);

        if (!clientDoc) return null;

        // 1. Soft-delete the ClientDocument record
        clientDoc.deletedAt = deleteDate;
        await clientDoc.save({ session: dbSession });

        // 2. Soft-delete the logical AssetReference only if not referenced by another active document
        if (clientDoc.assetReferenceId) {
          const [otherCase, otherClient] = await Promise.all([
            CaseDocument.exists({
              _id: { $ne: clientDoc._id },
              assetReferenceId: clientDoc.assetReferenceId,
              deletedAt: null,
            }).session(dbSession),
            ClientDocument.exists({
              _id: { $ne: clientDoc._id },
              assetReferenceId: clientDoc.assetReferenceId,
              deletedAt: null,
            }).session(dbSession),
          ]);

          if (!otherCase && !otherClient) {
            await AssetReference.findByIdAndUpdate(
              clientDoc.assetReferenceId,
              { deletedAt: deleteDate },
              { session: dbSession }
            );
          }
        }

        // 3. Record audit log
        await recordAuditLog({
          req,
          userId,
          action: AUDIT_ACTIONS.SOFT_DELETE,
          entityType: AUDIT_ENTITY_TYPES.CLIENT_DOCUMENT,
          entityId: clientDoc._id,
          oldValues: { deletedAt: null },
          newValues: { deletedAt: deleteDate },
          description: `Soft deleted client document "${clientDoc.title}"`,
          session: dbSession,
        });

        return clientDoc;
      });

      if (clientResult) {
        const response: DocumentDeleteResponse = {
          success: true,
          message: `Client document "${clientResult.title}" moved to archive successfully.`,
          id,
          entityType: DOCUMENT_ENTITY_TYPES.CLIENT,
        };

        return NextResponse.json(response);
      }
    }

    throw ApiError.notFound("Document not found or has already been deleted.");
  }
);
