import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, escapeRegex } from "@/lib/helpers/search.helper";
import {
  buildFuzzySearchPatterns,
  matchCourtTypeAndStatus,
  buildCourtRelevanceStages,
} from "@/lib/helpers/fuzzy-searching/court-fuzzy-search.helper";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import { Court } from "@/db/models/Court.model";
import { Case } from "@/db/models/Case.model";
import { Hearing } from "@/db/models/Hearing.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import {
  COURT_DEFAULT_PAGE_LIMIT,
  COURT_PAGE_LIMITS,
  COURT_SORT_OPTIONS,
  COURT_TYPES,
  COURT_TYPE_LABELS,
  CourtPageLimit,
  CourtSortOption,
  CourtType,
} from "@/const/court.const";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import { createCourtSchema, courtQueryFilterSchema } from "@/utils/zod/court.validation";
import type {
  CourtDocInput,
  CourtListItemDto,
  CourtPaginationResponse,
  CourtActionResponse,
} from "@/types/court.types";

/**
 * Format a Court document or lean object into a strongly-typed CourtListItemDto.
 * Safely converts ObjectId strings, dates, and relation counters.
 */
export function formatCourtItem(
  court: CourtDocInput,
  counts?: { cases?: number; hearings?: number; assets?: number }
): CourtListItemDto {
  const cType = (court.courtType as CourtType) || COURT_TYPES.DISTRICT_JUDGE_COURT;
  const cases = counts?.cases ?? 0;
  const hearings = counts?.hearings ?? 0;
  const assets = counts?.assets ?? 0;

  const id = court._id ? String(court._id) : court.id ? String(court.id) : "";
  const createdAtStr = court.createdAt
    ? new Date(court.createdAt).toISOString()
    : new Date().toISOString();
  const updatedAtStr = court.updatedAt
    ? new Date(court.updatedAt).toISOString()
    : createdAtStr;

  return {
    id,
    name: court.name || "Unnamed Court",
    courtType: cType,
    courtTypeLabel: COURT_TYPE_LABELS[cType] || String(court.courtType || ""),
    district: court.district || "Sylhet",
    division: court.division || null,
    roomOrHall: court.roomOrHall || null,
    address: court.address || null,
    presidingJudgeTitle: court.presidingJudgeTitle || null,
    isActive: court.isActive !== undefined && court.isActive !== null ? Boolean(court.isActive) : true,
    totalCases: cases,
    totalHearings: hearings,
    totalAssets: assets,
    isDeletable: cases === 0 && hearings === 0 && assets === 0,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  };
}

