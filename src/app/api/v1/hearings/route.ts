import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import ConnectDB from "@/db";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
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
  fallbackCourtsMap?: Map<string, IPopulatedHearingCourt | Record<string, unknown>>
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

  return {
    id,
    caseId: caseDto.id,
    case: caseDto,
    client: clientDto,
    courtId: courtDto ? courtDto.id : (doc.courtId ? extractIdString(doc.courtId) : (rawCase?.courtId ? extractIdString(rawCase.courtId) : null)),
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
    isDeletable: doc.isDeletable !== undefined ? Boolean(doc.isDeletable) : true,
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
  await ConnectDB();

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

  // Safe search across hearing fields, case numbers/titles, client names, and court details
  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      // Find matching clients and courts in parallel, bounded to 100 results
      const [matchedClients, matchedCourts] = await Promise.all([
        Client.find(
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
        )
          .limit(100)
          .lean(),
        Court.find(
          {
            deletedAt: null,
            $or: [
              { name: searchRegex },
              { district: searchRegex },
              { roomOrHall: searchRegex },
              { presidingJudgeTitle: searchRegex },
            ],
          },
          { _id: 1 }
        )
          .limit(100)
          .lean(),
      ]);

      const matchedClientIds = matchedClients.map((c) => c._id);
      const matchedCourtIds = matchedCourts.map((c) => c._id);

      // Find matching cases
      const caseSearchConditions: Record<string, unknown>[] = [
        { title: searchRegex },
        { caseNumber: searchRegex },
        { internalReference: searchRegex },
      ];
      if (matchedClientIds.length > 0) {
        caseSearchConditions.push({ clientId: { $in: matchedClientIds } });
      }
      if (matchedCourtIds.length > 0) {
        caseSearchConditions.push({ courtId: { $in: matchedCourtIds } });
      }

      const matchedCases = await Case.find(
        {
          deletedAt: null,
          $or: caseSearchConditions,
        },
        { _id: 1 }
      )
        .limit(100)
        .lean();
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
      if (matchedCourtIds.length > 0) {
        directConditions.push({ courtId: { $in: matchedCourtIds } });
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
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
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
        populate: [
          {
            path: "clientId",
            select: "name clientNumber organizationName clientType phone email",
          },
          {
            path: "courtId",
            select: "name courtType district roomOrHall address presidingJudgeTitle",
          },
        ],
      })
      .populate({
        path: "courtId",
        select: "name courtType district roomOrHall address presidingJudgeTitle",
      })
      .lean(),
  ]);

  const rawStats = statsAggResult[0];
  const total = rawStats?.total ?? 0;

  // Accurately batch check whether hearings on this page have attached documents
  const hearingIds = hearings.map((h) => h._id);
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
    formatHearingListItem({
      ...(h as unknown as IPopulatedHearingDoc),
      isDeletable: !hearingsWithDocsSet.has(String(h._id)),
    })
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
  await ConnectDB();

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

    // Record audit log for hearing creation
    await recordAuditLog({
      req,
      userId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.HEARING,
      entityId: hearing._id,
      oldValues: null,
      newValues: hearing.toObject(),
      description: `Scheduled hearing for case "${targetCase.title}" on ${hearing.hearingDate.toISOString()}`,
      session: dbSession,
    });

    return hearing;
  });

  // Fetch populated hearing detail in a single consolidated query
  const populatedDoc = await Hearing.findById(createdHearing._id)
    .populate({
      path: "caseId",
      select:
        "internalReference caseNumber title caseType caseStatus priority courtId clientId filingDate nextHearingDate",
      populate: [
        {
          path: "clientId",
          select: "name clientNumber organizationName clientType phone email",
        },
        {
          path: "courtId",
          select: "name courtType district roomOrHall address presidingJudgeTitle",
        },
      ],
    })
    .populate({
      path: "courtId",
      select: "name courtType district roomOrHall address presidingJudgeTitle",
    })
    .lean();

  const formattedItem = formatHearingListItem(
    populatedDoc as unknown as IPopulatedHearingDoc
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
