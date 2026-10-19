import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import {
  formatCaseDocumentItem,
  formatClientDocumentItem,
  CASE_POPULATE_SELECT,
  CLIENT_POPULATE_SELECT,
  ASSET_REF_POPULATE_SELECT,
  ASSET_POPULATE_SELECT,
} from "@/lib/helpers/document.helper";
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
  DocumentPageLimit,
  DocumentSortOption,
} from "@/const/document.const";
import { CaseDocumentType } from "@/const/case-document.const";
import { ClientDocumentType } from "@/const/client-document.const";
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

/**
 * GET /api/v1/documents
 *
 * Query unified documents list supporting scope (all | case | client), search,
 * filtering, sorting, and server-side pagination with optimized projections and indexes.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const { searchParams } = new URL(req.url);

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
    limit: searchParams.get("limit") || DOCUMENT_DEFAULT_PAGE_LIMIT,
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

  // Determine query applicability based on scope and entity-specific parameters
  const canSearchCase = scope !== DOCUMENT_SCOPES.CLIENT && !clientId;
  const canSearchClient = scope !== DOCUMENT_SCOPES.CASE && !caseId && isConfidential === undefined;

  // Build Case filter
  const caseFilter: Record<string, unknown> = { deletedAt: null };
  // Build Client filter
  const clientFilter: Record<string, unknown> = { deletedAt: null };

  if (documentType) {
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

  // Handle Search across document attributes and relational entities (bounded & parallelized)
  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      const [matchingCases, matchingClients] = await Promise.all([
        canSearchCase
          ? Case.find({
              $or: [
                { title: searchRegex },
                { caseNumber: searchRegex },
                { internalReference: searchRegex },
              ],
              deletedAt: null,
            })
              .select("_id")
              .limit(100)
              .lean()
          : Promise.resolve([]),
        canSearchClient
          ? Client.find({
              $or: [
                { name: searchRegex },
                { clientNumber: searchRegex },
                { organizationName: searchRegex },
                { phone: searchRegex },
              ],
              deletedAt: null,
            })
              .select("_id")
              .limit(100)
              .lean()
          : Promise.resolve([]),
      ]);

      const matchingCaseIds = matchingCases.map((c) => c._id);
      const matchingClientIds = matchingClients.map((c) => c._id);

      if (canSearchCase) {
        caseFilter.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { exhibitNumber: searchRegex },
          ...(matchingCaseIds.length > 0 ? [{ caseId: { $in: matchingCaseIds } }] : []),
        ];
      }

      if (canSearchClient) {
        clientFilter.$or = [
          { title: searchRegex },
          { notes: searchRegex },
          ...(matchingClientIds.length > 0 ? [{ clientId: { $in: matchingClientIds } }] : []),
        ];
      }
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Compute stats in parallel only for relevant entity scopes
  const [caseStatsAgg, clientStatsAgg] = await Promise.all([
    canSearchCase
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
    canSearchClient
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
  if (scope === DOCUMENT_SCOPES.CASE || (canSearchCase && !canSearchClient)) {
    const total = activeCaseDocs;
    const documents = await CaseDocument.find(caseFilter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate<{ caseId: Record<string, unknown> }>("caseId", CASE_POPULATE_SELECT)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        select: ASSET_REF_POPULATE_SELECT,
        populate: { path: "assetId", select: ASSET_POPULATE_SELECT },
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
  if (scope === DOCUMENT_SCOPES.CLIENT || (canSearchClient && !canSearchCase)) {
    const total = activeClientDocs;
    const documents = await ClientDocument.find(clientFilter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate<{ clientId: Record<string, unknown> }>("clientId", CLIENT_POPULATE_SELECT)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        select: ASSET_REF_POPULATE_SELECT,
        populate: { path: "assetId", select: ASSET_POPULATE_SELECT },
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

  // Scope: ALL (Unified View across both collections using $unionWith with projected fields)
  const total = activeCaseDocs + activeClientDocs;

  // Build aggregation pipeline for unified sorted slice
  const pipeline: mongoose.PipelineStage[] = [
    { $match: caseFilter },
    {
      $project: {
        _id: 1,
        caseId: 1,
        assetReferenceId: 1,
        documentType: 1,
        title: 1,
        documentDate: 1,
        description: 1,
        exhibitNumber: 1,
        isConfidential: 1,
        createdAt: 1,
        updatedAt: 1,
        entityType: { $literal: DOCUMENT_ENTITY_TYPES.CASE },
      },
    },
    {
      $unionWith: {
        coll: COLLECTIONS.CLIENT_DOCUMENTS,
        pipeline: [
          { $match: clientFilter },
          {
            $project: {
              _id: 1,
              clientId: 1,
              assetReferenceId: 1,
              documentType: 1,
              title: 1,
              documentDate: 1,
              expiryDate: 1,
              notes: 1,
              createdAt: 1,
              updatedAt: 1,
              entityType: { $literal: DOCUMENT_ENTITY_TYPES.CLIENT },
            },
          },
        ],
      },
    },
    { $sort: sortOption },
    { $skip: skip },
    { $limit: limit },
  ];

  const rawDocs = await CaseDocument.aggregate(pipeline).allowDiskUse(true);

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

  // Fetch relations in parallel with explicit projections
  const [casesList, clientsList, assetRefsList] = await Promise.all([
    caseIdsToFetch.length > 0
      ? Case.find({ _id: { $in: caseIdsToFetch } })
          .select(CASE_POPULATE_SELECT)
          .lean()
      : [],
    clientIdsToFetch.length > 0
      ? Client.find({ _id: { $in: clientIdsToFetch } })
          .select(CLIENT_POPULATE_SELECT)
          .lean()
      : [],
    assetRefIdsToFetch.length > 0
      ? AssetReference.find({ _id: { $in: assetRefIdsToFetch } })
          .select(ASSET_REF_POPULATE_SELECT)
          .populate<{ assetId: IAsset }>({
            path: "assetId",
            select: ASSET_POPULATE_SELECT,
          })
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
 * Fully transaction-safe with audit logging and deduplication checks.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

  const body = await req.json().catch(() => null);
  if (!body) {
    throw ApiError.badRequest("Invalid or missing JSON request body");
  }

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

  // Prevent attaching the same asset reference to multiple active documents
  const [existingCaseDoc, existingClientDoc] = await Promise.all([
    CaseDocument.findOne({ assetReferenceId: assetRefId, deletedAt: null })
      .select("_id")
      .lean(),
    ClientDocument.findOne({ assetReferenceId: assetRefId, deletedAt: null })
      .select("_id")
      .lean(),
  ]);

  if (existingCaseDoc || existingClientDoc) {
    throw ApiError.conflict(
      "The referenced media file is already attached to an active legal or client document."
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

      // 3. Record compliance audit log
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        entityType: AUDIT_ENTITY_TYPES.CASE_DOCUMENT,
        entityId: doc._id,
        newValues: doc.toObject(),
        description: `Created case document "${doc.title}" for case "${caseDoc.title}"`,
        session: dbSession,
      });

      return doc;
    });

    const populated = await CaseDocument.findById(createdDoc._id)
      .populate<{ caseId: Record<string, unknown> }>("caseId", CASE_POPULATE_SELECT)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        select: ASSET_REF_POPULATE_SELECT,
        populate: { path: "assetId", select: ASSET_POPULATE_SELECT },
      })
      .lean();

    if (!populated) {
      throw ApiError.internal("Failed to retrieve created case document record.");
    }

    const itemDto = formatCaseDocumentItem(
      populated,
      populated.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }),
      populated.caseId as unknown as Record<string, unknown>
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

      // 3. Record compliance audit log
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        entityType: AUDIT_ENTITY_TYPES.CLIENT_DOCUMENT,
        entityId: doc._id,
        newValues: doc.toObject(),
        description: `Created client document "${doc.title}" for client "${client.name}"`,
        session: dbSession,
      });

      return doc;
    });

    const populated = await ClientDocument.findById(createdDoc._id)
      .populate<{ clientId: Record<string, unknown> }>("clientId", CLIENT_POPULATE_SELECT)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        select: ASSET_REF_POPULATE_SELECT,
        populate: { path: "assetId", select: ASSET_POPULATE_SELECT },
      })
      .lean();

    if (!populated) {
      throw ApiError.internal("Failed to retrieve created client document record.");
    }

    const itemDto = formatClientDocumentItem(
      populated,
      populated.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }),
      populated.clientId as unknown as Record<string, unknown>
    );

    const response: DocumentActionResponse = {
      success: true,
      message: `Document "${itemDto.title}" added to client successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response, { status: 201 });
  }
});
