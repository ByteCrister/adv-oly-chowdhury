import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import ConnectDB from "@/db";
import { Case } from "@/db/models/Case.model";
import { Client } from "@/db/models/Client.model";
import { Court } from "@/db/models/Court.model";
import { Hearing } from "@/db/models/Hearing.model";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { CaseEvent } from "@/db/models/CaseEvent.model";
import { CaseParty } from "@/db/models/CaseParty.model";
import {
  CASE_DEFAULT_PAGE_LIMIT,
  CASE_PAGE_LIMITS,
  CASE_SORT_OPTIONS,
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CasePageLimit,
  CaseSortOption,
  CaseStatus,
  CaseType,
  CasePriority,
} from "@/const/case.const";
import { COURT_TYPE_LABELS, COURT_TYPES, CourtType } from "@/const/court.const";
import { createCaseSchema, caseQueryFilterSchema } from "@/utils/zod/case.validation";
import type {
  CaseListItemDto,
  CaseDetailDto,
  CasePaginationResponse,
  CaseStatsDto,
  CaseActionResponse,
  CaseClientDto,
  CaseCourtDto,
} from "@/types/case.types";

/**
 * Generate a sequential, year-scoped internalReference (e.g. CASE-2026-0001).
 */
export async function generateCaseReference(
  dbSession?: mongoose.ClientSession
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CASE-${currentYear}-`;

  const query = Case.findOne(
    { internalReference: { $regex: new RegExp(`^${prefix}\\d+$`) } },
    { internalReference: 1 }
  ).sort({ internalReference: -1 });

  if (dbSession) {
    query.session(dbSession);
  }

  const lastCase = await query.lean();

  let nextSeq = 1;
  if (lastCase?.internalReference) {
    const parts = lastCase.internalReference.split("-");
    const numPart = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(numPart)) {
      nextSeq = numPart + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

import type { ICase, ICaseDocument } from "@/types/db/case.type";

export type CaseDocInput =
  | ICaseDocument
  | ICase
  | mongoose.FlattenMaps<ICaseDocument>
  | (Record<string, unknown> & { _id?: unknown });

/**
 * Format a lean Case document into a type-safe CaseListItemDto.
 */
export function formatCaseListItem(
  doc: CaseDocInput,
  counts?: {
    hearings?: number;
    documents?: number;
    events?: number;
    parties?: number;
  }
): CaseListItemDto {
  const rawDoc = doc as Record<string, unknown>;
  const rawId = (doc as { _id?: unknown })._id;
  const id = rawId ? (rawId as mongoose.Types.ObjectId).toString() : "";
  const rawClient = rawDoc.clientId as Record<string, unknown> | null;
  const rawCourt = rawDoc.courtId as Record<string, unknown> | null;

  const caseType = (rawDoc.caseType as CaseType) || "CIVIL";
  const caseStatus = (rawDoc.caseStatus as CaseStatus) || CASE_STATUSES.ACTIVE;
  const priority = (rawDoc.priority as CasePriority) || CASE_PRIORITIES.NORMAL;
  const courtType = (rawCourt?.courtType as CourtType) || COURT_TYPES.DISTRICT_JUDGE_COURT;

  const clientDto: CaseClientDto | null = rawClient
    ? {
        id: (rawClient._id as mongoose.Types.ObjectId).toString(),
        clientNumber: (rawClient.clientNumber as string) || "",
        name: (rawClient.name as string) || "Unknown Client",
        organizationName: (rawClient.organizationName as string) || null,
        clientType: (rawClient.clientType as string) || "INDIVIDUAL",
        phone: (rawClient.phone as string) || null,
        email: (rawClient.email as string) || null,
      }
    : null;

  const courtDto: CaseCourtDto | null = rawCourt
    ? {
        id: (rawCourt._id as mongoose.Types.ObjectId).toString(),
        name: (rawCourt.name as string) || "Unknown Court",
        courtType,
        courtTypeLabel: COURT_TYPE_LABELS[courtType] || String(rawCourt.courtType || ""),
        district: (rawCourt.district as string) || "Sylhet",
        roomOrHall: (rawCourt.roomOrHall as string) || null,
        presidingJudgeTitle: (rawCourt.presidingJudgeTitle as string) || null,
      }
    : null;

  const hearingsCount = counts?.hearings ?? 0;
  const documentsCount = counts?.documents ?? 0;
  const eventsCount = counts?.events ?? 0;
  const partiesCount = counts?.parties ?? 0;

  return {
    id,
    internalReference: (rawDoc.internalReference as string) || "N/A",
    caseNumber: (rawDoc.caseNumber as string) || null,
    filingYear: typeof rawDoc.filingYear === "number" ? rawDoc.filingYear : null,
    title: (rawDoc.title as string) || "Untitled Case",
    caseType,
    caseTypeLabel: CASE_TYPE_LABELS[caseType] || caseType,
    caseCategory: (rawDoc.caseCategory as string) || null,
    courtId: rawCourt ? (rawCourt._id as mongoose.Types.ObjectId).toString() : String(rawDoc.courtId || ""),
    court: courtDto,
    clientId: rawClient ? (rawClient._id as mongoose.Types.ObjectId).toString() : String(rawDoc.clientId || ""),
    client: clientDto,
    filingDate: rawDoc.filingDate ? new Date(rawDoc.filingDate as Date).toISOString() : null,
    caseStatus,
    caseStatusLabel: CASE_STATUS_LABELS[caseStatus] || caseStatus,
    priority,
    priorityLabel: CASE_PRIORITY_LABELS[priority] || priority,
    description: (rawDoc.description as string) || null,
    legalIssues: (rawDoc.legalIssues as string) || null,
    opposingCounsel: (rawDoc.opposingCounsel as string) || null,
    opposingParties: Array.isArray(rawDoc.opposingParties) ? (rawDoc.opposingParties as string[]) : [],
    nextHearingDate: rawDoc.nextHearingDate ? new Date(rawDoc.nextHearingDate as Date).toISOString() : null,
    closedAt: rawDoc.closedAt ? new Date(rawDoc.closedAt as Date).toISOString() : null,
    closureReason: (rawDoc.closureReason as string) || null,
    hearingsCount,
    documentsCount,
    eventsCount,
    partiesCount,
    isDeletable: hearingsCount === 0 && documentsCount === 0,
    createdAt: rawDoc.createdAt ? new Date(rawDoc.createdAt as Date).toISOString() : new Date().toISOString(),
    updatedAt: rawDoc.updatedAt ? new Date(rawDoc.updatedAt as Date).toISOString() : new Date().toISOString(),
  };
}


/**
 * GET /api/v1/cases
 *
 * Paginated list of cases with comprehensive search, multi-field filtering,
 * allowable sorting, and live calculated aggregate statistics over the full filtered set.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const { searchParams } = new URL(req.url);

  // Validate limit parameter if provided
  const rawLimit = searchParams.get("limit");
  if (rawLimit !== null) {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!CASE_PAGE_LIMITS.includes(parsedLimit as CasePageLimit)) {
      throw ApiError.badRequest(
        `Invalid page limit "${rawLimit}". Allowed page limits are: ${CASE_PAGE_LIMITS.join(", ")}`
      );
    }
  }

  // Parse and validate query parameters
  const rawParams = {
    search: sanitizeSearchParam(searchParams.get("search")),
    caseStatus: searchParams.get("caseStatus") || undefined,
    caseType: searchParams.get("caseType") || undefined,
    priority: searchParams.get("priority") || undefined,
    courtId: searchParams.get("courtId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    filingYear: searchParams.get("filingYear") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || CASE_SORT_OPTIONS.NEWEST,
    page: searchParams.get("page") || 1,
    limit: rawLimit ? parseInt(rawLimit, 10) : CASE_DEFAULT_PAGE_LIMIT,
  };

  const parsed = caseQueryFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
  }

  const {
    search,
    caseStatus,
    caseType,
    priority,
    courtId,
    clientId,
    filingYear,
    startDate,
    endDate,
    sort,
    page,
    limit,
  } = parsed.data;

  await ConnectDB();

  // Construct MongoDB filter object (only active, non-deleted cases)
  const filter: Record<string, unknown> = {
    deletedAt: null,
  };

  if (caseStatus && caseStatus !== "ALL") {
    filter.caseStatus = caseStatus;
  }

  if (caseType && caseType !== "ALL") {
    filter.caseType = caseType;
  }

  if (priority && priority !== "ALL") {
    filter.priority = priority;
  }

  if (courtId && courtId !== "ALL") {
    if (!mongoose.Types.ObjectId.isValid(courtId)) {
      throw ApiError.badRequest("Invalid court ID format");
    }
    filter.courtId = new mongoose.Types.ObjectId(courtId);
  }

  if (clientId && clientId !== "ALL") {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw ApiError.badRequest("Invalid client ID format");
    }
    filter.clientId = new mongoose.Types.ObjectId(clientId);
  }

  if (filingYear) {
    const yearNum = parseInt(filingYear, 10);
    if (!isNaN(yearNum)) {
      filter.filingYear = yearNum;
    }
  }

  // Date Range Filtering on filingDate (or fallback to createdAt)
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
    filter.filingDate = dateQuery;
  }

  // Cross-collection and multi-field text search
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

      // Find matching courts
      const matchedCourts = await Court.find(
        {
          deletedAt: null,
          $or: [{ name: searchRegex }, { district: searchRegex }],
        },
        { _id: 1 }
      ).lean();
      const matchedCourtIds = matchedCourts.map((c) => c._id);

      const searchConditions: Record<string, unknown>[] = [
        { title: searchRegex },
        { caseNumber: searchRegex },
        { internalReference: searchRegex },
        { description: searchRegex },
        { legalIssues: searchRegex },
        { opposingCounsel: searchRegex },
        { opposingParties: searchRegex },
        { caseCategory: searchRegex },
      ];

      if (matchedClientIds.length > 0) {
        searchConditions.push({ clientId: { $in: matchedClientIds } });
      }

      if (matchedCourtIds.length > 0) {
        searchConditions.push({ courtId: { $in: matchedCourtIds } });
      }

      filter.$or = searchConditions;
    }
  }

  // Sorting definitions
  const sortMap: Record<CaseSortOption, Record<string, 1 | -1>> = {
    [CASE_SORT_OPTIONS.NEWEST]: { createdAt: -1 },
    [CASE_SORT_OPTIONS.OLDEST]: { createdAt: 1 },
    [CASE_SORT_OPTIONS.TITLE_ASC]: { title: 1 },
    [CASE_SORT_OPTIONS.TITLE_DESC]: { title: -1 },
    [CASE_SORT_OPTIONS.CASE_NUMBER_ASC]: { caseNumber: 1 },
    [CASE_SORT_OPTIONS.CASE_NUMBER_DESC]: { caseNumber: -1 },
    [CASE_SORT_OPTIONS.FILING_DATE_DESC]: { filingDate: -1 },
    [CASE_SORT_OPTIONS.FILING_DATE_ASC]: { filingDate: 1 },
    [CASE_SORT_OPTIONS.NEXT_HEARING_ASC]: { nextHearingDate: 1 },
    [CASE_SORT_OPTIONS.NEXT_HEARING_DESC]: { nextHearingDate: -1 },
  };

  const sortOption = sortMap[sort as CaseSortOption] || { createdAt: -1 };
  const skip = (page - 1) * limit;

  // Execute stats aggregation and paginated find queries in parallel using identical filter
  const [statsAggResult, cases] = await Promise.all([
    Case.aggregate<{
      total: number;
      active: number;
      hearingStaged: number;
      argumentsPending: number;
      judgmentReserved: number;
      onHold: number;
      disposed: number;
      closed: number;
      draft: number;
      urgentPriority: number;
      highPriority: number;
    }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.ACTIVE] }, 1, 0] },
          },
          hearingStaged: {
            $sum: { $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.HEARING_STAGED] }, 1, 0] },
          },
          argumentsPending: {
            $sum: { $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.ARGUMENTS_PENDING] }, 1, 0] },
          },
          judgmentReserved: {
            $sum: { $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.JUDGMENT_RESERVED] }, 1, 0] },
          },
          onHold: {
            $sum: { $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.ON_HOLD] }, 1, 0] },
          },
          disposed: {
            $sum: { $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.DISPOSED] }, 1, 0] },
          },
          closed: {
            $sum: { $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.CLOSED] }, 1, 0] },
          },
          draft: {
            $sum: { $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.DRAFT] }, 1, 0] },
          },
          urgentPriority: {
            $sum: { $cond: [{ $eq: ["$priority", CASE_PRIORITIES.URGENT] }, 1, 0] },
          },
          highPriority: {
            $sum: { $cond: [{ $eq: ["$priority", CASE_PRIORITIES.HIGH] }, 1, 0] },
          },
        },
      },
    ]),
    Case.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate("clientId", "name clientNumber organizationName clientType phone email")
      .populate("courtId", "name courtType district roomOrHall presidingJudgeTitle")
      .lean(),
  ]);

  const rawStats = statsAggResult[0];
  const total = rawStats?.total ?? 0;

  const stats: CaseStatsDto = {
    total,
    active: rawStats?.active ?? 0,
    hearingStaged: rawStats?.hearingStaged ?? 0,
    argumentsPending: rawStats?.argumentsPending ?? 0,
    judgmentReserved: rawStats?.judgmentReserved ?? 0,
    onHold: rawStats?.onHold ?? 0,
    disposed: rawStats?.disposed ?? 0,
    closed: rawStats?.closed ?? 0,
    draft: rawStats?.draft ?? 0,
    urgentPriority: rawStats?.urgentPriority ?? 0,
    highPriority: rawStats?.highPriority ?? 0,
  };

  // In parallel, fetch relation counts for the paginated cases
  const caseIds = cases.map((c) => c._id as mongoose.Types.ObjectId);

  const countsMap: Map<string, { hearings: number; documents: number; events: number; parties: number }> =
    new Map();

  if (caseIds.length > 0) {
    const [hearingCounts, docCounts, eventCounts, partyCounts] = await Promise.all([
      Hearing.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { caseId: { $in: caseIds } } },
        { $group: { _id: "$caseId", count: { $sum: 1 } } },
      ]),
      CaseDocument.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { caseId: { $in: caseIds }, deletedAt: null } },
        { $group: { _id: "$caseId", count: { $sum: 1 } } },
      ]),
      CaseEvent.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { caseId: { $in: caseIds } } },
        { $group: { _id: "$caseId", count: { $sum: 1 } } },
      ]),
      CaseParty.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { caseId: { $in: caseIds } } },
        { $group: { _id: "$caseId", count: { $sum: 1 } } },
      ]),
    ]);

    caseIds.forEach((cId) => {
      countsMap.set(cId.toString(), {
        hearings: 0,
        documents: 0,
        events: 0,
        parties: 0,
      });
    });

    hearingCounts.forEach((h) => {
      const entry = countsMap.get(h._id.toString());
      if (entry) entry.hearings = h.count;
    });

    docCounts.forEach((d) => {
      const entry = countsMap.get(d._id.toString());
      if (entry) entry.documents = d.count;
    });

    eventCounts.forEach((e) => {
      const entry = countsMap.get(e._id.toString());
      if (entry) entry.events = e.count;
    });

    partyCounts.forEach((p) => {
      const entry = countsMap.get(p._id.toString());
      if (entry) entry.parties = p.count;
    });
  }

  const items: CaseListItemDto[] = cases.map((c) => {
    const counts = countsMap.get((c._id as mongoose.Types.ObjectId).toString());
    return formatCaseListItem(c, counts);
  });

  const response: CasePaginationResponse = {
    items,
    total,
    page,
    limit: limit as CasePageLimit,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: page * limit < total,
    stats,
  };

  return NextResponse.json(response);
});

/**
 * POST /api/v1/cases
 *
 * Create a new Case record.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const body = await req.json();
  const validated = createCaseSchema.parse(body);

  await ConnectDB();

  // Validate referenced Client
  const clientObjectId = new mongoose.Types.ObjectId(validated.clientId);
  const clientExists = await Client.exists({ _id: clientObjectId, deletedAt: null });
  if (!clientExists) {
    throw ApiError.badRequest("Selected client does not exist or has been archived.");
  }

  // Validate referenced Court
  const courtObjectId = new mongoose.Types.ObjectId(validated.courtId);
  const courtExists = await Court.exists({ _id: courtObjectId, deletedAt: null });
  if (!courtExists) {
    throw ApiError.badRequest("Selected court does not exist or has been archived.");
  }

  // Determine internalReference: use user-specified if provided, else auto-generate
  let internalReference: string;
  if (validated.internalReference?.trim()) {
    internalReference = validated.internalReference.trim().toUpperCase();
    const existingRef = await Case.exists({ internalReference });
    if (existingRef) {
      throw ApiError.badRequest(
        `A case with internal reference "${internalReference}" already exists. Please choose a unique reference.`
      );
    }
  } else {
    internalReference = await generateCaseReference();
  }

  // Create Case document
  const createdCase = await Case.create({
    internalReference,
    caseNumber: validated.caseNumber?.trim() || null,
    filingYear: validated.filingYear ?? null,
    title: validated.title.trim(),
    caseType: validated.caseType,
    caseCategory: validated.caseCategory?.trim() || null,
    courtId: courtObjectId,
    clientId: clientObjectId,
    filingDate: validated.filingDate ? new Date(validated.filingDate) : null,
    caseStatus: validated.caseStatus,
    priority: validated.priority,
    description: validated.description?.trim() || null,
    legalIssues: validated.legalIssues?.trim() || null,
    opposingCounsel: validated.opposingCounsel?.trim() || null,
    opposingParties: validated.opposingParties || [],
    nextHearingDate: null,
    closedAt: null,
    closureReason: null,
  });

  // Populate for response
  const populated = await Case.findById(createdCase._id)
    .populate("clientId", "name clientNumber organizationName clientType phone email")
    .populate("courtId", "name courtType district roomOrHall presidingJudgeTitle")
    .lean();

  const itemDto = formatCaseListItem(populated!, {
    hearings: 0,
    documents: 0,
    events: 0,
    parties: 0,
  });

  const detailDto: CaseDetailDto = {
    ...itemDto,
    counts: {
      hearings: 0,
      documents: 0,
      events: 0,
      parties: 0,
    },
  };

  const response: CaseActionResponse = {
    success: true,
    message: `Case "${itemDto.title}" (${itemDto.internalReference}) created successfully.`,
    data: detailDto,
  };

  return NextResponse.json(response, { status: 201 });
});
