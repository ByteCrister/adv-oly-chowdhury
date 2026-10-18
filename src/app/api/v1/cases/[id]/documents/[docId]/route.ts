import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import ConnectDB from "@/db";
import { Case } from "@/db/models/Case.model";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import { updateCaseDocumentSchema } from "@/utils/zod/case-document.validation";
import { formatCaseDocumentItem } from "../route";
import type {
  CaseDocumentActionResponse,
  CaseDocumentDeleteResponse,
} from "@/types/case-document.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

interface RouteParams {
  params: Promise<{ id: string; docId: string }>;
}

/**
 * GET /api/v1/cases/[id]/documents/[docId]
 *
 * Retrieve an individual document for a case.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, docId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const docObjectId = new mongoose.Types.ObjectId(docId);

    await ConnectDB();

    const [parentCase, doc] = await Promise.all([
      Case.findOne(
        { _id: caseObjectId, deletedAt: null },
        { _id: 1, title: 1, caseNumber: 1, internalReference: 1, caseStatus: 1 }
      ).lean(),
      CaseDocument.findOne({
        _id: docObjectId,
        caseId: caseObjectId,
        deletedAt: null,
      })
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          populate: { path: "assetId" },
        })
        .lean(),
    ]);

    if (!parentCase) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    if (!doc) {
      throw ApiError.notFound("Document not found for this case or has already been archived.");
    }

    const itemDto = formatCaseDocumentItem(
      doc,
      doc.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }),
      parentCase
    );

    return NextResponse.json({
      success: true,
      data: itemDto,
    });
  }
);

/**
 * PATCH /api/v1/cases/[id]/documents/[docId]
 *
 * Update document metadata or safely replace its physical asset reference.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, docId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const docObjectId = new mongoose.Types.ObjectId(docId);

    const body = await req.json();
    const validated = updateCaseDocumentSchema.parse(body);

    await ConnectDB();

    const parentCase = await Case.findOne(
      { _id: caseObjectId, deletedAt: null },
      { _id: 1, title: 1, caseNumber: 1, internalReference: 1, caseStatus: 1 }
    ).lean();

    if (!parentCase) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    await withTransaction(async (dbSession) => {
      const doc = await CaseDocument.findOne({
        _id: docObjectId,
        caseId: caseObjectId,
        deletedAt: null,
      }).session(dbSession);

      if (!doc) {
        throw ApiError.notFound("Document not found for this case or has already been archived.");
      }

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

        // Soft-delete the previous AssetReference to avoid orphaned active references
        if (doc.assetReferenceId) {
          await AssetReference.findByIdAndUpdate(
            doc.assetReferenceId,
            { deletedAt: new Date() },
            { session: dbSession }
          );
        }

        // Bind the new AssetReference to this case
        newRef.ownerType = ASSET_OWNER_TYPES.CASE;
        newRef.ownerId = caseObjectId;
        await newRef.save({ session: dbSession });

        doc.assetReferenceId = newAssetRefId;
      }

      // Update metadata fields if provided
      if (validated.title !== undefined) doc.title = validated.title.trim();
      if (validated.documentType !== undefined) doc.documentType = validated.documentType;
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

    const updatedDoc = await CaseDocument.findById(docObjectId)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const itemDto = formatCaseDocumentItem(
      updatedDoc!,
      updatedDoc!.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }),
      parentCase
    );

    const response: CaseDocumentActionResponse = {
      success: true,
      message: `Document "${itemDto.title}" updated successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PUT /api/v1/cases/[id]/documents/[docId]
 *
 * Alias for PATCH handler.
 */
export const PUT = PATCH;

/**
 * DELETE /api/v1/cases/[id]/documents/[docId]
 *
 * Safely soft-delete a case document and soft-delete its AssetReference.
 * Preserves the underlying Cloudinary asset for shared usage.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, docId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const docObjectId = new mongoose.Types.ObjectId(docId);

    await ConnectDB();

    const doc = await CaseDocument.findOne({
      _id: docObjectId,
      caseId: caseObjectId,
      deletedAt: null,
    });

    if (!doc) {
      throw ApiError.notFound("Document not found for this case or has already been archived.");
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

      // 2. Soft-delete the CaseDocument record
      doc.deletedAt = new Date();
      await doc.save({ session: dbSession });
    });

    const response: CaseDocumentDeleteResponse = {
      success: true,
      message: `Document "${doc.title}" moved to archive successfully.`,
      id: docId,
    };

    return NextResponse.json(response);
  }
);
