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
import { Case } from "@/db/models/Case.model";
import { CaseParty } from "@/db/models/CaseParty.model";
import { Client } from "@/db/models/Client.model";
import {
  CASE_PARTY_DEFAULT_PAGE_LIMIT,
  CASE_PARTY_PAGE_LIMITS,
  CASE_PARTY_SORT_OPTIONS,
  CASE_PARTY_ROLE_LABELS,
  CASE_PARTY_TYPE_LABELS,
  PARTY_ROLES,
  PARTY_TYPES,
  CasePartyPageLimit,
  CasePartySortOption,
  PartyRole,
  PartyType,
} from "@/const/case-party.const";
import {
  createCasePartySchema,
  casePartyQueryFilterSchema,
} from "@/utils/zod/case-party.validation";
import { extractIdString, formatSafeIsoDate } from "@/app/api/v1/cases/route";
import type { CaseClientDto } from "@/types/case.types";
import type {
  CasePartyItemDto,
  CasePartyPaginationResponse,
  CasePartyStatsDto,
  CasePartyActionResponse,
} from "@/types/case-party.types";

import type {
  ICaseParty,
  ICasePartyDocument,
  IPopulatedCasePartyDoc,
} from "@/types/db/case-party.type";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Explicit projection fields for CaseParty queries.
 * Eliminates leaked internal MongoDB fields (__v, passwordHash, etc.).
 */
export const CASE_PARTY_SELECT_FIELDS =
  "_id caseId clientId name partyType role address phone notes createdAt updatedAt";

/**
 * Strict population options for linked Client reference.
 * Restricts client data to display-safe non-sensitive summary fields.
 */
export const CASE_PARTY_CLIENT_POPULATE = {
  path: "clientId",
  select: "_id name clientNumber organizationName clientType phone email",
} as const;

export type CasePartyDocInput =
  | ICasePartyDocument
  | ICaseParty
  | IPopulatedCasePartyDoc
  | mongoose.FlattenMaps<ICasePartyDocument>
  | (Record<string, unknown> & { _id?: unknown });

/**
 * Format a lean CaseParty record into a type-safe CasePartyItemDto.
 * Extracts clean DTO fields, eliminates database internals, and prevents payload bloat.
 */
export function formatCasePartyItem(
  doc: CasePartyDocInput,
  clientDoc?: Record<string, unknown> | null
): CasePartyItemDto {
  const rawDoc = doc as Record<string, unknown>;
  const rawId = (doc as { _id?: unknown })._id;
  const id = rawId ? extractIdString(rawId) : "";
  const caseId = extractIdString(rawDoc.caseId);
  const partyType = (rawDoc.partyType as PartyType) || PARTY_TYPES.INDIVIDUAL;
  const role = (rawDoc.role as PartyRole) || PARTY_ROLES.PLAINTIFF;

  // Resolve client document from explicit parameter, or from populated clientId on doc
  const resolvedClientDoc =
    clientDoc !== undefined
      ? clientDoc
      : rawDoc.clientId &&
        typeof rawDoc.clientId === "object" &&
        "_id" in (rawDoc.clientId as object)
      ? (rawDoc.clientId as Record<string, unknown>)
      : null;

  const clientId = extractIdString(rawDoc.clientId) || null;

  const clientDto: CaseClientDto | null =
    resolvedClientDoc && resolvedClientDoc._id
      ? {
          id: extractIdString(resolvedClientDoc._id),
          clientNumber: (resolvedClientDoc.clientNumber as string) || "",
          name: (resolvedClientDoc.name as string) || "",
          organizationName: (resolvedClientDoc.organizationName as string) || null,
          clientType: (resolvedClientDoc.clientType as string) || "INDIVIDUAL",
          phone: (resolvedClientDoc.phone as string) || null,
          email: (resolvedClientDoc.email as string) || null,
        }
      : null;

  return {
    id,
    caseId,
    clientId,
    client: clientDto,
    name: (rawDoc.name as string) || "",
    partyType,
    partyTypeLabel: CASE_PARTY_TYPE_LABELS[partyType] || partyType,
    role,
    roleLabel: CASE_PARTY_ROLE_LABELS[role] || role,
    address: (rawDoc.address as string) || null,
    phone: (rawDoc.phone as string) || null,
    notes: (rawDoc.notes as string) || null,
    createdAt: formatSafeIsoDate(rawDoc.createdAt) || new Date().toISOString(),
    updatedAt: formatSafeIsoDate(rawDoc.updatedAt) || new Date().toISOString(),
  };
}

