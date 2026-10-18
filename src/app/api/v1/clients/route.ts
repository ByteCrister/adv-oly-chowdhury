import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import { Client } from "@/db/models/Client.model";
import { Case } from "@/db/models/Case.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import {
  CLIENT_DEFAULT_PAGE_LIMIT,
  CLIENT_PAGE_LIMITS,
  CLIENT_SORT_OPTIONS,
  CLIENT_TYPE_LABELS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUSES,
  CLIENT_TYPES,
  ClientPageLimit,
  ClientSortOption,
  ClientType,
  ClientStatus,
} from "@/const/client.const";
import { CASE_STATUSES } from "@/const/case.const";
import { createClientSchema, clientQueryFilterSchema } from "@/utils/zod/client.validation";
import type {
  ClientListItemDto,
  ClientPaginationResponse,
  ClientActionResponse,
  ClientDetailDto,
  ClientOverallStatsDto,
} from "@/types/client.types";
import type { IClientDocument } from "@/types/db/client.type";
import ConnectDB from "@/db";

/**
 * Generate a sequential, year-scoped clientNumber (e.g. CL-2026-0001).
 */
async function generateClientNumber(dbSession?: mongoose.ClientSession): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CL-${currentYear}-`;

  const query = Client.findOne(
    { clientNumber: { $regex: new RegExp(`^${prefix}\\d+$`) } },
    { clientNumber: 1 }
  ).sort({ clientNumber: -1 });

  if (dbSession) {
    query.session(dbSession);
  }

  const lastClient = await query.lean();

  let nextSeq = 1;
  if (lastClient?.clientNumber) {
    const parts = lastClient.clientNumber.split("-");
    const numPart = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(numPart)) {
      nextSeq = numPart + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

/**
 * Format a Client document into a ClientListItemDto.
 */
function formatClientListItem(
  client: IClientDocument | Record<string, unknown>,
  counts?: {
    totalCases?: number;
    activeCases?: number;
    totalDocuments?: number;
    totalPayments?: number;
    totalPaidAmount?: number;
  }
): ClientListItemDto {
  const cType = client.clientType as ClientType;
  const cStatus = client.status as ClientStatus;
  const totalCases = counts?.totalCases ?? 0;
  const activeCases = counts?.activeCases ?? 0;
  const totalDocuments = counts?.totalDocuments ?? 0;
  const totalPayments = counts?.totalPayments ?? 0;
  const totalPaidAmount = counts?.totalPaidAmount ?? 0;

  return {
    id: (client._id as mongoose.Types.ObjectId).toString(),
    clientNumber: (client.clientNumber as string) || "",
    clientType: cType,
    clientTypeLabel: CLIENT_TYPE_LABELS[cType] || String(client.clientType),
    status: cStatus,
    statusLabel: CLIENT_STATUS_LABELS[cStatus] || String(client.status),
    name: client.name as string,
    organizationName: (client.organizationName as string) || null,
    phone: (client.phone as string) || null,
    email: (client.email as string) || null,
    nationalId: (client.nationalId as string) || null,
    address: (client.address as string) || null,
    totalCases,
    activeCases,
    totalDocuments,
    totalPayments,
    totalPaidAmount,
    isDeletable: totalCases === 0 && totalPayments === 0,
    createdAt: client.createdAt ? new Date(client.createdAt as Date).toISOString() : "",
    updatedAt: client.updatedAt ? new Date(client.updatedAt as Date).toISOString() : "",
  };
}

/**
 * GET /api/v1/clients
 *
 * Paginated list of clients with search, sorting, filtering, and relation counts.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const { searchParams } = new URL(req.url);

  // Validate limit parameter if provided
  const rawLimit = searchParams.get("limit");
  if (rawLimit !== null) {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!CLIENT_PAGE_LIMITS.includes(parsedLimit as ClientPageLimit)) {
      throw ApiError.badRequest(
        `Invalid page limit "${rawLimit}". Allowed page limits are: ${CLIENT_PAGE_LIMITS.join(", ")}`
      );
    }
  }

  // Parse and validate query parameters
  const rawParams = {
    search: sanitizeSearchParam(searchParams.get("search")),
    clientType: searchParams.get("clientType") || undefined,
    status: searchParams.get("status") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || CLIENT_SORT_OPTIONS.NEWEST,
    page: searchParams.get("page") || 1,
    limit: rawLimit ? parseInt(rawLimit, 10) : CLIENT_DEFAULT_PAGE_LIMIT,
  };

  const parsed = clientQueryFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
  }

  const { search, clientType, status, startDate, endDate, sort, page, limit } = parsed.data;

  // Build MongoDB query filter (only active, non-deleted clients)
  const filter: Record<string, unknown> = {
    deletedAt: null,
  };

  if (clientType && clientType !== "ALL") {
    filter.clientType = clientType;
  }

  if (status && status !== "ALL") {
    filter.status = status;
  }

  // Date Range Filtering on createdAt
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
    filter.createdAt = dateQuery;
  }

  // Search across name, organizationName, clientNumber, phone, nationalId, email
  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      filter.$or = [
        { name: searchRegex },
        { organizationName: searchRegex },
        { clientNumber: searchRegex },
        { phone: searchRegex },
        { alternatePhone: searchRegex },
        { nationalId: searchRegex },
        { email: searchRegex },
      ];
    }
  }

  // Determine sorting
  const sortMap: Record<ClientSortOption, Record<string, 1 | -1>> = {
    [CLIENT_SORT_OPTIONS.NEWEST]: { createdAt: -1 },
    [CLIENT_SORT_OPTIONS.OLDEST]: { createdAt: 1 },
    [CLIENT_SORT_OPTIONS.NAME_ASC]: { name: 1 },
    [CLIENT_SORT_OPTIONS.NAME_DESC]: { name: -1 },
    [CLIENT_SORT_OPTIONS.CLIENT_NUMBER_ASC]: { clientNumber: 1 },
    [CLIENT_SORT_OPTIONS.CLIENT_NUMBER_DESC]: { clientNumber: -1 },
  };

  const sortOption = sortMap[sort as ClientSortOption] || { createdAt: -1 };
  const skip = (page - 1) * limit;

  await ConnectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  // Execute client aggregation (for counts and stats) and paginated find queries in parallel
  const [statsAggResult, clients] = await Promise.all([
    Client.aggregate<{
      total: number;
      active: number;
      inactive: number;
      archived: number;
      individual: number;
      corporate: number;
      newThisMonth: number;
      matchedIds: mongoose.Types.ObjectId[];
    }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$status", CLIENT_STATUSES.ACTIVE] }, 1, 0] },
          },
          inactive: {
            $sum: { $cond: [{ $eq: ["$status", CLIENT_STATUSES.INACTIVE] }, 1, 0] },
          },
          archived: {
            $sum: { $cond: [{ $eq: ["$status", CLIENT_STATUSES.ARCHIVED] }, 1, 0] },
          },
          individual: {
            $sum: { $cond: [{ $eq: ["$clientType", CLIENT_TYPES.INDIVIDUAL] }, 1, 0] },
          },
          corporate: {
            $sum: { $cond: [{ $eq: ["$clientType", CLIENT_TYPES.ORGANIZATION] }, 1, 0] },
          },
          newThisMonth: {
            $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0] },
          },
          matchedIds: { $push: "$_id" },
        },
      },
    ]),
    Client.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
  ]);

  const rawStats = statsAggResult[0];
  const total = rawStats?.total ?? 0;
  const matchedClientIds = rawStats?.matchedIds ?? [];

  const clientIds = clients.map((c) => c._id as mongoose.Types.ObjectId);

  // In parallel: fetch page item relations AND cross-client aggregate metrics
  const [
    caseAggregations,
    documentCounts,
    paymentAggregations,
    activeCaseClientIds,
    revenueAgg,
    thisMonthRevenueAgg,
  ] = await Promise.all([
    clientIds.length > 0
      ? Case.aggregate<{
          _id: mongoose.Types.ObjectId;
          totalCases: number;
          activeCases: number;
        }>([
          { $match: { clientId: { $in: clientIds }, deletedAt: null } },
          {
            $group: {
              _id: "$clientId",
              totalCases: { $sum: 1 },
              activeCases: {
                $sum: {
                  $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.ACTIVE] }, 1, 0],
                },
              },
            },
          },
        ])
      : [],
    clientIds.length > 0
      ? ClientDocument.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
          { $match: { clientId: { $in: clientIds } } },
          { $group: { _id: "$clientId", count: { $sum: 1 } } },
        ])
      : [],
    clientIds.length > 0
      ? ClientPayment.aggregate<{
          _id: mongoose.Types.ObjectId;
          totalPayments: number;
          totalPaidAmount: number;
        }>([
          { $match: { clientId: { $in: clientIds } } },
          {
            $group: {
              _id: "$clientId",
              totalPayments: { $sum: 1 },
              totalPaidAmount: { $sum: "$amount" },
            },
          },
        ])
      : [],
    matchedClientIds.length > 0
      ? Case.distinct("clientId", {
          clientId: { $in: matchedClientIds },
          caseStatus: CASE_STATUSES.ACTIVE,
          deletedAt: null,
        })
      : [],
    matchedClientIds.length > 0
      ? ClientPayment.aggregate<{ total: number }>([
          { $match: { clientId: { $in: matchedClientIds } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
      : [],
    matchedClientIds.length > 0
      ? ClientPayment.aggregate<{ total: number }>([
          {
            $match: {
              clientId: { $in: matchedClientIds },
              paymentDate: { $gte: startOfMonth },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
      : [],
  ]);

  const caseMap = new Map(
    caseAggregations.map((item) => [
      item._id.toString(),
      { totalCases: item.totalCases, activeCases: item.activeCases },
    ])
  );
  const docMap = new Map(
    documentCounts.map((item) => [item._id.toString(), item.count])
  );
  const paymentMap = new Map(
    paymentAggregations.map((item) => [
      item._id.toString(),
      { totalPayments: item.totalPayments, totalPaidAmount: item.totalPaidAmount },
    ])
  );

  const items: ClientListItemDto[] = clients.map((c) => {
    const idStr = (c._id as mongoose.Types.ObjectId).toString();
    const caseData = caseMap.get(idStr);
    const paymentData = paymentMap.get(idStr);

    return formatClientListItem(c, {
      totalCases: caseData?.totalCases ?? 0,
      activeCases: caseData?.activeCases ?? 0,
      totalDocuments: docMap.get(idStr) ?? 0,
      totalPayments: paymentData?.totalPayments ?? 0,
      totalPaidAmount: paymentData?.totalPaidAmount ?? 0,
    });
  });

  const stats: ClientOverallStatsDto = {
    totalClients: total,
    activeClients: rawStats?.active ?? 0,
    inactiveClients: rawStats?.inactive ?? 0,
    archivedClients: rawStats?.archived ?? 0,
    individualClients: rawStats?.individual ?? 0,
    corporateClients: rawStats?.corporate ?? 0,
    clientsWithActiveCases: activeCaseClientIds.length,
    totalRevenueCollected: revenueAgg[0]?.total ?? 0,
    thisMonthRevenue: thisMonthRevenueAgg[0]?.total ?? 0,
    newClientsThisMonth: rawStats?.newThisMonth ?? 0,
  };

  const response: ClientPaginationResponse = {
    items,
    total,
    page,
    limit: limit as ClientPageLimit,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: page * limit < total,
    stats,
  };

  return NextResponse.json(response);
});

/**
 * POST /api/v1/clients
 *
 * Create a new client inside a database transaction with duplicate validation
 * and deterministic clientNumber generation if omitted.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const body = await req.json();
  const validated = createClientSchema.parse(body);

  // If clientNumber is provided, check for uniqueness
  if (validated.clientNumber) {
    const existingClient = await Client.findOne({
      clientNumber: validated.clientNumber.trim().toUpperCase(),
    });

    if (existingClient) {
      throw ApiError.conflict(
        `A client with number "${validated.clientNumber.trim().toUpperCase()}" already exists.`
      );
    }
  }

  await ConnectDB();

  // Create client inside transaction with auto-generated clientNumber fallback
  const createdClient = await withTransaction(async (dbSession) => {
    let clientNumber = validated.clientNumber?.trim().toUpperCase();

    if (!clientNumber) {
      clientNumber = await generateClientNumber(dbSession);
    }

    const [client] = await Client.create(
      [
        {
          clientNumber,
          clientType: validated.clientType,
          status: validated.status,
          name: validated.name.trim(),
          organizationName: validated.organizationName?.trim() || null,
          fatherOrSpouseName: validated.fatherOrSpouseName?.trim() || null,
          motherName: validated.motherName?.trim() || null,
          dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
          nationalId: validated.nationalId?.trim() || null,
          phone: validated.phone?.trim() || null,
          alternatePhone: validated.alternatePhone?.trim() || null,
          email: validated.email?.trim() || null,
          address: validated.address?.trim() || null,
          permanentAddress: validated.permanentAddress?.trim() || null,
          notes: validated.notes?.trim() || null,
          deletedAt: null,
        },
      ],
      { session: dbSession }
    );

    return client;
  });

  const detailDto: ClientDetailDto = {
    id: createdClient._id.toString(),
    clientNumber: createdClient.clientNumber,
    clientType: createdClient.clientType,
    clientTypeLabel: CLIENT_TYPE_LABELS[createdClient.clientType],
    status: createdClient.status,
    statusLabel: CLIENT_STATUS_LABELS[createdClient.status],
    name: createdClient.name,
    organizationName: createdClient.organizationName || null,
    fatherOrSpouseName: createdClient.fatherOrSpouseName || null,
    motherName: createdClient.motherName || null,
    dateOfBirth: createdClient.dateOfBirth
      ? new Date(createdClient.dateOfBirth).toISOString()
      : null,
    nationalId: createdClient.nationalId || null,
    phone: createdClient.phone || null,
    alternatePhone: createdClient.alternatePhone || null,
    email: createdClient.email || null,
    address: createdClient.address || null,
    permanentAddress: createdClient.permanentAddress || null,
    notes: createdClient.notes || null,
    isDeletable: true,
    stats: {
      totalCases: 0,
      activeCases: 0,
      closedCases: 0,
      totalDocuments: 0,
      totalPayments: 0,
      totalPaidAmount: 0,
      lastPaymentDate: null,
      pendingTasksCount: 0,
    },
    recentCases: [],
    recentDocuments: [],
    recentPayments: [],
    createdAt: createdClient.createdAt ? new Date(createdClient.createdAt).toISOString() : "",
    updatedAt: createdClient.updatedAt ? new Date(createdClient.updatedAt).toISOString() : "",
  };

  const response: ClientActionResponse = {
    success: true,
    message: `Client "${createdClient.name}" (${createdClient.clientNumber}) created successfully.`,
    data: detailDto,
  };

  return NextResponse.json(response, { status: 201 });
});
