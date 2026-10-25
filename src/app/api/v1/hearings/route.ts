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
import {
  buildFuzzySearchPatterns,
  bucketScoredEntityIds,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  calculateClientMatchScore,
  ClientMatchCandidate,
} from "@/lib/helpers/fuzzy-searching/case-fuzzy-search.helper";
import {
  HearingCaseCandidate,
  HearingCourtCandidate,
  calculateHearingCaseMatchScore,
  calculateHearingCourtMatchScore,
  buildHearingRelevanceStages,
} from "@/lib/helpers/fuzzy-searching/hearing-fuzzy-search.helper";
import { Hearing } from "@/db/models/Hearing.model";
import { Case } from "@/db/models/Case.model";
import { Court } from "@/db/models/Court.model";
import { Client } from "@/db/models/Client.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  HEARING_DEFAULT_PAGE_LIMIT,
  HEARING_PAGE_LIMITS,
  HEARING_SORT_OPTIONS,
  HEARING_STATUSES,
  HEARING_STATUS_LABELS,
  HearingPageLimit,
  HearingSortOption,
  HearingStatus,
} from "@/const/hearing.const";
import { COURT_TYPE_LABELS, COURT_TYPES, CourtType } from "@/const/court.const";
import { createHearingSchema, hearingQueryFilterSchema } from "@/utils/zod/hearing.validation";
import type {
  HearingCaseDto,
  HearingClientDto,
  HearingCourtDto,
  HearingListItemDto,
  HearingDetailDto,
  HearingPaginationResponse,
  HearingStatsDto,
  HearingActionResponse,
  IPopulatedHearingDoc,
  IPopulatedHearingCase,
  IPopulatedHearingClient,
  IPopulatedHearingCourt,
} from "@/types/hearing.types";

/**
 * Safely extracts a string ID from an ObjectId, populated object, or string.
 */
export function extractIdString(val: unknown): string {
  if (!val) return "";
  if (val instanceof mongoose.Types.ObjectId) return val.toString();
  if (typeof val === "object" && "_id" in (val as Record<string, unknown>)) {
    const inner = (val as Record<string, unknown>)._id;
    return inner ? String(inner) : "";
  }
  return String(val);
}

/**
 * Safely converts an arbitrary date representation into an ISO string.
 */
export function formatSafeIsoDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.toISOString();
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/**
 * Synchronize a case's nextHearingDate with the earliest scheduled hearing
 * on or after today that is active (not cancelled or completed).
 */
export async function syncCaseNextHearingDate(
  caseId: mongoose.Types.ObjectId | string,
  dbSession?: mongoose.ClientSession
): Promise<Date | null> {
  const caseObjectId = typeof caseId === "string" ? new mongoose.Types.ObjectId(caseId) : caseId;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const query = Hearing.findOne({
    caseId: caseObjectId,
    hearingDate: { $gte: startOfToday },
    status: { $nin: [HEARING_STATUSES.CANCELLED, HEARING_STATUSES.COMPLETED] },
  })
    .sort({ hearingDate: 1 })
    .select("hearingDate");

  if (dbSession) {
    query.session(dbSession);
  }

  const nextHearing = await query.lean();
  const nextHearingDate = nextHearing?.hearingDate ? new Date(nextHearing.hearingDate) : null;

  const updateQuery = Case.findByIdAndUpdate(
    caseObjectId,
    { nextHearingDate },
    { select: "_id" }
  );
  if (dbSession) {
    updateQuery.session(dbSession);
  }
  await updateQuery;

  return nextHearingDate;
}

/**
 * Format a populated or lean Hearing document into a type-safe HearingListItemDto.
 */