/**
 * GET /api/v1/cases/[id]/parties
 *
 * Case-scoped retrieval of involved parties, with search, role filtering,
 * pagination, and aggregate statistics strictly matching the filter.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const caseExists = await Case.exists({ _id: caseObjectId, deletedAt: null });
    if (!caseExists) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    const { searchParams } = new URL(req.url);

    // Validate limit parameter if provided
    const rawLimit = searchParams.get("limit");
    if (rawLimit !== null) {
      const parsedLimit = parseInt(rawLimit, 10);
      if (!CASE_PARTY_PAGE_LIMITS.includes(parsedLimit as CasePartyPageLimit)) {
        throw ApiError.badRequest(
          `Invalid page limit "${rawLimit}". Allowed page limits are: ${CASE_PARTY_PAGE_LIMITS.join(", ")}`
        );
      }
    }

    const rawParams = {
      search: sanitizeSearchParam(searchParams.get("search")),
      role: searchParams.get("role") || undefined,
      partyType: searchParams.get("partyType") || undefined,
      sort: searchParams.get("sort") || CASE_PARTY_SORT_OPTIONS.NAME_ASC,
      page: searchParams.get("page") || 1,
      limit: rawLimit ? parseInt(rawLimit, 10) : CASE_PARTY_DEFAULT_PAGE_LIMIT,
    };

    const parsed = casePartyQueryFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }

    const { search, role, partyType, sort, page, limit } = parsed.data;

    // Strict case-scoped filter
    const filter: Record<string, unknown> = {
      caseId: caseObjectId,
    };

    if (role && role !== "ALL") {
      filter.role = role;
    }

    if (partyType && partyType !== "ALL") {
      filter.partyType = partyType;
    }

    if (search) {
      const searchRegex = buildSearchRegex(search);
      if (searchRegex) {
        filter.$or = [
          { name: searchRegex },
          { phone: searchRegex },
          { address: searchRegex },
          { notes: searchRegex },
        ];
      }
    }

    const sortMap: Record<CasePartySortOption, Record<string, 1 | -1>> = {
      [CASE_PARTY_SORT_OPTIONS.NAME_ASC]: { name: 1 },
      [CASE_PARTY_SORT_OPTIONS.NAME_DESC]: { name: -1 },
      [CASE_PARTY_SORT_OPTIONS.ROLE_ASC]: { role: 1 },
      [CASE_PARTY_SORT_OPTIONS.NEWEST]: { createdAt: -1 },
      [CASE_PARTY_SORT_OPTIONS.OLDEST]: { createdAt: 1 },
    };

    const sortOption = sortMap[sort as CasePartySortOption] || { name: 1 };
    const skip = (page - 1) * limit;

    // Parallel aggregation strictly within parent case scope
    const [statsAggResult, parties] = await Promise.all([
      CaseParty.aggregate<{
        total: number;
        plaintiff: number;
        defendant: number;
        petitioner: number;
        respondent: number;
        oppositeParty: number;
        witness: number;
        other: number;
      }>([
        { $match: filter },
        { $project: { _id: 0, role: 1 } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            plaintiff: {
              $sum: { $cond: [{ $eq: ["$role", PARTY_ROLES.PLAINTIFF] }, 1, 0] },
            },
            defendant: {
              $sum: { $cond: [{ $eq: ["$role", PARTY_ROLES.DEFENDANT] }, 1, 0] },
            },
            petitioner: {
              $sum: { $cond: [{ $eq: ["$role", PARTY_ROLES.PETITIONER] }, 1, 0] },
            },
            respondent: {
              $sum: { $cond: [{ $eq: ["$role", PARTY_ROLES.RESPONDENT] }, 1, 0] },
            },
            oppositeParty: {
              $sum: { $cond: [{ $eq: ["$role", PARTY_ROLES.OPPOSITE_PARTY] }, 1, 0] },
            },
            witness: {
              $sum: { $cond: [{ $eq: ["$role", PARTY_ROLES.WITNESS] }, 1, 0] },
            },
            other: {
              $sum: {
                $cond: [
                  {
                    $not: {
                      $in: [
                        "$role",
                        [
                          PARTY_ROLES.PLAINTIFF,
                          PARTY_ROLES.DEFENDANT,
                          PARTY_ROLES.PETITIONER,
                          PARTY_ROLES.RESPONDENT,
                          PARTY_ROLES.OPPOSITE_PARTY,
                          PARTY_ROLES.WITNESS,
                        ],
                      ],
                    },
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      CaseParty.find(filter)
        .select(CASE_PARTY_SELECT_FIELDS)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate(CASE_PARTY_CLIENT_POPULATE)
        .lean(),
    ]);

    const rawStats = statsAggResult[0];
    const total = rawStats?.total ?? 0;

    const stats: CasePartyStatsDto = {
      total,
      plaintiff: rawStats?.plaintiff ?? 0,
      defendant: rawStats?.defendant ?? 0,
      petitioner: rawStats?.petitioner ?? 0,
      respondent: rawStats?.respondent ?? 0,
      oppositeParty: rawStats?.oppositeParty ?? 0,
      witness: rawStats?.witness ?? 0,
      other: rawStats?.other ?? 0,
    };

    const items: CasePartyItemDto[] = parties.map((p) =>
      formatCasePartyItem(p, p.clientId as Record<string, unknown> | null)
    );

    const response: CasePartyPaginationResponse = {
      items,
      total,
      page,
      limit: limit as CasePartyPageLimit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
      stats,
    };

    return NextResponse.json(response);
  }
);

/**
 * POST /api/v1/cases/[id]/parties
 *
 * Add a new party to a case.
 */
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const caseExists = await Case.exists({ _id: caseObjectId, deletedAt: null });
    if (!caseExists) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    const body = await req.json();
    const payload = {
      ...body,
      caseId: id,
    };

    const validated = createCasePartySchema.parse(payload);

    let clientObjectId: mongoose.Types.ObjectId | null = null;
    if (validated.clientId) {
      clientObjectId = new mongoose.Types.ObjectId(validated.clientId);
      const clientExists = await Client.exists({ _id: clientObjectId, deletedAt: null });
      if (!clientExists) {
        throw ApiError.badRequest("Selected client does not exist or has been archived.");
      }
    }

    const createdParty = await withTransaction(async (dbSession) => {
      const [partyDoc] = await CaseParty.create(
        [
          {
            caseId: caseObjectId,
            clientId: clientObjectId,
            name: validated.name.trim(),
            partyType: validated.partyType,
            role: validated.role,
            address: validated.address?.trim() || null,
            phone: validated.phone?.trim() || null,
            notes: validated.notes?.trim() || null,
          },
        ],
        { session: dbSession }
      );

      // Record audit log for case party creation
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        entityType: AUDIT_ENTITY_TYPES.CASE_PARTY,
        entityId: partyDoc._id,
        oldValues: null,
        newValues: partyDoc.toObject(),
        description: `Added party "${partyDoc.name}" (${partyDoc.role}) to case`,
        session: dbSession,
      });

      return partyDoc;
    });

    const populated = await CaseParty.findById(createdParty._id)
      .select(CASE_PARTY_SELECT_FIELDS)
      .populate(CASE_PARTY_CLIENT_POPULATE)
      .lean();

    if (!populated) {
      throw ApiError.notFound("Party record could not be retrieved after creation.");
    }

    const itemDto = formatCasePartyItem(
      populated,
      populated.clientId as Record<string, unknown> | null
    );

    const response: CasePartyActionResponse = {
      success: true,
      message: `Party "${itemDto.name}" added to case successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response, { status: 201 });
  }
);
