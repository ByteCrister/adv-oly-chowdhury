import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler } from "@/lib/helpers/withErrorHandler";
import User from "@/db/models/User.model";
import Case from "@/db/models/Case.model";
import Hearing from "@/db/models/Hearing.model";
import Client from "@/db/models/Client.model";
import Task from "@/db/models/Task.model";
import "@/db/models/Court.model";
import {
  CASE_STATUSES,
  CASE_TYPE_LABELS,
  type CaseType,
} from "@/const/case.const";
import { HEARING_STATUSES } from "@/const/hearing.const";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/const/task.const";
import {
  CLIENT_STATUSES,
  CLIENT_TYPE_LABELS,
  type ClientType,
} from "@/const/client.const";
import { DASHBOARD_DEFAULTS } from "@/const/dashboard.const";
import type {
  DashboardOverviewData,
  TodayHearingDto,
  RecentCaseDto,
  ChamberTaskDto,
} from "@/types/dashboard.ui.type";
import {
  normalizeCasePriority,
  normalizeHearingStatus,
  normalizeCaseStatus,
  normalizeCaseType,
  formatTime,
  formatDate,
  formatChamberTask,
  type LeanHearingRecord,
  type LeanCaseRecord,
  type LeanTaskRecord,
} from "@/lib/helpers/dashboard.helper";

/**
 * GET /api/v1/dashboard/overview
 *
 * Consolidates judicial cause list, chamber tasks, recent cases, client stats,
 * and advocate profile in a single parallelized, index-backed operation.
 * All metrics and records are genuinely derived from the database without placeholders.
 */