export function formatHearingListItem(
  doc: IPopulatedHearingDoc | Record<string, unknown>,
  fallbackCourtsMap?: Map<string, IPopulatedHearingCourt | Record<string, unknown>>,
  isDeletableOverride?: boolean
): HearingListItemDto {
  const id = extractIdString(doc._id || (doc as { id?: unknown }).id);

  const rawCase =
    doc.caseId && typeof doc.caseId === "object" && "_id" in doc.caseId
      ? (doc.caseId as IPopulatedHearingCase)
      : null;

  const rawClient =
    rawCase?.clientId && typeof rawCase.clientId === "object" && "_id" in rawCase.clientId
      ? (rawCase.clientId as IPopulatedHearingClient)
      : null;

  const rawCourt =
    (doc.courtId && typeof doc.courtId === "object" && "_id" in doc.courtId
      ? (doc.courtId as IPopulatedHearingCourt)
      : null) ||
    (rawCase?.courtId && typeof rawCase.courtId === "object" && "_id" in rawCase.courtId
      ? (rawCase.courtId as IPopulatedHearingCourt)
      : fallbackCourtsMap && rawCase?.courtId
      ? (fallbackCourtsMap.get(extractIdString(rawCase.courtId)) as IPopulatedHearingCourt)
      : null);

  const status = (doc.status as HearingStatus) || HEARING_STATUSES.SCHEDULED;
  const cType = (rawCourt?.courtType as CourtType) || COURT_TYPES.DISTRICT_JUDGE_COURT;

  const caseDto: HearingCaseDto = {
    id: rawCase ? extractIdString(rawCase) : extractIdString(doc.caseId),
    internalReference: rawCase?.internalReference || "N/A",
    caseNumber: rawCase?.caseNumber || null,
    title: rawCase?.title || "Untitled Case",
    caseType: rawCase?.caseType || "CIVIL",
    caseStatus: rawCase?.caseStatus || "ACTIVE",
    priority: rawCase?.priority || "NORMAL",
    filingDate: formatSafeIsoDate(rawCase?.filingDate),
    nextHearingDate: formatSafeIsoDate(rawCase?.nextHearingDate),
  };

  const clientDto: HearingClientDto | null = rawClient
    ? {
        id: extractIdString(rawClient),
        name: rawClient.name || "Unknown Client",
        clientNumber: rawClient.clientNumber || "",
        organizationName: rawClient.organizationName || null,
        clientType: rawClient.clientType || "INDIVIDUAL",
        phone: rawClient.phone || null,
        email: rawClient.email || null,
      }
    : null;

  const courtDto: HearingCourtDto | null = rawCourt
    ? {
        id: extractIdString(rawCourt),
        name: rawCourt.name || "Unknown Court",
        courtType: cType,
        courtTypeLabel: COURT_TYPE_LABELS[cType] || String(rawCourt.courtType || ""),
        district: rawCourt.district || "Sylhet",
        roomOrHall: rawCourt.roomOrHall || null,
        address: rawCourt.address || null,
        presidingJudgeTitle: rawCourt.presidingJudgeTitle || null,
      }
    : null;

  const resolvedCourtId = courtDto
    ? courtDto.id
    : (extractIdString(doc.courtId) || (rawCase?.courtId ? extractIdString(rawCase.courtId) : "") || null);

  const isDeletable =
    isDeletableOverride !== undefined
      ? Boolean(isDeletableOverride)
      : doc.isDeletable !== undefined
      ? Boolean(doc.isDeletable)
      : true;

  return {
    id,
    caseId: caseDto.id,
    case: caseDto,
    client: clientDto,
    courtId: resolvedCourtId,
    court: courtDto,
    hearingDate: formatSafeIsoDate(doc.hearingDate) || new Date().toISOString(),
    startTime: typeof doc.startTime === "string" ? doc.startTime : null,
    hearingType: typeof doc.hearingType === "string" ? doc.hearingType : null,
    purpose: typeof doc.purpose === "string" ? doc.purpose : null,
    outcome: typeof doc.outcome === "string" ? doc.outcome : null,
    nextDate: formatSafeIsoDate(doc.nextDate),
    status,
    statusLabel: HEARING_STATUS_LABELS[status] || status,
    adjournmentReason: typeof doc.adjournmentReason === "string" ? doc.adjournmentReason : null,
    notes: typeof doc.notes === "string" ? doc.notes : null,
    isDeletable,
    createdAt: formatSafeIsoDate(doc.createdAt) || new Date().toISOString(),
    updatedAt: formatSafeIsoDate(doc.updatedAt) || new Date().toISOString(),
  };
}

