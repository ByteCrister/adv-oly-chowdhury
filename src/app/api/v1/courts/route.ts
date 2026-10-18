import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, buildSearchRegex, escapeRegex } from "@/lib/helpers/search.helper";
import { Court } from "@/db/models/Court.model";
import { Case } from "@/db/models/Case.model";
import { Hearing } from "@/db/models/Hearing.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import {
  COURT_DEFAULT_PAGE_LIMIT,
  COURT_PAGE_LIMITS,
  COURT_SORT_OPTIONS,
  COURT_TYPE_LABELS,
  CourtPageLimit,
  CourtSortOption,
  CourtType,
} from "@/const/court.const";

import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import { createCourtSchema, courtQueryFilterSchema } from "@/utils/zod/court.validation";
import type {
  CourtListItemDto,
  CourtPaginationResponse,
  CourtActionResponse,
} from "@/types/court.types";
import type { ICourtDocument } from "@/types/db/court.type";

/**
 * Format a Court document into a full CourtListItemDto.
 */
function formatCourtItem(
  court: ICourtDocument | Record<string, unknown>,
  counts?: { cases?: number; hearings?: number; assets?: number }
): CourtListItemDto {
  const cType = court.courtType as CourtType;
  const cases = counts?.cases ?? 0;
  const hearings = counts?.hearings ?? 0;
  const assets = counts?.assets ?? 0;

  return {
    id: (court._id as mongoose.Types.ObjectId).toString(),
    name: court.name as string,
    courtType: cType,
    courtTypeLabel: COURT_TYPE_LABELS[cType] || (court.courtType as string),
    district: court.district as string,
    division: (court.division as string) || null,
    roomOrHall: (court.roomOrHall as string) || null,
    address: (court.address as string) || null,
    presidingJudgeTitle: (court.presidingJudgeTitle as string) || null,
    isActive: Boolean(court.isActive),
    totalCases: cases,
    totalHearings: hearings,
    totalAssets: assets,
    isDeletable: cases === 0 && hearings === 0 && assets === 0,
    createdAt: court.createdAt ? new Date(court.createdAt as Date).toISOString() : "",
    updatedAt: court.updatedAt ? new Date(court.updatedAt as Date).toISOString() : "",
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
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Authentication required");
  }

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

  // Search across multiple fields
  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      filter.$or = [
        { name: searchRegex },
        { district: searchRegex },
        { division: searchRegex },
        { roomOrHall: searchRegex },
        { address: searchRegex },
        { presidingJudgeTitle: searchRegex },
      ];
    }
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

  // Execute queries in parallel
  const [total, courts] = await Promise.all([
    Court.countDocuments(filter),
    Court.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
  ]);

  const courtIds = courts.map((c) => c._id);

  // Compute relation counts for courts in the current page
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
    const idStr = (c._id as mongoose.Types.ObjectId).toString();
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
 * Create a new court record inside a database transaction.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Authentication required");
  }

  const body = await req.json();
  const validated = createCourtSchema.parse(body);

  // Check if court already exists with identical name and district
  const existingCourt = await Court.findOne({
    deletedAt: null,
    name: { $regex: new RegExp(`^${validated.name.trim()}$`, "i") },
    district: { $regex: new RegExp(`^${validated.district.trim()}$`, "i") },
  });

  if (existingCourt) {
    throw ApiError.conflict(
      `A court named "${validated.name}" already exists in ${validated.district} district.`
    );
  }

  // Create court inside transaction
  const createdCourt = await withTransaction(async (dbSession) => {
    const [court] = await Court.create(
      [
        {
          name: validated.name.trim(),
          courtType: validated.courtType,
          district: validated.district.trim(),
          division: validated.division?.trim() || "Sylhet",
          roomOrHall: validated.roomOrHall?.trim() || null,
          address: validated.address?.trim() || null,
          presidingJudgeTitle: validated.presidingJudgeTitle?.trim() || null,
          isActive: validated.isActive !== undefined ? validated.isActive : true,
        },
      ],
      { session: dbSession }
    );
    return court;
  });

  const dto = formatCourtItem(createdCourt, {
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
