import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import { Case } from "@/db/models/Case.model";
import { Client } from "@/db/models/Client.model";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { COLLECTIONS } from "@/const/collection.const";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  DOCUMENT_SCOPES,
  DOCUMENT_ENTITY_TYPES,
  DOCUMENT_SORT_OPTIONS,
  DOCUMENT_DEFAULT_PAGE_LIMIT,
  DOCUMENT_PAGE_LIMITS,
  DocumentPageLimit,
  DocumentSortOption,
} from "@/const/document.const";
import {
  CASE_DOCUMENT_TYPE_LABELS,
  CaseDocumentType,
} from "@/const/case-document.const";
import {
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentType,
} from "@/const/client-document.const";
import {
  documentQueryFilterSchema,
  createUnifiedDocumentSchema,
} from "@/utils/zod/document.validation";
import type {
  UnifiedDocumentItemDto,
  DocumentPaginationResponse,
  DocumentActionResponse,
  DocumentStatsDto,
} from "@/types/document.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";
import ConnectDB from "@/db";

/**
 * Format a CaseDocument record into UnifiedDocumentItemDto.
 */
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
    // Case-specific fields
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

/**
 * Format a ClientDocument record into UnifiedDocumentItemDto.
 */
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
    // Client-specific fields
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
 * GET /api/v1/documents
 *
 * Query unified documents list supporting scope (all | case | client), search,
 * filtering, sorting, and server-side pagination.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  await ConnectDB();

  const { searchParams } = new URL(req.url);

  const rawLimit = searchParams.get("limit");
  if (rawLimit !== null) {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!DOCUMENT_PAGE_LIMITS.includes(parsedLimit as DocumentPageLimit)) {
      throw ApiError.badRequest(
        `Invalid page limit "${rawLimit}". Allowed page limits are: ${DOCUMENT_PAGE_LIMITS.join(", ")}`
      );
    }
  }

  const rawParams = {
    scope: searchParams.get("scope") || DOCUMENT_SCOPES.ALL,
    search: sanitizeSearchParam(searchParams.get("search")),
    documentType: searchParams.get("documentType") || undefined,
    caseId: searchParams.get("caseId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    isConfidential: searchParams.get("isConfidential") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || DOCUMENT_SORT_OPTIONS.NEWEST,
    page: searchParams.get("page") || 1,
    limit: rawLimit ? parseInt(rawLimit, 10) : DOCUMENT_DEFAULT_PAGE_LIMIT,
  };

  const parsed = documentQueryFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
  }

  const {
    scope,
    search,
    documentType,
    caseId,
    clientId,
    isConfidential,
    startDate,
    endDate,
    sort,
    page,
    limit,
  } = parsed.data;

  // Sorting definition
  const sortMap: Record<DocumentSortOption, Record<string, 1 | -1>> = {
    [DOCUMENT_SORT_OPTIONS.NEWEST]: { createdAt: -1 },
    [DOCUMENT_SORT_OPTIONS.OLDEST]: { createdAt: 1 },
    [DOCUMENT_SORT_OPTIONS.TITLE_ASC]: { title: 1 },
    [DOCUMENT_SORT_OPTIONS.TITLE_DESC]: { title: -1 },
    [DOCUMENT_SORT_OPTIONS.DATE_DESC]: { documentDate: -1, createdAt: -1 },
    [DOCUMENT_SORT_OPTIONS.DATE_ASC]: { documentDate: 1, createdAt: 1 },
  };
  const sortOption = sortMap[sort as DocumentSortOption] || { createdAt: -1 };
  const skip = (page - 1) * limit;

  // Build Case filter
  const caseFilter: Record<string, unknown> = { deletedAt: null };
  // Build Client filter
  const clientFilter: Record<string, unknown> = { deletedAt: null };

  if (documentType && documentType !== "ALL") {
    caseFilter.documentType = documentType;
    clientFilter.documentType = documentType;
  }

  if (caseId) {
    caseFilter.caseId = new mongoose.Types.ObjectId(caseId);
  }

  if (clientId) {
    clientFilter.clientId = new mongoose.Types.ObjectId(clientId);
  }

  if (isConfidential !== undefined) {
    caseFilter.isConfidential = isConfidential;
  }

  if (startDate || endDate) {
    const dateQuery: Record<string, Date> = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    caseFilter.documentDate = dateQuery;
    clientFilter.documentDate = dateQuery;
  }

  // Handle Search across document attributes and relational entities
  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      // Find matching cases
      const matchingCases = await Case.find({
        $or: [
          { title: searchRegex },
          { caseNumber: searchRegex },
          { internalReference: searchRegex },
        ],
        deletedAt: null,
      })
        .select("_id")
        .lean();
      const matchingCaseIds = matchingCases.map((c) => c._id);

      // Find matching clients
      const matchingClients = await Client.find({
        $or: [
          { name: searchRegex },
          { clientNumber: searchRegex },
          { organizationName: searchRegex },
          { phone: searchRegex },
        ],
        deletedAt: null,
      })
        .select("_id")
        .lean();
      const matchingClientIds = matchingClients.map((c) => c._id);

      caseFilter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { exhibitNumber: searchRegex },
        ...(matchingCaseIds.length > 0 ? [{ caseId: { $in: matchingCaseIds } }] : []),
      ];

      clientFilter.$or = [
        { title: searchRegex },
        { notes: searchRegex },
        ...(matchingClientIds.length > 0 ? [{ clientId: { $in: matchingClientIds } }] : []),
      ];
    }
  }

  const searchOnlyCase = Boolean(caseId || isConfidential !== undefined);
  const searchOnlyClient = Boolean(clientId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Compute stats across both collections matching active filters
  const [caseStatsAgg, clientStatsAgg] = await Promise.all([
    !searchOnlyClient
      ? CaseDocument.aggregate<{
          total: number;
          recent: number;
          confidential: number;
        }>([
          { $match: caseFilter },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              recent: {
                $sum: {
                  $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, 1, 0],
                },
              },
              confidential: {
                $sum: {
                  $cond: [{ $eq: ["$isConfidential", true] }, 1, 0],
                },
              },
            },
          },
        ])
      : Promise.resolve([]),
    !searchOnlyCase
      ? ClientDocument.aggregate<{
          total: number;
          recent: number;
        }>([
          { $match: clientFilter },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              recent: {
                $sum: {
                  $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, 1, 0],
                },
              },
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  const activeCaseDocs = caseStatsAgg[0]?.total ?? 0;
  const recentCaseDocs = caseStatsAgg[0]?.recent ?? 0;
  const confidentialCount = caseStatsAgg[0]?.confidential ?? 0;

  const activeClientDocs = clientStatsAgg[0]?.total ?? 0;
  const recentClientDocs = clientStatsAgg[0]?.recent ?? 0;

  const stats: DocumentStatsDto = {
    totalActive: activeCaseDocs + activeClientDocs,
    activeCaseDocs,
    activeClientDocs,
    recentCount: recentCaseDocs + recentClientDocs,
    confidentialCount,
  };

  // Scope: CASE ONLY
  if (scope === DOCUMENT_SCOPES.CASE) {
    const total = activeCaseDocs;
    const documents = await CaseDocument.find(caseFilter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate<{ caseId: Record<string, unknown> }>("caseId", "title caseNumber internalReference caseStatus")
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const items: UnifiedDocumentItemDto[] = documents.map((doc) => {
      const caseInfo = doc.caseId as unknown as Record<string, unknown>;
      const assetRef = doc.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      });
      return formatCaseDocumentItem(doc, assetRef, caseInfo);
    });

    const response: DocumentPaginationResponse = {
      items,
      total,
      page,
      limit: limit as DocumentPageLimit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
      stats,
    };

    return NextResponse.json(response);
  }

  // Scope: CLIENT ONLY
  if (scope === DOCUMENT_SCOPES.CLIENT) {
    const total = activeClientDocs;
    const documents = await ClientDocument.find(clientFilter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate<{ clientId: Record<string, unknown> }>("clientId", "name clientNumber organizationName phone")
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const items: UnifiedDocumentItemDto[] = documents.map((doc) => {
      const clientInfo = doc.clientId as unknown as Record<string, unknown>;
      const assetRef = doc.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      });
      return formatClientDocumentItem(doc, assetRef, clientInfo);
    });

    const response: DocumentPaginationResponse = {
      items,
      total,
      page,
      limit: limit as DocumentPageLimit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
      stats,
    };

    return NextResponse.json(response);
  }

  // Scope: ALL (Unified View across both collections using $unionWith)
  const total = activeCaseDocs + activeClientDocs;

  // Build aggregation pipeline for unified sorted slice
  const pipeline: mongoose.PipelineStage[] = [];

  if (searchOnlyClient) {
    pipeline.push({ $match: clientFilter });
    pipeline.push({ $addFields: { entityType: DOCUMENT_ENTITY_TYPES.CLIENT } });
  } else {
    pipeline.push({ $match: caseFilter });
    pipeline.push({ $addFields: { entityType: DOCUMENT_ENTITY_TYPES.CASE } });

    if (!searchOnlyCase) {
      pipeline.push({
        $unionWith: {
          coll: COLLECTIONS.CLIENT_DOCUMENTS,
          pipeline: [
            { $match: clientFilter },
            { $addFields: { entityType: DOCUMENT_ENTITY_TYPES.CLIENT } },
          ],
        },
      });
    }
  }

  pipeline.push({ $sort: sortOption });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  const rawDocs = searchOnlyClient
    ? await ClientDocument.aggregate(pipeline)
    : await CaseDocument.aggregate(pipeline);

  // Extract relational IDs for efficient batch population
  const caseIdsToFetch: mongoose.Types.ObjectId[] = [];
  const clientIdsToFetch: mongoose.Types.ObjectId[] = [];
  const assetRefIdsToFetch: mongoose.Types.ObjectId[] = [];

  for (const doc of rawDocs) {
    if (doc.entityType === DOCUMENT_ENTITY_TYPES.CASE && doc.caseId) {
      caseIdsToFetch.push(new mongoose.Types.ObjectId(doc.caseId));
    }
    if (doc.entityType === DOCUMENT_ENTITY_TYPES.CLIENT && doc.clientId) {
      clientIdsToFetch.push(new mongoose.Types.ObjectId(doc.clientId));
    }
    if (doc.assetReferenceId) {
      assetRefIdsToFetch.push(new mongoose.Types.ObjectId(doc.assetReferenceId));
    }
  }

  // Fetch relations in parallel
  const [casesList, clientsList, assetRefsList] = await Promise.all([
    caseIdsToFetch.length > 0
      ? Case.find({ _id: { $in: caseIdsToFetch } })
          .select("_id title caseNumber internalReference caseStatus")
          .lean()
      : [],
    clientIdsToFetch.length > 0
      ? Client.find({ _id: { $in: clientIdsToFetch } })
          .select("_id name clientNumber organizationName phone")
          .lean()
      : [],
    assetRefIdsToFetch.length > 0
      ? AssetReference.find({ _id: { $in: assetRefIdsToFetch } })
          .populate<{ assetId: IAsset }>("assetId")
          .lean()
      : [],
  ]);

  const caseMap = new Map<string, Record<string, unknown>>();
  for (const c of casesList) {
    caseMap.set(c._id.toString(), c as unknown as Record<string, unknown>);
  }

  const clientMap = new Map<string, Record<string, unknown>>();
  for (const cl of clientsList) {
    clientMap.set(cl._id.toString(), cl as unknown as Record<string, unknown>);
  }

  const assetRefMap = new Map<
    string,
    IAssetReferenceDocument & { assetId: IAsset }
  >();
  for (const ar of assetRefsList) {
    assetRefMap.set(
      ar._id.toString(),
      ar as unknown as IAssetReferenceDocument & { assetId: IAsset }
    );
  }

  const items: UnifiedDocumentItemDto[] = rawDocs.map((doc) => {
    const assetRef = doc.assetReferenceId
      ? assetRefMap.get(doc.assetReferenceId.toString())
      : null;

    if (doc.entityType === DOCUMENT_ENTITY_TYPES.CASE) {
      const caseInfo = doc.caseId ? caseMap.get(doc.caseId.toString()) : null;
      return formatCaseDocumentItem(doc, assetRef, caseInfo);
    } else {
      const clientInfo = doc.clientId ? clientMap.get(doc.clientId.toString()) : null;
      return formatClientDocumentItem(doc, assetRef, clientInfo);
    }
  });

  const response: DocumentPaginationResponse = {
    items,
    total,
    page,
    limit: limit as DocumentPageLimit,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: page * limit < total,
    stats,
  };

  return NextResponse.json(response);
});

