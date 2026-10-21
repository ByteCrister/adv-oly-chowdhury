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
import { sanitizeSearchParam } from "@/lib/helpers/search.helper";
// Ensure models are registered in Mongoose schema cache for nested populate
import "@/db/models/Asset.model";
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
  DocumentEntityType,
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
import {
  buildFuzzySearchPatterns,
  matchDocumentTypes,
  calculateDocumentCaseMatchScore,
  calculateDocumentClientMatchScore,
  buildCaseDocumentRelevanceExpr,
  buildClientDocumentRelevanceExpr,
  bucketScoredEntityIds,
  ScoredEntityBuckets,
  DocumentCaseCandidate,
  DocumentClientCandidate,
} from "@/lib/helpers/fuzzy-searching";

/**
 * Efficiently batch-populates Case, Client, and AssetReference relations and formats items.
 */
async function populateAndFormatDocuments(
  rawDocs: Array<Record<string, unknown> & { entityType?: DocumentEntityType }>
): Promise<UnifiedDocumentItemDto[]> {
  const caseIdsToFetch: mongoose.Types.ObjectId[] = [];
  const clientIdsToFetch: mongoose.Types.ObjectId[] = [];
  const assetRefIdsToFetch: mongoose.Types.ObjectId[] = [];

  for (const doc of rawDocs) {
    if (doc.entityType === DOCUMENT_ENTITY_TYPES.CASE && doc.caseId) {
      caseIdsToFetch.push(new mongoose.Types.ObjectId(String(doc.caseId)));
    }
    if (doc.entityType === DOCUMENT_ENTITY_TYPES.CLIENT && doc.clientId) {
      clientIdsToFetch.push(new mongoose.Types.ObjectId(String(doc.clientId)));
    }
    if (doc.assetReferenceId) {
      assetRefIdsToFetch.push(new mongoose.Types.ObjectId(String(doc.assetReferenceId)));
    }
  }

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

  return rawDocs.map((doc) => {
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
}

/**
 * GET /api/v1/documents
 *
 * Query unified documents list supporting scope (all | case | client), typo-tolerant
 * fuzzy search, relevance-based ranking, filtering, sorting, and server-side pagination.
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

  // Typo-tolerant fuzzy search across document attributes, case metadata, client info,
  // document types, exhibit numbers, and descriptions with relevance ranking
  let isSearching = false;
  let caseRelevanceExpr: Record<string, unknown> = { $literal: 0 };
  let clientRelevanceExpr: Record<string, unknown> = { $literal: 0 };

  const searchPatterns = buildFuzzySearchPatterns(search);
  if (searchPatterns) {
    isSearching = true;

    // 1. Evaluate whether query matches Case or Client document types / labels / aliases
    const { matchedCaseDocTypes, matchedClientDocTypes } = matchDocumentTypes(
      searchPatterns.sanitizedQuery
    );

    // 2. Find matching clients with bounded candidate limits (only if client search is eligible)
    let clientBuckets: ScoredEntityBuckets = {
      tier1Ids: [],
      tier2Ids: [],
      tier3Ids: [],
      tier4Ids: [],
      tier5Ids: [],
      allMatchingIds: [],
    };
    const clientScores = new Map<string, number>();

    if (canSearchClient) {
      const clientSearchFilter: Record<string, unknown> = {
        deletedAt: null,
        $or: [
          { name: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
          { clientNumber: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
          { organizationName: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
          { phone: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
          { alternatePhone: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
          { email: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
          { nationalId: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        ],
      };

      if (clientId) {
        clientSearchFilter._id = new mongoose.Types.ObjectId(clientId);
      }

      const matchingClients = await Client.find(clientSearchFilter, {
        _id: 1,
        name: 1,
        clientNumber: 1,
        organizationName: 1,
        phone: 1,
        alternatePhone: 1,
        email: 1,
        nationalId: 1,
      })
        .limit(1000)
        .lean<DocumentClientCandidate[]>();

      for (const cl of matchingClients) {
        const score = calculateDocumentClientMatchScore(cl, searchPatterns.sanitizedQuery);
        if (score > 0) {
          clientScores.set(String(cl._id), score);
        }
      }

      clientBuckets = bucketScoredEntityIds(clientScores);
    }

    // 3. Find matching cases (only if case search is eligible)
    let caseBuckets: ScoredEntityBuckets = {
      tier1Ids: [],
      tier2Ids: [],
      tier3Ids: [],
      tier4Ids: [],
      tier5Ids: [],
      allMatchingIds: [],
    };
    let inheritedClientCaseBuckets: ScoredEntityBuckets = {
      tier1Ids: [],
      tier2Ids: [],
      tier3Ids: [],
      tier4Ids: [],
      tier5Ids: [],
      allMatchingIds: [],
    };

    if (canSearchCase) {
      const caseSearchConditions: Record<string, unknown>[] = [
        { title: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { caseNumber: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { internalReference: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { caseCategory: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { opposingCounsel: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { opposingParties: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { description: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { legalIssues: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      ];

      if (clientBuckets.allMatchingIds.length > 0) {
        caseSearchConditions.push({ clientId: { $in: clientBuckets.allMatchingIds } });
      }

      const caseSearchFilter: Record<string, unknown> = {
        deletedAt: null,
        $or: caseSearchConditions,
      };

      if (caseId) {
        caseSearchFilter._id = new mongoose.Types.ObjectId(caseId);
      }

      const matchingCases = await Case.find(caseSearchFilter, {
        _id: 1,
        title: 1,
        caseNumber: 1,
        internalReference: 1,
        caseCategory: 1,
        opposingCounsel: 1,
        opposingParties: 1,
        description: 1,
        legalIssues: 1,
        clientId: 1,
      })
        .limit(1000)
        .lean<DocumentCaseCandidate[]>();

      const caseDirectScoreMap = new Map<string, number>();
      const caseInheritedClientScoreMap = new Map<string, number>();

      for (const c of matchingCases) {
        const scores = calculateDocumentCaseMatchScore(
          c,
          searchPatterns.sanitizedQuery,
          clientScores
        );
        if (scores.directScore > 0) {
          caseDirectScoreMap.set(String(c._id), scores.directScore);
        }
        if (scores.clientScore > 0) {
          caseInheritedClientScoreMap.set(String(c._id), scores.clientScore);
        }
      }

      caseBuckets = bucketScoredEntityIds(caseDirectScoreMap);
      inheritedClientCaseBuckets = bucketScoredEntityIds(caseInheritedClientScoreMap);
    }

    // 4. Construct direct search conditions on case and client filters
    if (canSearchCase) {
      const allRelevantCaseIds = [
        ...caseBuckets.allMatchingIds,
        ...inheritedClientCaseBuckets.allMatchingIds,
      ];
      const caseSearchOrConditions: Record<string, unknown>[] = [
        { title: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { description: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { exhibitNumber: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      ];
      if (matchedCaseDocTypes.length > 0) {
        caseSearchOrConditions.push({
          documentType: { $in: matchedCaseDocTypes.map((d) => d.type) },
        });
      }
      if (allRelevantCaseIds.length > 0) {
        caseSearchOrConditions.push({ caseId: { $in: allRelevantCaseIds } });
      }
      caseFilter.$or = caseSearchOrConditions;
    }

    if (canSearchClient) {
      const clientSearchOrConditions: Record<string, unknown>[] = [
        { title: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { notes: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      ];
      if (matchedClientDocTypes.length > 0) {
        clientSearchOrConditions.push({
          documentType: { $in: matchedClientDocTypes.map((d) => d.type) },
        });
      }
      if (clientBuckets.allMatchingIds.length > 0) {
        clientSearchOrConditions.push({ clientId: { $in: clientBuckets.allMatchingIds } });
      }
      clientFilter.$or = clientSearchOrConditions;
    }

    // 5. Pre-build dynamic relevance scoring expressions for MongoDB aggregation
    caseRelevanceExpr = buildCaseDocumentRelevanceExpr(
      caseBuckets,
      inheritedClientCaseBuckets,
      searchPatterns,
      matchedCaseDocTypes
    );
    clientRelevanceExpr = buildClientDocumentRelevanceExpr(
      clientBuckets,
      searchPatterns,
      matchedClientDocTypes
    );
  }

  // Deterministic tie-breaker direction matching primary sort order
  const tieBreakerDirection: 1 | -1 =
    sort === DOCUMENT_SORT_OPTIONS.OLDEST ||
    sort === DOCUMENT_SORT_OPTIONS.TITLE_ASC ||
    sort === DOCUMENT_SORT_OPTIONS.DATE_ASC
      ? 1
      : -1;

  const itemsSort: Record<string, 1 | -1> = isSearching
    ? { relevanceScore: -1, ...sortOption, _id: tieBreakerDirection }
    : { ...sortOption, _id: tieBreakerDirection };

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

    let items: UnifiedDocumentItemDto[];
    if (isSearching) {
      const caseItemsPipeline: mongoose.PipelineStage[] = [
        { $match: caseFilter },
        { $addFields: { relevanceScore: caseRelevanceExpr } },
        { $match: { relevanceScore: { $gt: 0 } } },
        { $sort: itemsSort },
        { $skip: skip },
        { $limit: limit },
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
            relevanceScore: 1,
          },
        },
      ];

      const rawDocs = await CaseDocument.aggregate<
        Record<string, unknown> & { entityType: DocumentEntityType }
      >(caseItemsPipeline).allowDiskUse(true);

      items = await populateAndFormatDocuments(rawDocs);
    } else {
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

      items = documents.map((doc) => {
        const caseInfo = doc.caseId as unknown as Record<string, unknown>;
        const assetRef = doc.assetReferenceId as unknown as (IAssetReferenceDocument & {
          assetId: IAsset;
        });
        return formatCaseDocumentItem(doc, assetRef, caseInfo);
      });
    }

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

    let items: UnifiedDocumentItemDto[];
    if (isSearching) {
      const clientItemsPipeline: mongoose.PipelineStage[] = [
        { $match: clientFilter },
        { $addFields: { relevanceScore: clientRelevanceExpr } },
        { $match: { relevanceScore: { $gt: 0 } } },
        { $sort: itemsSort },
        { $skip: skip },
        { $limit: limit },
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
            relevanceScore: 1,
          },
        },
      ];

      const rawDocs = await ClientDocument.aggregate<
        Record<string, unknown> & { entityType: DocumentEntityType }
      >(clientItemsPipeline).allowDiskUse(true);

      items = await populateAndFormatDocuments(rawDocs);
    } else {
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

      items = documents.map((doc) => {
        const clientInfo = doc.clientId as unknown as Record<string, unknown>;
        const assetRef = doc.assetReferenceId as unknown as (IAssetReferenceDocument & {
          assetId: IAsset;
        });
        return formatClientDocumentItem(doc, assetRef, clientInfo);
      });
    }

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
    ...(isSearching ? [{ $addFields: { relevanceScore: caseRelevanceExpr } }] : []),
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
        ...(isSearching ? { relevanceScore: 1 } : {}),
      },
    },
    {
      $unionWith: {
        coll: COLLECTIONS.CLIENT_DOCUMENTS,
        pipeline: [
          { $match: clientFilter },
          ...(isSearching ? [{ $addFields: { relevanceScore: clientRelevanceExpr } }] : []),
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
              ...(isSearching ? { relevanceScore: 1 } : {}),
            },
          },
        ],
      },
    },
    ...(isSearching ? [{ $match: { relevanceScore: { $gt: 0 } } }] : []),
    { $sort: itemsSort },
    { $skip: skip },
    { $limit: limit },
  ];

  const rawDocs = await CaseDocument.aggregate<
    Record<string, unknown> & { entityType: DocumentEntityType }
  >(pipeline).allowDiskUse(true);

  const items = await populateAndFormatDocuments(rawDocs);

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
