import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import ConnectDB from "@/db";
import { Hearing } from "@/db/models/Hearing.model";
import { Case } from "@/db/models/Case.model";
import { Court } from "@/db/models/Court.model";
import { Client } from "@/db/models/Client.model";
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
} from "@/types/hearing.types";

/**
 * Synchronize a case's nextHearingDate with the earliest scheduled hearing
 * on or after today that is not cancelled.
 */
export async function syncCaseNextHearingDate(
  caseId: mongoose.Types.ObjectId | string,
  dbSession?: mongoose.ClientSession
): Promise<Date | null> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const query = Hearing.findOne({
    caseId,
    hearingDate: { $gte: startOfToday },
    status: { $ne: HEARING_STATUSES.CANCELLED },
  })
    .sort({ hearingDate: 1 })
    .select("hearingDate");

  if (dbSession) {
    query.session(dbSession);
  }

  const nextHearing = await query.lean();
  const nextHearingDate = nextHearing?.hearingDate ? new Date(nextHearing.hearingDate) : null;

  const updateQuery = Case.findByIdAndUpdate(
    caseId,
    { nextHearingDate },
    { new: true }
  );
  if (dbSession) {
    updateQuery.session(dbSession);
  }
  await updateQuery;

  return nextHearingDate;
}

/**
 * Format a lean Hearing document into a type-safe HearingListItemDto.
 */
