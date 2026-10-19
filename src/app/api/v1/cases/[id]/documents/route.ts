import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import ConnectDB from "@/db";
import { Case } from "@/db/models/Case.model";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  CASE_DOCUMENT_DEFAULT_PAGE_LIMIT,
  CASE_DOCUMENT_PAGE_LIMITS,
  CASE_DOCUMENT_SORT_OPTIONS,
  CASE_DOCUMENT_TYPE_LABELS,
  CaseDocumentPageLimit,
  CaseDocumentSortOption,
  CaseDocumentType,
} from "@/const/case-document.const";
import {
  createCaseDocumentSchema,
  caseDocumentQueryFilterSchema,
} from "@/utils/zod/case-document.validation";
import { formatSafeIsoDate } from "@/app/api/v1/cases/route";
import type {
  CaseDocumentItemDto,
  CaseDocumentPaginationResponse,
  CaseDocumentActionResponse,
} from "@/types/case-document.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Format a lean CaseDocument record into a type-safe CaseDocumentItemDto.
 */
export function formatCaseDocumentItem(
  doc: Record<string, unknown>,
  assetRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null,
  caseInfo?: Record<string, unknown> | null
): CaseDocumentItemDto {
  const asset = assetRef?.assetId;
  const docType = doc.documentType as CaseDocumentType;

  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    caseId: (doc.caseId as mongoose.Types.ObjectId).toString(),
    caseDetails: caseInfo
      ? {
          id: (caseInfo._id as mongoose.Types.ObjectId).toString(),
          title: (caseInfo.title as string) || "Untitled Case",
          caseNumber: (caseInfo.caseNumber as string) || "",
          internalReference: (caseInfo.internalReference as string) || "",
          caseStatus: (caseInfo.caseStatus as string) || undefined,
        }
      : null,
    assetReferenceId: assetRef?._id
      ? assetRef._id.toString()
      : doc.assetReferenceId
      ? String(doc.assetReferenceId)
      : "",
    assetId: asset?._id ? asset._id.toString() : "",
    documentType: docType,
    documentTypeLabel: CASE_DOCUMENT_TYPE_LABELS[docType] || String(doc.documentType),
    title: doc.title as string,
    documentDate: formatSafeIsoDate(doc.documentDate),
    description: (doc.description as string) || null,
    exhibitNumber: (doc.exhibitNumber as string) || null,
    isConfidential: Boolean(doc.isConfidential),
    originalFileName: assetRef?.originalFileName || asset?.originalFilename || (doc.title as string),
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
 * GET /api/v1/cases/[id]/documents
 *
 * List all legal documents belonging to the specified case.
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
    const parentCase = await Case.findOne(
      { _id: caseObjectId, deletedAt: null },
      { _id: 1, title: 1, caseNumber: 1, internalReference: 1, caseStatus: 1 }
    ).lean();

    if (!parentCase) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    const { searchParams } = new URL(req.url);

    // Validate limit parameter if provided
    const rawLimit = searchParams.get("limit");
    if (rawLimit !== null) {
      const parsedLimit = parseInt(rawLimit, 10);
      if (!CASE_DOCUMENT_PAGE_LIMITS.includes(parsedLimit as CaseDocumentPageLimit)) {
        throw ApiError.badRequest(
          `Invalid page limit "${rawLimit}". Allowed page limits are: ${CASE_DOCUMENT_PAGE_LIMITS.join(", ")}`
        );
      }
    }

    const rawParams = {
      search: sanitizeSearchParam(searchParams.get("search")),
      caseId: id,
      documentType: searchParams.get("documentType") || undefined,
      isConfidential: searchParams.get("isConfidential") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sort: searchParams.get("sort") || CASE_DOCUMENT_SORT_OPTIONS.NEWEST,
      page: searchParams.get("page") || 1,
      limit: rawLimit ? parseInt(rawLimit, 10) : CASE_DOCUMENT_DEFAULT_PAGE_LIMIT,
    };

    const parsed = caseDocumentQueryFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }

    const { search, documentType, isConfidential, startDate, endDate, sort, page, limit } =
      parsed.data;

    // Strict case-scoped filter, only active documents
    const filter: Record<string, unknown> = {
      caseId: caseObjectId,
      deletedAt: null,
    };

    if (documentType && documentType !== "ALL") {
      filter.documentType = documentType;
    }

    if (isConfidential !== undefined) {
      filter.isConfidential = isConfidential;
    }

    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
      filter.documentDate = dateQuery;
    }

    if (search) {
      const searchRegex = buildSearchRegex(search);
      if (searchRegex) {
        filter.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { exhibitNumber: searchRegex },
        ];
      }
    }

    const sortMap: Record<CaseDocumentSortOption, Record<string, 1 | -1>> = {
      [CASE_DOCUMENT_SORT_OPTIONS.NEWEST]: { createdAt: -1 },
      [CASE_DOCUMENT_SORT_OPTIONS.OLDEST]: { createdAt: 1 },
      [CASE_DOCUMENT_SORT_OPTIONS.TITLE_ASC]: { title: 1 },
      [CASE_DOCUMENT_SORT_OPTIONS.TITLE_DESC]: { title: -1 },
      [CASE_DOCUMENT_SORT_OPTIONS.DATE_DESC]: { documentDate: -1 },
      [CASE_DOCUMENT_SORT_OPTIONS.DATE_ASC]: { documentDate: 1 },
    };

    const sortOption = sortMap[sort as CaseDocumentSortOption] || { createdAt: -1 };
    const skip = (page - 1) * limit;

    const [total, documents] = await Promise.all([
      CaseDocument.countDocuments(filter),
      CaseDocument.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          populate: { path: "assetId" },
        })
        .lean(),
    ]);

    const items: CaseDocumentItemDto[] = documents.map((doc) => {
      const assetRef = doc.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      });
      return formatCaseDocumentItem(doc, assetRef, parentCase);
    });

    const response: CaseDocumentPaginationResponse = {
      items,
      total,
      page,
      limit: limit as CaseDocumentPageLimit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    };

    return NextResponse.json(response);
  }
);