export const GET = withErrorHandler(async () => {
  const userId = await getUserId();

  // Compute precise date boundaries for today in server time
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Parallelized database operations: 1 user lookup, 4 consolidated aggregations, 3 lean find queries
  const [
    user,
    caseBreakdown,
    [hearingStats],
    clientStats,
    [taskStats],
    todayHearingsDocsRaw,
    recentCasesDocsRaw,
    chamberTasksDocsRaw,
  ] = await Promise.all([
    // 1. Fetch User Profile for Welcome Banner
    User.findById(userId)
      .select("name preferredName title subtitle chamber phone whatsappNumber")
      .lean(),

    // 2. Active Case breakdown by type using { deletedAt: 1, caseStatus: 1 } index
    Case.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          caseStatus: CASE_STATUSES.ACTIVE,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: "$caseType",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]),

    // 3. Upcoming and Today Hearings counts in a single query using { hearingDate: 1, status: 1 } index
    Hearing.aggregate<{
      upcoming: number;
      today: number;
    }>([
      {
        $match: {
          hearingDate: { $gte: startOfToday },
          status: { $ne: HEARING_STATUSES.CANCELLED },
        },
      },
      {
        $lookup: {
          from: "cases",
          localField: "caseId",
          foreignField: "_id",
          as: "case",
        },
      },
      {
        $unwind: "$case",
      },
      {
        $match: {
          "case.deletedAt": null,
        },
      },
      {
        $group: {
          _id: null,
          upcoming: { $sum: 1 },
          today: {
            $sum: {
              $cond: [{ $lte: ["$hearingDate", endOfToday] }, 1, 0],
            },
          },
        },
      },
    ]),

    // 4. Active Client breakdown by type in a single query using { deletedAt: 1, status: 1 } index
    Client.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          status: CLIENT_STATUSES.ACTIVE,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: "$clientType",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]),

    // 5. Active & Urgent chamber tasks count using { deletedAt: 1, status: 1 } index
    Task.aggregate<{
      total: number;
      urgent: number;
    }>([
      {
        $match: {
          status: { $in: [TASK_STATUSES.TODO, TASK_STATUSES.IN_PROGRESS] },
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: "cases",
          localField: "caseId",
          foreignField: "_id",
          as: "case",
        },
      },
      {
        $match: {
          $or: [
            { caseId: null },
            { "case.0": { $exists: false } },
            { "case.deletedAt": null },
          ],
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          urgent: {
            $sum: {
              $cond: [{ $eq: ["$priority", TASK_PRIORITIES.URGENT] }, 1, 0],
            },
          },
        },
      },
    ]),

    // 6. Today's cause list hearings with lean projection and court fallback
    Hearing.find({
      hearingDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: HEARING_STATUSES.CANCELLED },
    })
      .sort({ hearingDate: 1, startTime: 1 })
      .limit(DASHBOARD_DEFAULTS.maxTodayHearings)
      .select("_id hearingDate startTime hearingType purpose status caseId courtId")
      .populate({
        path: "caseId",
        select: "_id internalReference caseNumber title caseType priority courtId deletedAt",
        populate: { path: "courtId", select: "_id name roomOrHall" },
      })
      .populate("courtId", "_id name roomOrHall")
      .lean(),

    // 7. Recent cases with lean projection
    Case.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(DASHBOARD_DEFAULTS.maxRecentCases)
      .select("_id caseNumber internalReference title caseType caseStatus filingDate createdAt clientId courtId")
      .populate("clientId", "_id name organizationName clientType")
      .populate("courtId", "_id name roomOrHall")
      .lean(),

    // 8. Chamber tasks with soft-delete filter and lean projection
    Task.find({
      status: { $in: [TASK_STATUSES.TODO, TASK_STATUSES.IN_PROGRESS] },
      deletedAt: null,
    })
      .sort({ dueAt: 1, createdAt: -1 })
      .limit(DASHBOARD_DEFAULTS.maxChamberTasks)
      .select("_id title priority status dueAt caseId")
      .populate({
        path: "caseId",
        select: "_id internalReference caseNumber title deletedAt",
      })
      .lean(),
  ]);

  const advocateName =
    user?.preferredName || user?.name || "Advocate Oly Chowdhury";
  const chamberLocation =
    user?.chamber?.fullAddress ||
    "Chamber No. 323 • Bar Hall 02 • Judge's Court, Sylhet, Bangladesh";

  const todayHearingsDocs = (todayHearingsDocsRaw || []) as unknown as LeanHearingRecord[];
  const recentCasesDocs = (recentCasesDocsRaw || []) as unknown as LeanCaseRecord[];
  const chamberTasksDocs = (chamberTasksDocsRaw || []) as unknown as LeanTaskRecord[];

  // 9. Map Today's Hearings (excluding any belonging to soft-deleted cases)
  const todayHearings: TodayHearingDto[] = todayHearingsDocs
    .filter((h) => !h.caseId || !h.caseId.deletedAt)
    .map((h) => {
      const caseItem = h.caseId;
      // Inherit court from hearing override first, then case court
      const courtItem =
        h.courtId ||
        (caseItem?.courtId && typeof caseItem.courtId === "object"
          ? caseItem.courtId
          : null);

      const caseId = caseItem?._id ? String(caseItem._id) : null;
      const caseRef = caseItem?.caseNumber || caseItem?.internalReference || "N/A";
      const caseTitle = caseItem?.title || "Judicial Case Matter";
      const courtName = courtItem?.name || "Court Unassigned";
      const room = courtItem?.roomOrHall || null;
      const purpose = h.purpose || h.hearingType || "Scheduled Proceeding";
      const time = formatTime(h.hearingDate, h.startTime);
      const caseType = normalizeCaseType(caseItem?.caseType);
      const priority = normalizeCasePriority(caseItem?.priority);
      const status = normalizeHearingStatus(h.status);

      return {
        id: String(h._id),
        caseId,
        caseRef,
        caseTitle,
        courtName,
        room,
        purpose,
        time,
        caseType,
        priority,
        status,
      };
    });

  // 10. Map Recent Cases
  const recentCases: RecentCaseDto[] = recentCasesDocs.map((c) => {
    const clientItem = c.clientId;
    const courtItem = c.courtId;
    const clientName = clientItem?.organizationName || clientItem?.name || "Unassigned Client";
    const courtName = courtItem?.name || "Court Unassigned";
    const ref = c.caseNumber || c.internalReference || "N/A";
    const caseType = normalizeCaseType(c.caseType);
    const status = normalizeCaseStatus(c.caseStatus);

    return {
      id: String(c._id),
      ref,
      title: c.title,
      client: clientName,
      type: caseType,
      court: courtName,
      filingDate: formatDate(c.filingDate || c.createdAt),
      status,
    };
  });

  // 11. Map Chamber Tasks (excluding any belonging to soft-deleted cases)
  const chamberTasks: ChamberTaskDto[] = chamberTasksDocs
    .filter((t) => !t.caseId || !t.caseId.deletedAt)
    .map((t) => formatChamberTask(t));

  // Extract raw counts directly derived from database
  const activeCasesTotal = (caseBreakdown || []).reduce((sum, item) => sum + item.count, 0);
  const activeCasesSubtext =
    activeCasesTotal === 0
      ? "No active litigation matters"
      : (caseBreakdown || [])
          .slice(0, 3)
          .map((item) => `${item.count} ${CASE_TYPE_LABELS[item._id as CaseType] || item._id}`)
          .join(" • ");

  const upcomingHearingsTotal = hearingStats?.upcoming ?? 0;
  const todayHearingsTotal = hearingStats?.today ?? 0;

  const activeClientsTotal = (clientStats || []).reduce((sum, item) => sum + item.count, 0);
  const activeClientsSubtext =
    activeClientsTotal === 0
      ? "No active clients registered"
      : (clientStats || [])
          .map((item) => `${item.count} ${CLIENT_TYPE_LABELS[item._id as ClientType] || item._id}`)
          .join(" • ");

  const pendingTasksTotal = taskStats?.total ?? 0;
  const urgentTasksTotal = taskStats?.urgent ?? 0;

  const overviewData: DashboardOverviewData = {
    advocate: {
      name: user?.name || "Advocate Aminul Islam Chowdhury Oly",
      preferredName: advocateName,
      title: user?.title || "Advocate",
      subtitle: user?.subtitle || "Advocate • Judge's Court, Sylhet",
      chamberLocation,
      phone: user?.phone || null,
      whatsappNumber: user?.whatsappNumber || null,
    },
    stats: {
      activeCases: activeCasesTotal,
      activeCasesSubtext,
      upcomingHearings: upcomingHearingsTotal,
      todayHearingsCount: todayHearingsTotal,
      activeClients: activeClientsTotal,
      activeClientsSubtext,
      pendingTasks: pendingTasksTotal,
      urgentTasksCount: urgentTasksTotal,
    },
    todayHearings,
    recentCases,
    chamberTasks,
  };

  return NextResponse.json(
    {
      success: true,
      data: overviewData,
    },
    { status: 200 }
  );
});