/**
 * POST /api/v1/documents
 *
 * Unified document creation endpoint.
 * Accepts either a Case Document or a Client Document payload.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  await ConnectDB();

  const body = await req.json();
  const validated = createUnifiedDocumentSchema.parse(body);

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

  if (validated.entityType === DOCUMENT_ENTITY_TYPES.CASE) {
    const caseObjectId = new mongoose.Types.ObjectId(validated.caseId);
    const caseDoc = await Case.findOne({ _id: caseObjectId, deletedAt: null });
    if (!caseDoc) {
      throw ApiError.notFound("Case record not found or has been deleted.");
    }

    const createdDoc = await withTransaction(async (dbSession) => {
      // 1. Ensure AssetReference is linked to this case
      existingRef.ownerType = ASSET_OWNER_TYPES.CASE;
      existingRef.ownerId = caseObjectId;
      await existingRef.save({ session: dbSession });

      // 2. Create CaseDocument record
      const doc = new CaseDocument({
        caseId: caseObjectId,
        assetReferenceId: assetRefId,
        documentType: validated.documentType as CaseDocumentType,
        title: validated.title.trim(),
        documentDate: validated.documentDate ? new Date(validated.documentDate) : null,
        description: validated.description?.trim() || null,
        exhibitNumber: validated.exhibitNumber?.trim() || null,
        isConfidential: Boolean(validated.isConfidential),
      });
      await doc.save({ session: dbSession });

      return doc;
    });

    const populated = await CaseDocument.findById(createdDoc._id)
      .populate<{ caseId: Record<string, unknown> }>("caseId", "title caseNumber internalReference caseStatus")
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const itemDto = formatCaseDocumentItem(
      populated!,
      populated!.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }),
      populated!.caseId as unknown as Record<string, unknown>
    );

    const response: DocumentActionResponse = {
      success: true,
      message: `Legal document "${itemDto.title}" added to case successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response, { status: 201 });
  } else {
    // CLIENT DOCUMENT
    const clientObjectId = new mongoose.Types.ObjectId(validated.clientId);
    const client = await Client.findOne({ _id: clientObjectId, deletedAt: null });
    if (!client) {
      throw ApiError.notFound("Client record not found or has been deleted.");
    }

    const createdDoc = await withTransaction(async (dbSession) => {
      // 1. Ensure AssetReference is linked to this client
      existingRef.ownerType = ASSET_OWNER_TYPES.CLIENT;
      existingRef.ownerId = clientObjectId;
      await existingRef.save({ session: dbSession });

      // 2. Create ClientDocument record
      const doc = new ClientDocument({
        clientId: clientObjectId,
        assetReferenceId: assetRefId,
        documentType: validated.documentType as ClientDocumentType,
        title: validated.title.trim(),
        documentDate: validated.documentDate ? new Date(validated.documentDate) : null,
        expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
        notes: validated.notes?.trim() || null,
      });
      await doc.save({ session: dbSession });

      return doc;
    });

    const populated = await ClientDocument.findById(createdDoc._id)
      .populate<{ clientId: Record<string, unknown> }>("clientId", "name clientNumber organizationName phone")
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const itemDto = formatClientDocumentItem(
      populated!,
      populated!.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }),
      populated!.clientId as unknown as Record<string, unknown>
    );

    const response: DocumentActionResponse = {
      success: true,
      message: `Document "${itemDto.title}" added to client successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response, { status: 201 });
  }
});