/**
 * GET /api/v1/hearings
 *
 * Unified endpoint returning paginated hearings, pagination metadata,
 * and live calculated aggregate statistics over the full filtered result set.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const { searchParams } = new URL(req.url);

  // Validate limit parameter if provided
  const rawLimit = searchParams.get("limit");
  if (rawLimit !== null) {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!HEARING_PAGE_LIMITS.includes(parsedLimit as HearingPageLimit)) {
      throw ApiError.badRequest(
        `Invalid page limit "${rawLimit}". Allowed page limits are: ${HEARING_PAGE_LIMITS.join(", ")}`
      );
    }
  }

  // Parse and validate query parameters
  const rawParams = {
    search: sanitizeSearchParam(searchParams.get("search")),
    status: searchParams.get("status") || undefined,
    courtId: searchParams.get("courtId") || undefined,
    caseId: searchParams.get("caseId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    hearingType: searchParams.get("hearingType") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || HEARING_SORT_OPTIONS.UPCOMING_FIRST,
    page: searchParams.get("page") || 1,
    limit: rawLimit ? parseInt(rawLimit, 10) : HEARING_DEFAULT_PAGE_LIMIT,
  };

  const parsed = hearingQueryFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors
    );
  }

  const {
    search,
    status,
    courtId,
    caseId,
    clientId,
    hearingType,
    startDate,
    endDate,
    sort,
    page,
    limit,
  } = parsed.data;

  // Construct MongoDB filter object
  const filter: Record<string, unknown> = {};

  if (status && status !== "ALL") {
    filter.status = status;
  }

  if (courtId && courtId !== "ALL") {
    filter.courtId = new mongoose.Types.ObjectId(courtId);
  }

  if (caseId) {
    filter.caseId = new mongoose.Types.ObjectId(caseId);
  } else if (clientId) {
    // If client filter is supplied, find cases associated with this client
    const clientCases = await Case.find({
      clientId: new mongoose.Types.ObjectId(clientId),
      deletedAt: null,
    })
      .select("_id")
      .lean();
    const caseIds = clientCases.map((c) => c._id);
    filter.caseId = { $in: caseIds };
  }

  if (hearingType && hearingType !== "ALL") {
    filter.hearingType = hearingType;
  }

  // Date Range Filtering on hearingDate
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
    filter.hearingDate = dateQuery;
  }

  // Search Filter: typo-tolerant fuzzy search across hearing fields,
  // case numbers/titles, client names, and court details with relevance-based ranking
  let relevanceStages: mongoose.PipelineStage[] = [];
  let isSearching = false;

  const searchPatterns = buildFuzzySearchPatterns(search);
  if (searchPatterns) {
    isSearching = true;

    // 1. Find matching clients and courts in parallel with bounded limits
    const clientSearchFilter: Record<string, unknown> = {
      deletedAt: null,
      $or: [
        { name: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { clientNumber: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { organizationName: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { phone: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      ],
    };

    if (clientId && clientId !== "ALL") {
      clientSearchFilter._id = new mongoose.Types.ObjectId(clientId);
    }

    const courtSearchFilter: Record<string, unknown> = {
      deletedAt: null,
      $or: [
        { name: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { district: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { roomOrHall: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { presidingJudgeTitle: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { address: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      ],
    };

    if (courtId && courtId !== "ALL") {
      courtSearchFilter._id = new mongoose.Types.ObjectId(courtId);
    }

    const [matchingClients, matchingCourts] = await Promise.all([
      Client.find(clientSearchFilter)
        .select("_id name clientNumber organizationName phone")
        .limit(500)
        .lean<ClientMatchCandidate[]>(),
      Court.find(courtSearchFilter)
        .select("_id name courtType district roomOrHall address presidingJudgeTitle")
        .limit(500)
        .lean<HearingCourtCandidate[]>(),
    ]);

    // Score client candidates
    const clientScores = new Map<string, number>();
    const matchingClientIds: mongoose.Types.ObjectId[] = [];
    for (const cl of matchingClients) {
      const score = calculateClientMatchScore(cl, searchPatterns.sanitizedQuery);
      if (score > 0) {
        clientScores.set(String(cl._id), score);
        matchingClientIds.push(cl._id);
      }
    }

    // Score court candidates
    const courtScores = new Map<string, number>();
    const matchingCourtIds: mongoose.Types.ObjectId[] = [];
    for (const co of matchingCourts) {
      const score = calculateHearingCourtMatchScore(co, searchPatterns.sanitizedQuery);
      if (score > 0) {
        courtScores.set(String(co._id), score);
        matchingCourtIds.push(co._id);
      }
    }

    const courtBuckets = bucketScoredEntityIds(courtScores);

    // 2. Find matching cases (directly or via matched clients / courts)
    const caseSearchConditions: Record<string, unknown>[] = [
      { title: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { caseNumber: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { internalReference: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { description: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { legalIssues: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { opposingCounsel: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { opposingParties: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { caseCategory: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
    ];

    if (matchingClientIds.length > 0) {
      caseSearchConditions.push({ clientId: { $in: matchingClientIds } });
    }

    if (matchingCourtIds.length > 0) {
      caseSearchConditions.push({ courtId: { $in: matchingCourtIds } });
    }

    const caseSearchFilter: Record<string, unknown> = {
      deletedAt: null,
      $or: caseSearchConditions,
    };

    if (caseId && caseId !== "ALL") {
      caseSearchFilter._id = new mongoose.Types.ObjectId(caseId);
    } else if (clientId && clientId !== "ALL") {
      caseSearchFilter.clientId = new mongoose.Types.ObjectId(clientId);
    }

    const matchingCases = await Case.find(caseSearchFilter)
      .select(
        "_id title caseNumber internalReference caseCategory opposingCounsel opposingParties description legalIssues clientId courtId"
      )
      .limit(1000)
      .lean<HearingCaseCandidate[]>();

    const caseScoreMap = new Map<string, number>();
    for (const c of matchingCases) {
      const score = calculateHearingCaseMatchScore(
        c,
        searchPatterns.sanitizedQuery,
        clientScores,
        courtScores
      );
      if (score > 0) {
        caseScoreMap.set(String(c._id), score);
      }
    }

    const caseBuckets = bucketScoredEntityIds(caseScoreMap);

    // 3. Construct hearing-level search conditions
    const directConditions: Record<string, unknown>[] = [
      { purpose: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { outcome: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { notes: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { hearingType: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { adjournmentReason: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
    ];

    if (caseBuckets.allMatchingIds.length > 0) {
      directConditions.push({ caseId: { $in: caseBuckets.allMatchingIds } });
    }

    if (courtBuckets.allMatchingIds.length > 0) {
      directConditions.push({ courtId: { $in: courtBuckets.allMatchingIds } });
    }

    filter.$or = directConditions;

    relevanceStages = buildHearingRelevanceStages(
      caseBuckets,
      courtBuckets,
      searchPatterns
    );
  }

  // Sorting definitions
  const sortMap: Record<HearingSortOption, Record<string, 1 | -1>> = {
    [HEARING_SORT_OPTIONS.UPCOMING_FIRST]: { hearingDate: 1 },
    [HEARING_SORT_OPTIONS.DATE_DESC]: { hearingDate: -1 },
    [HEARING_SORT_OPTIONS.DATE_ASC]: { hearingDate: 1 },
    [HEARING_SORT_OPTIONS.NEWEST_CREATED]: { createdAt: -1 },
    [HEARING_SORT_OPTIONS.OLDEST_CREATED]: { createdAt: 1 },
  };

  const sortOption = sortMap[sort as HearingSortOption] || { hearingDate: 1 };
  const itemsSort: Record<string, 1 | -1> = isSearching
    ? { relevanceScore: -1, ...sortOption, _id: -1 }
    : { ...sortOption, _id: -1 };

  const skip = (page - 1) * limit;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  type RawStatsType = {
    total: number;
    upcoming: number;
    past: number;
    today: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    adjourned: number;
    cancelled: number;
  };

  let rawStats: RawStatsType | undefined;
  let hearings: (IPopulatedHearingDoc | Record<string, unknown>)[] = [];

  const populateOptions = [
    {
      path: "caseId",
      select:
        "_id internalReference caseNumber title caseType caseStatus priority courtId clientId filingDate nextHearingDate",
      populate: [
        {
          path: "clientId",
          select: "_id name clientNumber organizationName clientType phone email",
        },
        {
          path: "courtId",
          select: "_id name courtType district roomOrHall address presidingJudgeTitle",
        },
      ],
    },
    {
      path: "courtId",
      select: "_id name courtType district roomOrHall address presidingJudgeTitle",
    },
  ];

  if (isSearching) {
    // Single consolidated MongoDB aggregation pipeline executing search, scoring, pagination,
    // and live summary statistics
    const pipeline: mongoose.PipelineStage[] = [{ $match: filter }];

    if (relevanceStages.length > 0) {
      pipeline.push(...relevanceStages);
    }

    pipeline.push({
      $facet: {
        items: [
          { $sort: itemsSort },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              caseId: 1,
              courtId: 1,
              hearingDate: 1,
              startTime: 1,
              hearingType: 1,
              purpose: 1,
              outcome: 1,
              nextDate: 1,
              status: 1,
              adjournmentReason: 1,
              notes: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
        stats: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              upcoming: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ["$hearingDate", startOfToday] },
                        { $ne: ["$status", HEARING_STATUSES.CANCELLED] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              past: {
                $sum: {
                  $cond: [{ $lt: ["$hearingDate", startOfToday] }, 1, 0],
                },
              },
              today: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ["$hearingDate", startOfToday] },
                        { $lte: ["$hearingDate", endOfToday] },
                        { $ne: ["$status", HEARING_STATUSES.CANCELLED] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              scheduled: {
                $sum: {
                  $cond: [{ $eq: ["$status", HEARING_STATUSES.SCHEDULED] }, 1, 0],
                },
              },
              inProgress: {
                $sum: {
                  $cond: [{ $eq: ["$status", HEARING_STATUSES.IN_PROGRESS] }, 1, 0],
                },
              },
              completed: {
                $sum: {
                  $cond: [{ $eq: ["$status", HEARING_STATUSES.COMPLETED] }, 1, 0],
                },
              },
              adjourned: {
                $sum: {
                  $cond: [{ $eq: ["$status", HEARING_STATUSES.ADJOURNED] }, 1, 0],
                },
              },
              cancelled: {
                $sum: {
                  $cond: [{ $eq: ["$status", HEARING_STATUSES.CANCELLED] }, 1, 0],
                },
              },
            },
          },
        ],
      },
    });

    const [aggResult] = await Hearing.aggregate<{
      items: (Record<string, unknown> & { _id: mongoose.Types.ObjectId })[];
      stats: RawStatsType[];
    }>(pipeline);

    rawStats = aggResult?.stats?.[0];
    const rawItems = aggResult?.items || [];

    if (rawItems.length > 0) {
      hearings = await Hearing.populate(rawItems, populateOptions);
    } else {
      hearings = [];
    }
  } else {
    // When not searching, preserve existing parallel query execution
    const [statsAggResult, foundHearings] = await Promise.all([
      Hearing.aggregate<RawStatsType>([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            upcoming: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$hearingDate", startOfToday] },
                      { $ne: ["$status", HEARING_STATUSES.CANCELLED] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            past: {
              $sum: {
                $cond: [{ $lt: ["$hearingDate", startOfToday] }, 1, 0],
              },
            },
            today: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$hearingDate", startOfToday] },
                      { $lte: ["$hearingDate", endOfToday] },
                      { $ne: ["$status", HEARING_STATUSES.CANCELLED] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            scheduled: {
              $sum: {
                $cond: [{ $eq: ["$status", HEARING_STATUSES.SCHEDULED] }, 1, 0],
              },
            },
            inProgress: {
              $sum: {
                $cond: [{ $eq: ["$status", HEARING_STATUSES.IN_PROGRESS] }, 1, 0],
              },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", HEARING_STATUSES.COMPLETED] }, 1, 0],
              },
            },
            adjourned: {
              $sum: {
                $cond: [{ $eq: ["$status", HEARING_STATUSES.ADJOURNED] }, 1, 0],
              },
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ["$status", HEARING_STATUSES.CANCELLED] }, 1, 0],
              },
            },
          },
        },
      ]),
      Hearing.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .select(
          "_id caseId courtId hearingDate startTime hearingType purpose outcome nextDate status adjournmentReason notes createdAt updatedAt"
        )
        .populate({
          path: "caseId",
          select:
            "_id internalReference caseNumber title caseType caseStatus priority courtId clientId filingDate nextHearingDate",
          populate: [
            {
              path: "clientId",
              select: "_id name clientNumber organizationName clientType phone email",
            },
            {
              path: "courtId",
              select: "_id name courtType district roomOrHall address presidingJudgeTitle",
            },
          ],
        })
        .populate({
          path: "courtId",
          select: "_id name courtType district roomOrHall address presidingJudgeTitle",
        })
        .lean(),
    ]);

    rawStats = statsAggResult[0];
    hearings = foundHearings;
  }

  const total = rawStats?.total ?? 0;

  // Accurately batch check whether hearings on this page have attached documents
  const hearingIds: mongoose.Types.ObjectId[] = hearings.map(
    (h) => new mongoose.Types.ObjectId(extractIdString(h._id || (h as { id?: unknown }).id))
  );
  const attachedOwnerIds =
    hearingIds.length > 0
      ? await AssetReference.distinct("ownerId", {
          ownerType: ASSET_OWNER_TYPES.HEARING,
          ownerId: { $in: hearingIds },
          deletedAt: null,
        })
      : [];
  const hearingsWithDocsSet = new Set(attachedOwnerIds.map(String));

  const items: HearingListItemDto[] = hearings.map((h) =>
    formatHearingListItem(
      h as unknown as IPopulatedHearingDoc,
      undefined,
      !hearingsWithDocsSet.has(String(h._id))
    )
  );

  const stats: HearingStatsDto = {
    total,
    upcoming: rawStats?.upcoming ?? 0,
    past: rawStats?.past ?? 0,
    today: rawStats?.today ?? 0,
    scheduled: rawStats?.scheduled ?? 0,
    inProgress: rawStats?.inProgress ?? 0,
    completed: rawStats?.completed ?? 0,
    adjourned: rawStats?.adjourned ?? 0,
    cancelled: rawStats?.cancelled ?? 0,
  };

  const response: HearingPaginationResponse = {
    items,
    total,
    page,
    limit: limit as HearingPageLimit,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: page * limit < total,
    stats,
  };

  return NextResponse.json(response);
});

/**
 * POST /api/v1/hearings
 *
 * Create a new hearing inside a database transaction, verifying references,
 * recording audit compliance logging, and updating the associated Case's nextHearingDate.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

  const body = await req.json();
  const validated = createHearingSchema.parse(body);

  // Verify Case exists and is active (select only necessary fields)
  const targetCase = await Case.findOne({
    _id: new mongoose.Types.ObjectId(validated.caseId),
    deletedAt: null,
  }).select("_id courtId title");

  if (!targetCase) {
    throw ApiError.notFound(`Case with ID "${validated.caseId}" does not exist or has been removed.`);
  }

  // Resolve Court ID: default to case's courtId if omitted
  let courtObjectId: mongoose.Types.ObjectId | null = null;
  if (validated.courtId) {
    const courtExists = await Court.exists({
      _id: new mongoose.Types.ObjectId(validated.courtId),
      deletedAt: null,
    });
    if (!courtExists) {
      throw ApiError.notFound(`Court with ID "${validated.courtId}" does not exist or has been removed.`);
    }
    courtObjectId = new mongoose.Types.ObjectId(validated.courtId);
  } else if (targetCase.courtId) {
    courtObjectId = targetCase.courtId as mongoose.Types.ObjectId;
  }

  const hearingDateObj = new Date(validated.hearingDate);
  const nextDateObj = validated.nextDate ? new Date(validated.nextDate) : null;

  // Execute inside transaction
  const createdHearing = await withTransaction(async (dbSession) => {
    const [hearing] = await Hearing.create(
      [
        {
          caseId: targetCase._id,
          courtId: courtObjectId,
          hearingDate: hearingDateObj,
          startTime: validated.startTime?.trim() || null,
          hearingType: validated.hearingType?.trim() || null,
          purpose: validated.purpose?.trim() || null,
          outcome: validated.outcome?.trim() || null,
          nextDate: nextDateObj,
          status: validated.status,
          adjournmentReason: validated.adjournmentReason?.trim() || null,
          notes: validated.notes?.trim() || null,
        },
      ],
      { session: dbSession }
    );

    // Sync case.nextHearingDate
    await syncCaseNextHearingDate(targetCase._id, dbSession);

    // Record audit log for hearing creation with clean sanitized payload
    await recordAuditLog({
      req,
      userId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.HEARING,
      entityId: hearing._id,
      oldValues: null,
      newValues: {
        caseId: targetCase._id,
        courtId: courtObjectId,
        hearingDate: hearingDateObj,
        startTime: validated.startTime?.trim() || null,
        hearingType: validated.hearingType?.trim() || null,
        purpose: validated.purpose?.trim() || null,
        outcome: validated.outcome?.trim() || null,
        nextDate: nextDateObj,
        status: validated.status,
        adjournmentReason: validated.adjournmentReason?.trim() || null,
        notes: validated.notes?.trim() || null,
      },
      description: `Scheduled hearing for case "${targetCase.title}" on ${hearing.hearingDate.toISOString()}`,
      session: dbSession,
    });

    return hearing;
  });

  // Fetch populated hearing detail in a single consolidated query
  const populatedDoc = await Hearing.findById(createdHearing._id)
    .select(
      "_id caseId courtId hearingDate startTime hearingType purpose outcome nextDate status adjournmentReason notes createdAt updatedAt"
    )
    .populate({
      path: "caseId",
      select:
        "_id internalReference caseNumber title caseType caseStatus priority courtId clientId filingDate nextHearingDate",
      populate: [
        {
          path: "clientId",
          select: "_id name clientNumber organizationName clientType phone email",
        },
        {
          path: "courtId",
          select: "_id name courtType district roomOrHall address presidingJudgeTitle",
        },
      ],
    })
    .populate({
      path: "courtId",
      select: "_id name courtType district roomOrHall address presidingJudgeTitle",
    })
    .lean();

  const formattedItem = formatHearingListItem(
    populatedDoc as unknown as IPopulatedHearingDoc,
    undefined,
    true
  );

  const detailDto: HearingDetailDto = {
    ...formattedItem,
    documentsCount: 0,
    isDeletable: true,
  };

  const response: HearingActionResponse = {
    success: true,
    message: `Hearing scheduled successfully for ${new Date(createdHearing.hearingDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}.`,
    data: detailDto,
  };

  return NextResponse.json(response, { status: 201 });
});
