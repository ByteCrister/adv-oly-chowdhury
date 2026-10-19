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
  CASE_TYPES,
  CASE_TYPE_LABELS,
} from "@/const/case.const";
import { HEARING_STATUSES } from "@/const/hearing.const";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/const/task.const";
import {
  CLIENT_STATUSES,
  CLIENT_TYPES,
  CLIENT_TYPE_LABELS,
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
  DEMO_TODAY_HEARINGS,
  DEMO_RECENT_CASES,
  DEMO_CHAMBER_TASKS,
  type LeanHearingRecord,
  type LeanCaseRecord,
  type LeanTaskRecord,
} from "@/lib/helpers/dashboard.helper";

/**
 * GET /api/v1/dashboard/overview
 *
 * Consolidates judicial cause list, chamber tasks, recent cases, client stats,
 * and welcome advocate profile in a single parallelized, index-backed operation.
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
    [caseStats],
    [hearingStats],
    [clientStats],
    [taskStats],
    todayHearingsDocsRaw,
    recentCasesDocsRaw,
    chamberTasksDocsRaw,
  ] = await Promise.all([
    // 1. Fetch User Profile for Welcome Banner
    User.findById(userId)
      .select("name preferredName title subtitle chamber phone whatsappNumber")
      .lean(),

    // 2. Case breakdown aggregated in a single query using { deletedAt: 1, caseStatus: 1 } index
    Case.aggregate<{
      total: number;
      civil: number;
      criminal: number;
      taxWrit: number;
    }>([
      {
        $match: {
          caseStatus: CASE_STATUSES.ACTIVE,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          civil: {
            $sum: { $cond: [{ $eq: ["$caseType", CASE_TYPES.CIVIL] }, 1, 0] },
          },
          criminal: {
            $sum: { $cond: [{ $eq: ["$caseType", CASE_TYPES.CRIMINAL] }, 1, 0] },
          },
          taxWrit: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$caseType",
                    [
                      CASE_TYPES.TAXATION_REVENUE,
                      CASE_TYPES.CONSTITUTIONAL_WRIT,
                      CASE_TYPES.CUSTOMS_VAT,
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
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

    // 4. Client breakdown in a single query using { deletedAt: 1, status: 1 } index
    Client.aggregate<{
      total: number;
      individual: number;
      corporate: number;
    }>([
      {
        $match: {
          status: CLIENT_STATUSES.ACTIVE,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          individual: {
            $sum: {
              $cond: [{ $eq: ["$clientType", CLIENT_TYPES.INDIVIDUAL] }, 1, 0],
            },
          },
          corporate: {
            $sum: {
              $cond: [
                { $eq: ["$clientType", CLIENT_TYPES.ORGANIZATION] },
                1,
                0,
              ],
            },
          },
        },
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

    // 6. Today & upcoming cause list with lean projection and court fallback
    Hearing.find({
      hearingDate: { $gte: startOfToday },
      status: { $ne: HEARING_STATUSES.CANCELLED },
    })
      .sort({ hearingDate: 1 })
      .limit(DASHBOARD_DEFAULTS.maxTodayHearings)
      .select("_id hearingDate startTime hearingType purpose status caseId courtId")
      .populate({
        path: "caseId",
        select: "internalReference caseNumber title caseType priority courtId deletedAt",
        populate: { path: "courtId", select: "name roomOrHall" },
      })
      .populate("courtId", "name roomOrHall")
      .lean(),

    // 7. Recent cases with lean projection
    Case.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(DASHBOARD_DEFAULTS.maxRecentCases)
      .select("_id caseNumber internalReference title caseType caseStatus filingDate createdAt clientId courtId")
      .populate("clientId", "name organizationName clientType")
      .populate("courtId", "name roomOrHall")
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
        select: "internalReference caseNumber title deletedAt",
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
      // Inherit court from hearing override first, then case court, then chamber court default
      const courtItem =
        h.courtId ||
        (caseItem?.courtId && typeof caseItem.courtId === "object"
          ? caseItem.courtId
          : null);

      const caseRef = caseItem?.caseNumber || caseItem?.internalReference || "N/A";
      const caseTitle = caseItem?.title || "Judicial Case Matter";
      const courtName = courtItem?.name || "Judge's Court, Sylhet";
      const room = courtItem?.roomOrHall || "Courtroom 01";
      const purpose = h.purpose || h.hearingType || "Hearing & Examination";
      const time = formatTime(h.hearingDate, h.startTime);
      const caseType = normalizeCaseType(caseItem?.caseType);
      const priority = normalizeCasePriority(caseItem?.priority);
      const status = normalizeHearingStatus(h.status);

      return {
        id: String(h._id),
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
    const clientName = clientItem?.organizationName || clientItem?.name || "Private Client";
    const courtName = courtItem?.name || "District Judge Court, Sylhet";
    const ref = c.caseNumber || c.internalReference || "REF-2026";
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

  // 11. Map Chamber Tasks
  const chamberTasks: ChamberTaskDto[] = chamberTasksDocs.map((t) => formatChamberTask(t));

  // Extract raw counts with 0 defaults
  const activeCasesTotal = caseStats?.total ?? 0;
  const civilCasesCount = caseStats?.civil ?? 0;
  const criminalCasesCount = caseStats?.criminal ?? 0;
  const taxWritCasesCount = caseStats?.taxWrit ?? 0;

  const upcomingHearingsTotal = hearingStats?.upcoming ?? 0;
  const todayHearingsTotal = hearingStats?.today ?? 0;

  const activeClientsTotal = clientStats?.total ?? 0;
  const individualClientsCount = clientStats?.individual ?? 0;
  const corporateClientsCount = clientStats?.corporate ?? 0;

  const pendingTasksTotal = taskStats?.total ?? 0;
  const urgentTasksTotal = taskStats?.urgent ?? 0;

  // Determine whether the system is in an unseeded starter mode
  const isDatabaseEmpty =
    activeCasesTotal === 0 &&
    activeClientsTotal === 0 &&
    upcomingHearingsTotal === 0 &&
    pendingTasksTotal === 0 &&
    recentCasesDocs.length === 0;

  // Compute final display datasets and stats
  const finalTodayHearings: TodayHearingDto[] = isDatabaseEmpty
    ? DEMO_TODAY_HEARINGS
    : todayHearings;

  const finalRecentCases: RecentCaseDto[] = isDatabaseEmpty
    ? DEMO_RECENT_CASES
    : recentCases;

  const finalChamberTasks: ChamberTaskDto[] = isDatabaseEmpty
    ? DEMO_CHAMBER_TASKS
    : chamberTasks;

  const activeCasesVal = isDatabaseEmpty ? 48 : activeCasesTotal;
  const civilVal = isDatabaseEmpty ? 18 : civilCasesCount;
  const criminalVal = isDatabaseEmpty ? 14 : criminalCasesCount;
  const taxVal = isDatabaseEmpty ? 16 : taxWritCasesCount;

  const upcomingHearingsVal = isDatabaseEmpty ? 7 : upcomingHearingsTotal;
  const todayHearingsVal = isDatabaseEmpty ? 3 : todayHearingsTotal;

  const activeClientsVal = isDatabaseEmpty ? 62 : activeClientsTotal;
  const individualClientsVal = isDatabaseEmpty ? 48 : individualClientsCount;
  const corporateClientsVal = isDatabaseEmpty ? 14 : corporateClientsCount;

  const pendingTasksVal = isDatabaseEmpty ? 12 : pendingTasksTotal;
  const urgentTasksVal = isDatabaseEmpty ? 4 : urgentTasksTotal;

  const overviewData: DashboardOverviewData = {
    advocate: {
      name: user?.name || "Advocate Aminul Islam Chowdhury Oly",
      preferredName: advocateName,
      title: user?.title || "Advocate",
      subtitle: user?.subtitle || "Advocate • Judge's Court, Sylhet",
      chamberLocation,
      phone: user?.phone || "01712-459840",
      whatsappNumber: user?.whatsappNumber || "+8801712459840",
    },
    stats: {
      activeCases: activeCasesVal,
      activeCasesSubtext: `${civilVal} ${CASE_TYPE_LABELS[CASE_TYPES.CIVIL]} • ${criminalVal} ${CASE_TYPE_LABELS[CASE_TYPES.CRIMINAL]} • ${taxVal} ${CASE_TYPE_LABELS[CASE_TYPES.TAXATION_REVENUE]}`,
      upcomingHearings: upcomingHearingsVal,
      todayHearingsCount: todayHearingsVal,
      activeClients: activeClientsVal,
      activeClientsSubtext: `${individualClientsVal} ${CLIENT_TYPE_LABELS[CLIENT_TYPES.INDIVIDUAL]} • ${corporateClientsVal} ${CLIENT_TYPE_LABELS[CLIENT_TYPES.ORGANIZATION]}`,
      pendingTasks: pendingTasksVal,
      urgentTasksCount: urgentTasksVal,
    },
    todayHearings: finalTodayHearings,
    recentCases: finalRecentCases,
    chamberTasks: finalChamberTasks,
  };

  return NextResponse.json(
    {
      success: true,
      data: overviewData,
    },
    { status: 200 }
  );
});
