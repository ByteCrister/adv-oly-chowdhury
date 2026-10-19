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
import ConnectDB from "@/db";
import { Case } from "@/db/models/Case.model";
import { Hearing } from "@/db/models/Hearing.model";
import { Court } from "@/db/models/Court.model";
import {
  HEARING_DEFAULT_PAGE_LIMIT,
  HEARING_PAGE_LIMITS,
  HEARING_SORT_OPTIONS,
  HEARING_STATUSES,
  HearingPageLimit,
  HearingSortOption,
} from "@/const/hearing.const";
import { createHearingSchema, hearingQueryFilterSchema } from "@/utils/zod/hearing.validation";
import {
  syncCaseNextHearingDate,
  formatHearingListItem,
} from "@/app/api/v1/hearings/route";
import type {
  HearingListItemDto,
  HearingDetailDto,
  HearingPaginationResponse,
  HearingStatsDto,
  HearingActionResponse,
} from "@/types/hearing.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/cases/[id]/hearings
 *
 * Case-scoped endpoint returning paginated hearings, pagination metadata,
 * and live calculated aggregate statistics strictly scoped to the parent case.
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
      { _id: 1, internalReference: 1, caseNumber: 1, title: 1, caseType: 1, caseStatus: 1, priority: 1, filingDate: 1, nextHearingDate: 1, courtId: 1, clientId: 1 }
    )
      .populate("clientId", "name clientNumber organizationName clientType phone email")
      .populate("courtId", "name courtType district roomOrHall presidingJudgeTitle")
      .lean();

    if (!parentCase) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

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

    // Parse and validate query parameters (scope to search, sorting, pagination)
    const rawParams = {
      search: sanitizeSearchParam(searchParams.get("search")),
      status: searchParams.get("status") || undefined,
      courtId: searchParams.get("courtId") || undefined,
      caseId: id, // Strict case enforcement
      hearingType: searchParams.get("hearingType") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sort: searchParams.get("sort") || HEARING_SORT_OPTIONS.UPCOMING_FIRST,
      page: searchParams.get("page") || 1,
      limit: rawLimit ? parseInt(rawLimit, 10) : HEARING_DEFAULT_PAGE_LIMIT,
    };

    const parsed = hearingQueryFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }

    const { search, status, courtId, hearingType, startDate, endDate, sort, page, limit } =
      parsed.data;

    // Strict case-scoped filter
    const filter: Record<string, unknown> = {
      caseId: caseObjectId,
    };

    if (status && status !== "ALL") {
      filter.status = status;
    }

    if (courtId && courtId !== "ALL") {
      filter.courtId = new mongoose.Types.ObjectId(courtId);
    }

    if (hearingType && hearingType !== "ALL") {
      filter.hearingType = hearingType;
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
      filter.hearingDate = dateQuery;
    }

    if (search) {
      const searchRegex = buildSearchRegex(search);
      if (searchRegex) {
        filter.$or = [
          { purpose: searchRegex },
          { outcome: searchRegex },
          { notes: searchRegex },
          { hearingType: searchRegex },
          { adjournmentReason: searchRegex },
        ];
      }
    }

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

    // Parallel aggregation strictly within parent case scope
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
        .populate("courtId", "name courtType district roomOrHall presidingJudgeTitle")
        .lean(),
    ]);

    const rawStats = statsAggResult[0];
    const total = rawStats?.total ?? 0;

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

    const items: HearingListItemDto[] = hearings.map((h) => {
      // Attach the known parentCase to the hearing doc for consistent formatting
      const docWithCase = {
        ...h,
        caseId: parentCase,
      };
      return formatHearingListItem(docWithCase);
    });

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
  }
);

/**
 * POST /api/v1/cases/[id]/hearings
 *
 * Case-scoped creation of a hearing record, automatically bound to this case.
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
      { _id: 1, courtId: 1, clientId: 1, title: 1 }
    );

    if (!parentCase) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    const body = await req.json();
    // Enforce caseId to route parameter
    const payload = {
      ...body,
      caseId: id,
      courtId: body.courtId || (parentCase.courtId ? parentCase.courtId.toString() : null),
    };

    const validated = createHearingSchema.parse(payload);

    // Validate referenced court if provided
    let courtObjectId: mongoose.Types.ObjectId | null = null;
    if (validated.courtId) {
      courtObjectId = new mongoose.Types.ObjectId(validated.courtId);
      const courtExists = await Court.exists({ _id: courtObjectId, deletedAt: null });
      if (!courtExists) {
        throw ApiError.badRequest("Selected court does not exist or has been archived.");
      }
    }

    // Atomically create hearing, synchronize parent case nextHearingDate, and write audit log
    const createdHearing = await withTransaction(async (dbSession) => {
      const [hearingDoc] = await Hearing.create(
        [
          {
            caseId: caseObjectId,
            courtId: courtObjectId,
            hearingDate: new Date(validated.hearingDate),
            startTime: validated.startTime?.trim() || null,
            hearingType: validated.hearingType?.trim() || null,
            purpose: validated.purpose?.trim() || null,
            outcome: validated.outcome?.trim() || null,
            nextDate: validated.nextDate ? new Date(validated.nextDate) : null,
            status: validated.status || HEARING_STATUSES.SCHEDULED,
            adjournmentReason: validated.adjournmentReason?.trim() || null,
            notes: validated.notes?.trim() || null,
          },
        ],
        { session: dbSession }
      );

      // Synchronize Case nextHearingDate inside transaction session
      await syncCaseNextHearingDate(caseObjectId, dbSession);

      // Record audit log for hearing creation
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        entityType: AUDIT_ENTITY_TYPES.HEARING,
        entityId: hearingDoc._id,
        oldValues: null,
        newValues: hearingDoc.toObject(),
        description: `Scheduled hearing for case "${parentCase.title}" on ${hearingDoc.hearingDate.toISOString()}`,
        session: dbSession,
      });

      return hearingDoc;
    });

    const populated = await Hearing.findById(createdHearing._id)
      .populate({
        path: "caseId",
        populate: [
          { path: "clientId", select: "name clientNumber organizationName clientType phone email" },
          { path: "courtId", select: "name courtType district roomOrHall presidingJudgeTitle" },
        ],
      })
      .populate("courtId", "name courtType district roomOrHall presidingJudgeTitle")
      .lean();

    const itemDto = formatHearingListItem(
      populated! as unknown as Record<string, unknown>
    );
    const detailDto: HearingDetailDto = {
      ...itemDto,
      documentsCount: 0,
    };

    const response: HearingActionResponse = {
      success: true,
      message: `Hearing on ${new Date(createdHearing.hearingDate).toLocaleDateString()} added successfully.`,
      data: detailDto,
    };

    return NextResponse.json(response, { status: 201 });
  }
);