/**
 * GET /api/v1/courts
 *
 * Paginated list of courts with search, sorting, filtering, and date range.
 * Includes complete court information and relation counts (cases, hearings, assets),
 * making separate single-record GET requests unnecessary.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const { searchParams } = new URL(req.url);

  // Validate limit parameter against COURT_PAGE_LIMITS if provided
  const rawLimit = searchParams.get("limit");
  if (rawLimit !== null) {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!COURT_PAGE_LIMITS.includes(parsedLimit as CourtPageLimit)) {
      throw ApiError.badRequest(
        `Invalid page limit "${rawLimit}". Allowed page limits are: ${COURT_PAGE_LIMITS.join(", ")}`
      );
    }
  }

  // Parse and validate query parameters
  const rawParams = {
    search: sanitizeSearchParam(searchParams.get("search")),
    courtType: searchParams.get("courtType") || undefined,
    district: searchParams.get("district") || undefined,
    division: searchParams.get("division") || undefined,
    isActive: searchParams.get("isActive") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || COURT_SORT_OPTIONS.NEWEST,
    page: searchParams.get("page") || 1,
    limit: rawLimit ? parseInt(rawLimit, 10) : COURT_DEFAULT_PAGE_LIMIT,
  };

  const parsed = courtQueryFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
  }

  const { search, courtType, district, division, isActive, startDate, endDate, sort, page, limit } =
    parsed.data;

  // Build MongoDB query filter
  const filter: Record<string, unknown> = {
    deletedAt: null,
  };

  if (courtType && courtType !== "ALL") {
    filter.courtType = courtType;
  }

  if (district && district !== "ALL") {
    filter.district = { $regex: new RegExp(`^${escapeRegex(district.trim())}$`, "i") };
  }

  if (division && division !== "ALL") {
    filter.division = { $regex: new RegExp(`^${escapeRegex(division.trim())}$`, "i") };
  }

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  // Date Range Filtering on createdAt
  if (startDate || endDate) {
    const dateQuery: Record<string, Date> = {};
    if (startDate) {
      dateQuery.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      // Ensure the end date covers until the last millisecond of the day
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    filter.createdAt = dateQuery;
  }

  // Search Filter: typo-tolerant fuzzy search across court fields
  // (name, courtType, district, division, roomOrHall, address, presidingJudgeTitle, isActive)
  // with relevance-based ranking
  let relevanceStages: mongoose.PipelineStage[] = [];
  let isSearching = false;

  const searchPatterns = buildFuzzySearchPatterns(search);
  if (searchPatterns) {
    isSearching = true;

    // 1. Evaluate whether query matches courtType labels/abbreviations or active status
    const { matchedCourtTypes, matchedIsActive, isActiveScore } =
      matchCourtTypeAndStatus(searchPatterns.sanitizedQuery);

    // 2. Candidate conditions for direct court search
    const directConditions: Record<string, unknown>[] = [
      { name: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { district: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { division: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { roomOrHall: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { address: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { presidingJudgeTitle: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { courtType: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
    ];

    if (matchedCourtTypes.length > 0) {
      directConditions.push({
        courtType: { $in: matchedCourtTypes.map((m) => m.courtType) },
      });
    }

    if (matchedIsActive !== null && filter.isActive === undefined) {
      directConditions.push({
        isActive: matchedIsActive,
      });
    }

    filter.$or = directConditions;

    relevanceStages = buildCourtRelevanceStages(
      searchPatterns,
      matchedCourtTypes,
      matchedIsActive,
      isActiveScore
    );
  }

  // Determine sorting
  const sortMap: Record<CourtSortOption, Record<string, 1 | -1>> = {
    [COURT_SORT_OPTIONS.NEWEST]: { createdAt: -1 },
    [COURT_SORT_OPTIONS.OLDEST]: { createdAt: 1 },
    [COURT_SORT_OPTIONS.NAME_ASC]: { name: 1 },
    [COURT_SORT_OPTIONS.NAME_DESC]: { name: -1 },
    [COURT_SORT_OPTIONS.TYPE_ASC]: { courtType: 1 },
    [COURT_SORT_OPTIONS.TYPE_DESC]: { courtType: -1 },
  };

  const sortOption = sortMap[sort as CourtSortOption] || { createdAt: -1 };
  const skip = (page - 1) * limit;

  let total = 0;
  let courts: CourtDocInput[] = [];

  if (isSearching) {
    const itemsSort: Record<string, 1 | -1> = {
      relevanceScore: -1,
      ...sortOption,
      _id: -1,
    };

    const pipeline: mongoose.PipelineStage[] = [{ $match: filter }];
    if (relevanceStages.length > 0) {
      pipeline.push(...relevanceStages);
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        items: [
          { $sort: itemsSort },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              name: 1,
              courtType: 1,
              district: 1,
              division: 1,
              roomOrHall: 1,
              address: 1,
              presidingJudgeTitle: 1,
              isActive: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
      },
    });

    const [facetResult] = await Court.aggregate<{
      metadata: Array<{ total: number }>;
      items: CourtDocInput[];
    }>(pipeline);

    total = facetResult?.metadata[0]?.total ?? 0;
    courts = facetResult?.items ?? [];
  } else {
    // Parallel lean execution when no search query is present
    const [dbTotal, dbCourts] = await Promise.all([
      Court.countDocuments(filter),
      Court.find(filter)
        .select(
          "_id name courtType district division roomOrHall address presidingJudgeTitle isActive createdAt updatedAt"
        )
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean<CourtDocInput[]>(),
    ]);

    total = dbTotal;
    courts = dbCourts;
  }

  // Performance short-circuit: If no courts match, return early without running aggregations
  if (courts.length === 0) {
    const emptyResponse: CourtPaginationResponse = {
      items: [],
      total,
      page,
      limit: limit as CourtPageLimit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: false,
    };
    return NextResponse.json(emptyResponse);
  }

  const courtIds = courts.map((c) => c._id);

  // Compute relation counts only for courts in the current page
  const [caseCounts, hearingCounts, assetCounts] = await Promise.all([
    Case.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { courtId: { $in: courtIds }, deletedAt: null } },
      { $group: { _id: "$courtId", count: { $sum: 1 } } },
    ]),
    Hearing.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { courtId: { $in: courtIds } } },
      { $group: { _id: "$courtId", count: { $sum: 1 } } },
    ]),
    AssetReference.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      {
        $match: {
          ownerType: ASSET_OWNER_TYPES.COURT,
          ownerId: { $in: courtIds },
          deletedAt: null,
        },
      },
      { $group: { _id: "$ownerId", count: { $sum: 1 } } },
    ]),
  ]);

  const caseCountMap = new Map<string, number>(
    caseCounts.map((item) => [item._id.toString(), item.count])
  );
  const hearingCountMap = new Map<string, number>(
    hearingCounts.map((item) => [item._id.toString(), item.count])
  );
  const assetCountMap = new Map<string, number>(
    assetCounts.map((item) => [item._id.toString(), item.count])
  );

  const items: CourtListItemDto[] = courts.map((c) => {
    const idStr = String(c._id);
    return formatCourtItem(c, {
      cases: caseCountMap.get(idStr) || 0,
      hearings: hearingCountMap.get(idStr) || 0,
      assets: assetCountMap.get(idStr) || 0,
    });
  });

  const response: CourtPaginationResponse = {
    items,
    total,
    page,
    limit: limit as CourtPageLimit,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: page * limit < total,
  };

  return NextResponse.json(response);
});

/**
 * POST /api/v1/courts
 *
 * Create a new court record inside a database transaction with audit logging.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

  const body = await req.json().catch(() => ({}));
  const validated = createCourtSchema.parse(body);

  const trimmedName = validated.name.trim();
  const trimmedDistrict = validated.district.trim();

  // Check if court already exists with identical name and district (escaped regex to prevent injection)
  const existingCourt = await Court.findOne({
    deletedAt: null,
    name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i") },
    district: { $regex: new RegExp(`^${escapeRegex(trimmedDistrict)}$`, "i") },
  }).lean();

  if (existingCourt) {
    throw ApiError.conflict(
      `A court named "${trimmedName}" already exists in ${trimmedDistrict} district.`
    );
  }

  // Create court and record audit log atomically inside transaction
  const createdCourt = await withTransaction(async (dbSession) => {
    const [court] = await Court.create(
      [
        {
          name: trimmedName,
          courtType: validated.courtType,
          district: trimmedDistrict,
          division: validated.division?.trim() || "Sylhet",
          roomOrHall: validated.roomOrHall?.trim() || null,
          address: validated.address?.trim() || null,
          presidingJudgeTitle: validated.presidingJudgeTitle?.trim() || null,
          isActive: validated.isActive !== undefined ? validated.isActive : true,
        },
      ],
      { session: dbSession }
    );

    // Record audit log for court creation
    await recordAuditLog({
      req,
      userId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.COURT,
      entityId: court._id,
      oldValues: null,
      newValues: court.toObject(),
      description: `Created court "${court.name}" (${court.district})`,
      session: dbSession,
    });

    return court;
  });

  const dto = formatCourtItem(createdCourt.toObject(), {
    cases: 0,
    hearings: 0,
    assets: 0,
  });

  const response: CourtActionResponse = {
    success: true,
    message: `Court "${createdCourt.name}" created successfully.`,
    data: dto,
  };

  return NextResponse.json(response, { status: 201 });
});
