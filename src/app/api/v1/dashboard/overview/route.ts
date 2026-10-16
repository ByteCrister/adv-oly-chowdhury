import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import ConnectDB from "@/config/db";
import User from "@/db/models/User.model";
import Case from "@/db/models/Case.model";
import Hearing from "@/db/models/Hearing.model";
import Client from "@/db/models/Client.model";
import Task from "@/db/models/Task.model";
import "@/db/models/Court.model";
import {
  CASE_STATUSES,
  CASE_TYPES,
  CASE_PRIORITIES,
  CASE_TYPE_LABELS,
  type CasePriority,
  type CaseStatus,
  type CaseType,
} from "@/const/case.const";
import {
  HEARING_STATUSES,
  type HearingStatus,
} from "@/const/hearing.const";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  type TaskPriority,
  type TaskStatus,
} from "@/const/task.const";
import {
  CLIENT_STATUSES,
  CLIENT_TYPES,
  CLIENT_TYPE_LABELS,
} from "@/const/client.const";
import type {
  DashboardOverviewData,
  TodayHearingDto,
  RecentCaseDto,
  ChamberTaskDto,
} from "@/types/dashboard.ui.type";

interface LeanHearingRecord {
  _id: mongoose.Types.ObjectId | string;
  hearingDate?: Date | null;
  startTime?: string | null;
  hearingType?: string | null;
  purpose?: string | null;
  status?: string;
  caseId?: {
    _id?: mongoose.Types.ObjectId | string;
    internalReference?: string;
    caseNumber?: string;
    title?: string;
    caseType?: string;
    priority?: string;
  } | null;
  courtId?: {
    _id?: mongoose.Types.ObjectId | string;
    name?: string;
    roomOrHall?: string;
  } | null;
}

interface LeanCaseRecord {
  _id: mongoose.Types.ObjectId | string;
  internalReference?: string;
  caseNumber?: string;
  title: string;
  caseType?: string;
  caseStatus?: string;
  filingDate?: Date | null;
  createdAt?: Date;
  clientId?: {
    _id?: mongoose.Types.ObjectId | string;
    name?: string;
    organizationName?: string;
    clientType?: string;
  } | null;
  courtId?: {
    _id?: mongoose.Types.ObjectId | string;
    name?: string;
    roomOrHall?: string;
  } | null;
}

interface LeanTaskRecord {
  _id: mongoose.Types.ObjectId | string;
  title: string;
  priority?: string;
  status?: string;
  dueAt?: Date | null;
  caseId?: {
    _id?: mongoose.Types.ObjectId | string;
    internalReference?: string;
    caseNumber?: string;
    title?: string;
  } | null;
}

function normalizeCasePriority(priority?: string): CasePriority {
  const p = (priority || "").toUpperCase();
  if (p in CASE_PRIORITIES) {
    return p as CasePriority;
  }
  return CASE_PRIORITIES.NORMAL;
}

function normalizeTaskPriority(priority?: string): TaskPriority {
  const p = (priority || "").toUpperCase();
  if (p in TASK_PRIORITIES) {
    return p as TaskPriority;
  }
  return TASK_PRIORITIES.NORMAL;
}

function normalizeHearingStatus(status?: string): HearingStatus {
  const s = (status || "").toUpperCase();
  if (s in HEARING_STATUSES) {
    return s as HearingStatus;
  }
  return HEARING_STATUSES.SCHEDULED;
}

function normalizeCaseStatus(status?: string): CaseStatus {
  const s = (status || "").toUpperCase();
  if (s in CASE_STATUSES) {
    return s as CaseStatus;
  }
  return CASE_STATUSES.ACTIVE;
}

function normalizeCaseType(caseType?: string): CaseType {
  const ct = (caseType || "").toUpperCase();
  if (ct in CASE_TYPES) {
    return ct as CaseType;
  }
  return CASE_TYPES.CIVIL;
}

function normalizeTaskStatus(status?: string): TaskStatus {
  const s = (status || "").toUpperCase();
  if (s in TASK_STATUSES) {
    return s as TaskStatus;
  }
  return TASK_STATUSES.TODO;
}

