import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
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
import type { ICase, ICaseDocument } from "@/types/db/case.type";

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
  const id = rawId ? extractIdString(rawId) : "";
  const rawClient = rawDoc.clientId as Record<string, unknown> | null;
  const rawCourt = rawDoc.courtId as Record<string, unknown> | null;

  const caseType = (rawDoc.caseType as CaseType) || "CIVIL";
  const caseStatus = (rawDoc.caseStatus as CaseStatus) || CASE_STATUSES.ACTIVE;
  const priority = (rawDoc.priority as CasePriority) || CASE_PRIORITIES.NORMAL;
  const courtType = (rawCourt?.courtType as CourtType) || COURT_TYPES.DISTRICT_JUDGE_COURT;

  const clientDto: CaseClientDto | null = rawClient && rawClient._id
    ? {
        id: extractIdString(rawClient._id),
        clientNumber: (rawClient.clientNumber as string) || "",
        name: (rawClient.name as string) || "Unknown Client",
        organizationName: (rawClient.organizationName as string) || null,
        clientType: (rawClient.clientType as string) || "INDIVIDUAL",
        phone: (rawClient.phone as string) || null,
        email: (rawClient.email as string) || null,
      }
    : null;

  const courtDto: CaseCourtDto | null = rawCourt && rawCourt._id
    ? {
        id: extractIdString(rawCourt._id),
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
    courtId: extractIdString(rawDoc.courtId),
    court: courtDto,
    clientId: extractIdString(rawDoc.clientId),
    client: clientDto,
    filingDate: formatSafeIsoDate(rawDoc.filingDate),
    caseStatus,
    caseStatusLabel: CASE_STATUS_LABELS[caseStatus] || caseStatus,
    priority,
    priorityLabel: CASE_PRIORITY_LABELS[priority] || priority,
    description: (rawDoc.description as string) || null,
    legalIssues: (rawDoc.legalIssues as string) || null,
    opposingCounsel: (rawDoc.opposingCounsel as string) || null,
    opposingParties: Array.isArray(rawDoc.opposingParties) ? (rawDoc.opposingParties as string[]) : [],
    nextHearingDate: formatSafeIsoDate(rawDoc.nextHearingDate),
    closedAt: formatSafeIsoDate(rawDoc.closedAt),
    closureReason: (rawDoc.closureReason as string) || null,
    hearingsCount,
    documentsCount,
    eventsCount,
    partiesCount,
    isDeletable: hearingsCount === 0 && documentsCount === 0,
    createdAt: formatSafeIsoDate(rawDoc.createdAt) || new Date().toISOString(),
    updatedAt: formatSafeIsoDate(rawDoc.updatedAt) || new Date().toISOString(),
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
      // Find matching clients and courts in parallel, bounded to 100 results to avoid massive $in predicates
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
            $or: [{ name: searchRegex }, { district: searchRegex }],
          },
          { _id: 1 }
        )
          .limit(100)
          .lean(),
      ]);
      const matchedClientIds = matchedClients.map((c) => c._id);
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
  const userId = await getUserId();

  const body = await req.json();
  const validated = createCaseSchema.parse(body);

  await ConnectDB();

  // Validate referenced Client and Court in parallel
  const clientObjectId = new mongoose.Types.ObjectId(validated.clientId);
  const courtObjectId = new mongoose.Types.ObjectId(validated.courtId);

  const [clientExists, courtExists] = await Promise.all([
    Client.exists({ _id: clientObjectId, deletedAt: null }),
    Court.exists({ _id: courtObjectId, deletedAt: null }),
  ]);

  if (!clientExists) {
    throw ApiError.badRequest("Selected client does not exist or has been archived.");
  }

  if (!courtExists) {
    throw ApiError.badRequest("Selected court does not exist or has been archived.");
  }

  // Determine internalReference: use user-specified if provided, else auto-generate
  const isAutoGenerated = !validated.internalReference?.trim();
  let internalReference: string = "";

  if (!isAutoGenerated) {
    internalReference = validated.internalReference!.trim().toUpperCase();
    const existingRef = await Case.exists({ internalReference });
    if (existingRef) {
      throw ApiError.badRequest(
        `A case with internal reference "${internalReference}" already exists. Please choose a unique reference.`
      );
    }
  }

  // Create Case document with concurrency collision retry for auto-generated references
  const maxAttempts = isAutoGenerated ? 3 : 1;
  let createdCase = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (isAutoGenerated) {
        internalReference = await generateCaseReference();
      }

      createdCase = await Case.create({
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
      break;
    } catch (err: unknown) {
      if (
        isAutoGenerated &&
        attempt < maxAttempts &&
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: number }).code === 11000
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }
      throw err;
    }
  }

  if (!createdCase) {
    throw ApiError.internal("Failed to generate a unique case reference after multiple attempts.");
  }

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

  // Record audit log for case creation
  await recordAuditLog({
    req,
    userId,
    action: AUDIT_ACTIONS.CREATE,
    entityType: AUDIT_ENTITY_TYPES.CASE,
    entityId: createdCase._id,
    oldValues: null,
    newValues: createdCase.toObject(),
    description: `Created case "${itemDto.title}" (${itemDto.internalReference})`,
  });

  const response: CaseActionResponse = {
    success: true,
    message: `Case "${itemDto.title}" (${itemDto.internalReference}) created successfully.`,
    data: detailDto,
  };

  return NextResponse.json(response, { status: 201 });
});