/**
 * POST /api/v1/cases/[id]/documents
 *
 * Add a new legal document to a case using an existing AssetReference.
 */
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case ID format");
    }

    await ConnectDB();

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const parentCase = await Case.findOne(
      { _id: caseObjectId, deletedAt: null },
      { _id: 1, title: 1, caseNumber: 1, internalReference: 1, caseStatus: 1 }
    ).lean();

    if (!parentCase) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    const body = await req.json();
    const payload = {
      ...body,
      caseId: id,
    };

    const validated = createCaseDocumentSchema.parse(payload);
    const assetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

    // Create case document record inside transaction
    const createdDoc = await withTransaction(async (dbSession) => {
      // 1. Verify AssetReference exists and is active inside session
      const existingRef = await AssetReference.findOne({
        _id: assetRefId,
        deletedAt: null,
      }).session(dbSession);

      if (!existingRef) {
        throw ApiError.badRequest(
          "Referenced media file does not exist or has already been deleted."
        );
      }

      // 2. Ensure AssetReference is owned by this Case
      existingRef.ownerType = ASSET_OWNER_TYPES.CASE;
      existingRef.ownerId = caseObjectId;
      await existingRef.save({ session: dbSession });

      // 3. Create CaseDocument
      const [doc] = await CaseDocument.create(
        [
          {
            caseId: caseObjectId,
            assetReferenceId: assetRefId,
            documentType: validated.documentType,
            title: validated.title.trim(),
            documentDate: validated.documentDate ? new Date(validated.documentDate) : null,
            description: validated.description?.trim() || null,
            exhibitNumber: validated.exhibitNumber?.trim() || null,
            isConfidential: Boolean(validated.isConfidential),
          },
        ],
        { session: dbSession }
      );

      // 4. Record audit log for case document creation
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        entityType: AUDIT_ENTITY_TYPES.CASE_DOCUMENT,
        entityId: doc._id,
        oldValues: null,
        newValues: doc.toObject(),
        description: `Added document "${doc.title}" to case "${parentCase.title}"`,
        session: dbSession,
      });

      return doc;
    });

    // Populate for response
    const populatedDoc = await CaseDocument.findById(createdDoc._id)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const itemDto = formatCaseDocumentItem(
      populatedDoc!,
      populatedDoc!.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }),
      parentCase
    );

    const response: CaseDocumentActionResponse = {
      success: true,
      message: `Document "${itemDto.title}" added to case successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response, { status: 201 });
  }
);