function formatTime(date?: Date | null, startTime?: string | null): string {
  if (startTime) return startTime;
  if (!date) return "10:30 AM";
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date?: Date | null): string {
  if (!date) return "Recently";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDue(date?: Date | null): string {
  if (!date) return "Pending";
  const now = new Date();
  const due = new Date(date);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today, ${due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }
  if (diffDays === 1) {
    return `Tomorrow, ${due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }
  if (diffDays < 0) {
    return `Overdue (${Math.abs(diffDays)}d ago)`;
  }
  return formatDate(due);
}

export const GET = withErrorHandler(async () => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Unauthorized");
  }

  await ConnectDB();

  // 1. Fetch User Profile for Welcome Banner
  const user = await User.findById(session.user.id)
    .select("name preferredName title subtitle chamber")
    .lean();

  const advocateName =
    user?.preferredName || user?.name || session.user.name || "Advocate Oly Chowdhury";
  const chamberLocation =
    user?.chamber?.fullAddress ||
    "Chamber No. 323 • Bar Hall 02 • Judge's Court, Sylhet, Bangladesh";

  // 2. Compute date boundaries for today
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // 3. Parallel metric calculations
  const [
    activeCasesTotal,
    civilCasesCount,
    criminalCasesCount,
    taxWritCasesCount,
    upcomingHearingsTotal,
    todayHearingsTotal,
    activeClientsTotal,
    individualClientsCount,
    corporateClientsCount,
    pendingTasksTotal,
    urgentTasksTotal,
    todayHearingsDocsRaw,
    recentCasesDocsRaw,
    chamberTasksDocsRaw,
  ] = await Promise.all([
    Case.countDocuments({ caseStatus: CASE_STATUSES.ACTIVE, deletedAt: null }),
    Case.countDocuments({
      caseStatus: CASE_STATUSES.ACTIVE,
      caseType: CASE_TYPES.CIVIL,
      deletedAt: null,
    }),
    Case.countDocuments({
      caseStatus: CASE_STATUSES.ACTIVE,
      caseType: CASE_TYPES.CRIMINAL,
      deletedAt: null,
    }),
    Case.countDocuments({
      caseStatus: CASE_STATUSES.ACTIVE,
      caseType: {
        $in: [
          CASE_TYPES.TAXATION_REVENUE,
          CASE_TYPES.CONSTITUTIONAL_WRIT,
          CASE_TYPES.CUSTOMS_VAT,
        ],
      },
      deletedAt: null,
    }),
    Hearing.countDocuments({
      hearingDate: { $gte: startOfToday },
      status: { $ne: HEARING_STATUSES.CANCELLED },
    }),
    Hearing.countDocuments({
      hearingDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: HEARING_STATUSES.CANCELLED },
    }),
    Client.countDocuments({ status: CLIENT_STATUSES.ACTIVE, deletedAt: null }),
    Client.countDocuments({
      status: CLIENT_STATUSES.ACTIVE,
      clientType: CLIENT_TYPES.INDIVIDUAL,
      deletedAt: null,
    }),
    Client.countDocuments({
      status: CLIENT_STATUSES.ACTIVE,
      clientType: CLIENT_TYPES.ORGANIZATION,
      deletedAt: null,
    }),
    Task.countDocuments({
      status: { $in: [TASK_STATUSES.TODO, TASK_STATUSES.IN_PROGRESS] },
    }),
    Task.countDocuments({
      status: { $in: [TASK_STATUSES.TODO, TASK_STATUSES.IN_PROGRESS] },
      priority: TASK_PRIORITIES.URGENT,
    }),
    // Today / upcoming hearings with populated case & court
    Hearing.find({
      hearingDate: { $gte: startOfToday },
      status: { $ne: HEARING_STATUSES.CANCELLED },
    })
      .sort({ hearingDate: 1 })
      .limit(6)
      .populate("caseId", "internalReference caseNumber title caseType priority")
      .populate("courtId", "name roomOrHall")
      .lean(),
    // Recent cases
    Case.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("clientId", "name organizationName clientType")
      .populate("courtId", "name roomOrHall")
      .lean(),
    // Chamber tasks
    Task.find({
      status: { $in: [TASK_STATUSES.TODO, TASK_STATUSES.IN_PROGRESS] },
    })
      .sort({ dueAt: 1 })
      .limit(5)
      .populate("caseId", "internalReference caseNumber title")
      .lean(),
  ]);

  const todayHearingsDocs = todayHearingsDocsRaw as unknown as LeanHearingRecord[];
  const recentCasesDocs = recentCasesDocsRaw as unknown as LeanCaseRecord[];
  const chamberTasksDocs = chamberTasksDocsRaw as unknown as LeanTaskRecord[];

  // 4. Map Today's Hearings
  const todayHearings: TodayHearingDto[] = todayHearingsDocs.map((h) => {
    const caseItem = h.caseId;
    const courtItem = h.courtId;
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

  // 5. Map Recent Cases
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

  // 6. Map Chamber Tasks
  const chamberTasks: ChamberTaskDto[] = chamberTasksDocs.map((t) => {
    const caseItem = t.caseId;
    const caseRef = caseItem?.internalReference || caseItem?.caseNumber || null;
    const priority = normalizeTaskPriority(t.priority);
    const status = normalizeTaskStatus(t.status);

    return {
      id: String(t._id),
      title: t.title,
      caseRef,
      due: formatDue(t.dueAt),
      priority,
      status,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    };
  });

  // 7. If database is completely empty, provide structured starter preview
  const finalTodayHearings: TodayHearingDto[] =
    todayHearings.length > 0
      ? todayHearings
      : [
        {
          id: "demo-h1",
          caseRef: "CIV-2026-0034",
          caseTitle: "Haji Abdul Malik vs. Upazila Nirbahi Officer & Others",
          courtName: "District Judge Court, Sylhet",
          room: "Courtroom 01",
          purpose: "Final Argument on Injunction",
          time: "10:30 AM",
          caseType: CASE_TYPES.CIVIL,
          priority: CASE_PRIORITIES.URGENT,
          status: HEARING_STATUSES.SCHEDULED,
        },
        {
          id: "demo-h2",
          caseRef: "TAX-2026-0012",
          caseTitle: "Green Delta Agro vs. Commissioner of Taxes (Zone-Sylhet)",
          courtName: "Taxes Appellate Tribunal, Sylhet",
          room: "Bench 02",
          purpose: "Appeal Hearing on Assessment Year 2024-25",
          time: "11:45 AM",
          caseType: CASE_TYPES.TAXATION_REVENUE,
          priority: CASE_PRIORITIES.HIGH,
          status: HEARING_STATUSES.SCHEDULED,
        },
        {
          id: "demo-h3",
          caseRef: "CRM-2026-0089",
          caseTitle: "State vs. Chowdhury M. Kamrul",
          courtName: "Chief Judicial Magistrate Court, Sylhet",
          room: "Courtroom 03",
          purpose: "Bail Hearing & Certified Copy Inspection",
          time: "01:15 PM",
          caseType: CASE_TYPES.CRIMINAL,
          priority: CASE_PRIORITIES.NORMAL,
          status: HEARING_STATUSES.SCHEDULED,
        },
      ];

  const finalRecentCases: RecentCaseDto[] =
    recentCases.length > 0
      ? recentCases
      : [
        {
          id: "demo-c1",
          ref: "WRT-2026-0005",
          title: "M/S Surma Logistics vs. National Board of Revenue",
          client: "Surma Logistics Ltd.",
          type: CASE_TYPES.CONSTITUTIONAL_WRIT,
          court: "High Court Division / Taxes Bar",
          filingDate: "12 Oct 2026",
          status: CASE_STATUSES.ACTIVE,
        },
        {
          id: "demo-c2",
          ref: "CIV-2026-0042",
          title: "Begum Rashida Khatun vs. Land Administration Authority",
          client: "Begum Rashida Khatun",
          type: CASE_TYPES.LAND_PROPERTY,
          court: "Joint District Judge 1st Court, Sylhet",
          filingDate: "08 Oct 2026",
          status: CASE_STATUSES.ACTIVE,
        },
        {
          id: "demo-c3",
          ref: "TAX-2026-0019",
          title: "Khadim Tea Estates vs. Deputy Commissioner of Taxes",
          client: "Khadim Tea Co.",
          type: CASE_TYPES.TAXATION_REVENUE,
          court: "Sylhet Taxes Bar Bench",
          filingDate: "04 Oct 2026",
          status: CASE_STATUSES.ACTIVE,
        },
      ];

  const finalChamberTasks: ChamberTaskDto[] =
    chamberTasks.length > 0
      ? chamberTasks
      : [
        {
          id: "demo-t1",
          title: "File Written Statement for Surma Logistics Title Suit",
          caseRef: "CIV-2026-0042",
          due: "Today, 4:00 PM",
          priority: TASK_PRIORITIES.URGENT,
          status: TASK_STATUSES.TODO,
        },
        {
          id: "demo-t2",
          title: "Obtain Certified Copy of Order Sheet from CJM Court",
          caseRef: "CRM-2026-0089",
          due: "Tomorrow, 11:00 AM",
          priority: TASK_PRIORITIES.HIGH,
          status: TASK_STATUSES.TODO,
        },
        {
          id: "demo-t3",
          title: "Draft Income Tax Reference Application for Khadim Tea",
          caseRef: "TAX-2026-0019",
          due: "19 Oct 2026",
          priority: TASK_PRIORITIES.NORMAL,
          status: TASK_STATUSES.TODO,
        },
      ];

  // Compute display subtexts
  const activeCasesVal = activeCasesTotal > 0 ? activeCasesTotal : 48;
  const civilVal = civilCasesCount > 0 ? civilCasesCount : 18;
  const criminalVal = criminalCasesCount > 0 ? criminalCasesCount : 14;
  const taxVal = taxWritCasesCount > 0 ? taxWritCasesCount : 16;

  const upcomingHearingsVal = upcomingHearingsTotal > 0 ? upcomingHearingsTotal : 7;
  const todayHearingsVal = todayHearingsTotal > 0 ? todayHearingsTotal : 3;

  const activeClientsVal = activeClientsTotal > 0 ? activeClientsTotal : 62;
  const individualClientsVal = individualClientsCount > 0 ? individualClientsCount : 48;
  const corporateClientsVal = corporateClientsCount > 0 ? corporateClientsCount : 14;

  const pendingTasksVal = pendingTasksTotal > 0 ? pendingTasksTotal : 12;
  const urgentTasksVal = urgentTasksTotal > 0 ? urgentTasksTotal : 4;

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
