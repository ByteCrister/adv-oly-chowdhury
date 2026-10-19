import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import ConnectDB from "@/db";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import { Client } from "@/db/models/Client.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT,
  CLIENT_DOCUMENT_SORT_OPTIONS,
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentPageLimit,
  ClientDocumentSortOption,
  ClientDocumentType,
} from "@/const/client-document.const";
import {
  createClientDocumentSchema,
  clientDocumentQueryFilterSchema,
} from "@/utils/zod/client-document.validation";
import { formatSafeIsoDate } from "@/app/api/v1/clients/route";
import type {
  ClientDocumentItemDto,
  ClientDocumentPaginationResponse,
  ClientDocumentActionResponse,
} from "@/types/client-document.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Format a ClientDocument record into ClientDocumentItemDto.
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
 * GET /api/v1/clients/[id]/documents
 *
 * List all active documents associated with the given client.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid client ID format");
    }

    await ConnectDB();

    const objectId = new mongoose.Types.ObjectId(id);
    const clientExists = await Client.exists({ _id: objectId, deletedAt: null });
    if (!clientExists) {
      throw ApiError.notFound("Client not found");
    }

    const { searchParams } = new URL(req.url);

    const rawParams = {
      search: sanitizeSearchParam(searchParams.get("search")),
      documentType: searchParams.get("documentType") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sort: searchParams.get("sort") || CLIENT_DOCUMENT_SORT_OPTIONS.NEWEST,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT,
    };

    const parsed = clientDocumentQueryFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }

    const { search, documentType, startDate, endDate, sort, page, limit } = parsed.data;

    // Filter by client and exclude soft-deleted documents
    const filter: Record<string, unknown> = {
      clientId: objectId,
      deletedAt: null,
    };

    if (documentType && documentType !== "ALL") {
      filter.documentType = documentType;
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
        filter.$or = [{ title: searchRegex }, { notes: searchRegex }];
      }
    }

    const sortMap: Record<ClientDocumentSortOption, Record<string, 1 | -1>> = {
      [CLIENT_DOCUMENT_SORT_OPTIONS.NEWEST]: { createdAt: -1 },
      [CLIENT_DOCUMENT_SORT_OPTIONS.OLDEST]: { createdAt: 1 },
      [CLIENT_DOCUMENT_SORT_OPTIONS.TITLE_ASC]: { title: 1 },
      [CLIENT_DOCUMENT_SORT_OPTIONS.TITLE_DESC]: { title: -1 },
      [CLIENT_DOCUMENT_SORT_OPTIONS.EXPIRY_ASC]: { expiryDate: 1 },
      [CLIENT_DOCUMENT_SORT_OPTIONS.EXPIRY_DESC]: { expiryDate: -1 },
    };

    const sortOption = sortMap[sort as ClientDocumentSortOption] || { createdAt: -1 };
    const skip = (page - 1) * limit;

    const [total, documents] = await Promise.all([
      ClientDocument.countDocuments(filter),
      ClientDocument.find(filter)
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

    const items: ClientDocumentItemDto[] = documents.map((doc) => {
      const assetRef = doc.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      });
      return formatClientDocumentItem(doc, assetRef);
    });

    const response: ClientDocumentPaginationResponse = {
      items,
      total,
      page,
      limit: limit as ClientDocumentPageLimit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    };

    return NextResponse.json(response);
  }
);

/**
 * POST /api/v1/clients/[id]/documents
 *
 * Create a new ClientDocument record, associate the AssetReference with this client,
 * and record an audit log.
 */
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid client ID format");
    }

    await ConnectDB();

    const objectId = new mongoose.Types.ObjectId(id);
    const client = await Client.findOne({ _id: objectId, deletedAt: null });
    if (!client) {
      throw ApiError.notFound("Client not found");
    }

    const body = await req.json();
    const validated = createClientDocumentSchema.parse(body);

    const assetRefId = new mongoose.Types.ObjectId(validated.assetReferenceId);

    // Verify asset reference exists and is not soft-deleted
    const existingRef = await AssetReference.findOne({
      _id: assetRefId,
      deletedAt: null,
    });

    if (!existingRef) {
      throw ApiError.badRequest(
        "Referenced media file does not exist or has already been deleted."
      );
    }

    // Create client document record inside a transaction
    const createdDoc = await withTransaction(async (dbSession) => {
      // 1. Ensure the AssetReference is owned by this client
      existingRef.ownerType = ASSET_OWNER_TYPES.CLIENT;
      existingRef.ownerId = objectId;
      await existingRef.save({ session: dbSession });

      // 2. Create the ClientDocument
      const [doc] = await ClientDocument.create(
        [
          {
            clientId: objectId,
            assetReferenceId: assetRefId,
            documentType: validated.documentType,
            title: validated.title.trim(),
            documentDate: validated.documentDate ? new Date(validated.documentDate) : null,
            expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
            notes: validated.notes?.trim() || null,
            deletedAt: null,
          },
        ],
        { session: dbSession }
      );

      return doc;
    });

    // Populate for response
    const populatedDoc = await ClientDocument.findById(createdDoc._id)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const itemDto = formatClientDocumentItem(
      populatedDoc!,
      populatedDoc!.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      })
    );

    // Record audit log for document creation
    await recordAuditLog({
      req,
      userId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.CLIENT_DOCUMENT,
      entityId: createdDoc._id,
      oldValues: null,
      newValues: createdDoc.toObject(),
      description: `Added document "${itemDto.title}" to client "${client.name}"`,
    });

    const response: ClientDocumentActionResponse = {
      success: true,
      message: `Document "${itemDto.title}" added to client successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response, { status: 201 });
  }
);
