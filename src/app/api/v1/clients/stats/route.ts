import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { Client } from "@/db/models/Client.model";
import { Case } from "@/db/models/Case.model";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { CLIENT_STATUSES, CLIENT_TYPES } from "@/const/client.const";
import { CASE_STATUSES } from "@/const/case.const";
import type { ClientOverallStatsDto } from "@/types/client.types";
import ConnectDB from "@/db";

/**
 * GET /api/v1/clients/stats
 *
 * Compute application-wide aggregate statistics for the client management dashboard.
 */
export const GET = withErrorHandler(async () => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Authentication required");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  await ConnectDB();

  const [
    totalClients,
    activeClients,
    inactiveClients,
    archivedClients,
    individualClients,
    corporateClients,
    activeCaseClientIds,
    revenueAgg,
    thisMonthRevenueAgg,
    newClientsThisMonth,
  ] = await Promise.all([
    Client.countDocuments({ deletedAt: null }),
    Client.countDocuments({ status: CLIENT_STATUSES.ACTIVE, deletedAt: null }),
    Client.countDocuments({ status: CLIENT_STATUSES.INACTIVE, deletedAt: null }),
    Client.countDocuments({ status: CLIENT_STATUSES.ARCHIVED, deletedAt: null }),
    Client.countDocuments({ clientType: CLIENT_TYPES.INDIVIDUAL, deletedAt: null }),
    Client.countDocuments({ clientType: CLIENT_TYPES.ORGANIZATION, deletedAt: null }),
    Case.distinct("clientId", {
      caseStatus: CASE_STATUSES.ACTIVE,
      deletedAt: null,
    }),
    ClientPayment.aggregate<{ total: number }>([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ClientPayment.aggregate<{ total: number }>([
      { $match: { paymentDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Client.countDocuments({
      createdAt: { $gte: startOfMonth },
      deletedAt: null,
    }),
  ]);

  const stats: ClientOverallStatsDto = {
    totalClients,
    activeClients,
    inactiveClients,
    archivedClients,
    individualClients,
    corporateClients,
    clientsWithActiveCases: activeCaseClientIds.length,
    totalRevenueCollected: revenueAgg[0]?.total ?? 0,
    thisMonthRevenue: thisMonthRevenueAgg[0]?.total ?? 0,
    newClientsThisMonth,
  };

  return NextResponse.json({
    success: true,
    data: stats,
  });
});