export function formatHearingListItem(
  doc: Record<string, unknown>,
  fallbackCourtsMap?: Map<string, Record<string, unknown>>
): HearingListItemDto {
  const id = (doc._id as mongoose.Types.ObjectId).toString();
  const rawCase = doc.caseId as Record<string, unknown> | null;
  const rawClient = rawCase?.clientId as Record<string, unknown> | null;
  const rawCourt =
    (doc.courtId as Record<string, unknown> | null) ||
    (rawCase?.courtId && typeof rawCase.courtId === "object"
      ? (rawCase.courtId as Record<string, unknown>)
      : fallbackCourtsMap && rawCase?.courtId
      ? fallbackCourtsMap.get(String(rawCase.courtId))
      : null);

  const status = (doc.status as HearingStatus) || HEARING_STATUSES.SCHEDULED;
  const cType = (rawCourt?.courtType as CourtType) || COURT_TYPES.DISTRICT_JUDGE_COURT;

  const caseDto: HearingCaseDto = {
    id: rawCase ? (rawCase._id as mongoose.Types.ObjectId).toString() : String(doc.caseId),
    internalReference: (rawCase?.internalReference as string) || "N/A",
    caseNumber: (rawCase?.caseNumber as string) || null,
    title: (rawCase?.title as string) || "Untitled Case",
    caseType: (rawCase?.caseType as string) || "CIVIL",
    caseStatus: (rawCase?.caseStatus as string) || "ACTIVE",
    priority: (rawCase?.priority as string) || "NORMAL",
    filingDate: rawCase?.filingDate ? new Date(rawCase.filingDate as Date).toISOString() : null,
    nextHearingDate: rawCase?.nextHearingDate
      ? new Date(rawCase.nextHearingDate as Date).toISOString()
      : null,
  };

  const clientDto: HearingClientDto | null = rawClient
    ? {
        id: (rawClient._id as mongoose.Types.ObjectId).toString(),
        name: (rawClient.name as string) || "Unknown Client",
        clientNumber: (rawClient.clientNumber as string) || "",
        organizationName: (rawClient.organizationName as string) || null,
        clientType: (rawClient.clientType as string) || "INDIVIDUAL",
        phone: (rawClient.phone as string) || null,
        email: (rawClient.email as string) || null,
      }
    : null;

  const courtDto: HearingCourtDto | null = rawCourt
    ? {
        id: (rawCourt._id as mongoose.Types.ObjectId).toString(),
        name: (rawCourt.name as string) || "Unknown Court",
        courtType: cType,
        courtTypeLabel: COURT_TYPE_LABELS[cType] || String(rawCourt.courtType || ""),
        district: (rawCourt.district as string) || "Sylhet",
        roomOrHall: (rawCourt.roomOrHall as string) || null,
        address: (rawCourt.address as string) || null,
        presidingJudgeTitle: (rawCourt.presidingJudgeTitle as string) || null,
      }
    : null;

  return {
    id,
    caseId: caseDto.id,
    case: caseDto,
    client: clientDto,
    courtId: courtDto ? courtDto.id : null,
    court: courtDto,
    hearingDate: doc.hearingDate
      ? new Date(doc.hearingDate as Date).toISOString()
      : new Date().toISOString(),
    startTime: (doc.startTime as string) || null,
    hearingType: (doc.hearingType as string) || null,
    purpose: (doc.purpose as string) || null,
    outcome: (doc.outcome as string) || null,
    nextDate: doc.nextDate ? new Date(doc.nextDate as Date).toISOString() : null,
    status,
    statusLabel: HEARING_STATUS_LABELS[status] || status,
    adjournmentReason: (doc.adjournmentReason as string) || null,
    notes: (doc.notes as string) || null,
    isDeletable: true,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt as Date).toISOString()
      : new Date().toISOString(),
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt as Date).toISOString()
      : new Date().toISOString(),
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

  await ConnectDB();

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
    const clientCases = await Case.find(
      { clientId: new mongoose.Types.ObjectId(clientId), deletedAt: null },
      { _id: 1 }
    ).lean();
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

  // Search across hearing fields, case numbers/titles, and client names
  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      // Find matching clients
      const matchedClients = await Client.find(
        {
          deletedAt: null,
          $or: [
            { name: searchRegex },
            { clientNumber: searchRegex },
            { organizationName: searchRegex },
            { phone: searchRegex },
          ],
        },
        { _id: 1 }
      ).lean();
      const matchedClientIds = matchedClients.map((c) => c._id);

      // Find matching cases
      const caseSearchConditions: Record<string, unknown>[] = [
        { title: searchRegex },
        { caseNumber: searchRegex },
        { internalReference: searchRegex },
      ];
      if (matchedClientIds.length > 0) {
        caseSearchConditions.push({ clientId: { $in: matchedClientIds } });
      }

      const matchedCases = await Case.find(
        {
          deletedAt: null,
          $or: caseSearchConditions,
        },
        { _id: 1 }
      ).lean();
      const matchedCaseIds = matchedCases.map((c) => c._id);

      const directConditions: Record<string, unknown>[] = [
        { purpose: searchRegex },
        { outcome: searchRegex },
        { notes: searchRegex },
        { hearingType: searchRegex },
        { adjournmentReason: searchRegex },
      ];
      if (matchedCaseIds.length > 0) {
        directConditions.push({ caseId: { $in: matchedCaseIds } });
      }

      filter.$or = directConditions;
    }
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
  const skip = (page - 1) * limit;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Execute stats aggregation and paginated records in parallel using common filter
  const [statsAggResult, hearings] = await Promise.all([
    Hearing.aggregate<{
      total: number;
      upcoming: number;
      past: number;
      today: number;
      scheduled: number;
      inProgress: number;
      completed: number;
      adjourned: number;
      cancelled: number;
    }>([
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
      .populate({
        path: "caseId",
        select:
          "internalReference caseNumber title caseType caseStatus priority courtId clientId filingDate nextHearingDate",
        populate: {
          path: "clientId",
          select: "name clientNumber organizationName clientType phone email",
        },
      })
      .populate({
        path: "courtId",
        select: "name courtType district roomOrHall address presidingJudgeTitle",
      })
      .lean(),
  ]);

  const rawStats = statsAggResult[0];
  const total = rawStats?.total ?? 0;

  // For hearings where courtId was not directly set, check if we need fallback courts from case
  const unresolvedCourtIds = new Set<string>();
  for (const h of hearings) {
    const rawCaseObj = h.caseId as unknown as Record<string, unknown> | null;
    if (!h.courtId && rawCaseObj && typeof rawCaseObj === "object" && rawCaseObj.courtId) {
      const cId = rawCaseObj.courtId;
      if (typeof cId === "string" || cId instanceof mongoose.Types.ObjectId) {
        unresolvedCourtIds.add(String(cId));
      }
    }
  }

  let fallbackCourtsMap: Map<string, Record<string, unknown>> | undefined;
  if (unresolvedCourtIds.size > 0) {
    const courtsList = await Court.find({
      _id: { $in: Array.from(unresolvedCourtIds).map((id) => new mongoose.Types.ObjectId(id)) },
    }).lean();
    fallbackCourtsMap = new Map(
      courtsList.map((c) => [(c._id as mongoose.Types.ObjectId).toString(), c as unknown as Record<string, unknown>])
    );
  }

  const items: HearingListItemDto[] = hearings.map((h) =>
    formatHearingListItem(h as unknown as Record<string, unknown>, fallbackCourtsMap)
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
 * Create a new hearing inside a database transaction, verifying references
 * and updating the associated Case's nextHearingDate.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const body = await req.json();
  const validated = createHearingSchema.parse(body);

  await ConnectDB();

  // Verify Case exists and is active
  const targetCase = await Case.findOne({
    _id: new mongoose.Types.ObjectId(validated.caseId),
    deletedAt: null,
  });

  if (!targetCase) {
    throw ApiError.notFound(`Case with ID "${validated.caseId}" does not exist or has been removed.`);
  }

  // Resolve Court ID: default to case's courtId if omitted
  let courtObjectId: mongoose.Types.ObjectId | null = null;
  if (validated.courtId) {
    const courtExists = await Court.findOne({
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

    return hearing;
  });

  // Fetch populated hearing detail
  const populatedDoc = await Hearing.findById(createdHearing._id)
    .populate({
      path: "caseId",
      select:
        "internalReference caseNumber title caseType caseStatus priority courtId clientId filingDate nextHearingDate",
      populate: {
        path: "clientId",
        select: "name clientNumber organizationName clientType phone email",
      },
    })
    .populate({
      path: "courtId",
      select: "name courtType district roomOrHall address presidingJudgeTitle",
    })
    .lean();

  const formattedItem = formatHearingListItem(
    populatedDoc as unknown as Record<string, unknown>
  );

  const detailDto: HearingDetailDto = {
    ...formattedItem,
    documentsCount: 0,
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
