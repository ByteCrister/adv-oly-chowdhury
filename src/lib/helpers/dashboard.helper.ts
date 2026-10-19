import mongoose from "mongoose";
import {
  CASE_STATUSES,
  CASE_TYPES,
  CASE_PRIORITIES,
  CASE_PRIORITY_LIST,
  CASE_STATUS_LIST,
  CASE_TYPE_LIST,
  type CasePriority,
  type CaseStatus,
  type CaseType,
} from "@/const/case.const";
import {
  HEARING_STATUSES,
  HEARING_STATUS_LIST,
  type HearingStatus,
} from "@/const/hearing.const";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_PRIORITY_LIST,
  TASK_STATUS_LIST,
  type TaskPriority,
  type TaskStatus,
} from "@/const/task.const";
import type {
  TodayHearingDto,
  RecentCaseDto,
  ChamberTaskDto,
} from "@/types/dashboard.ui.type";

export interface LeanHearingRecord {
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
    courtId?: {
      _id?: mongoose.Types.ObjectId | string;
      name?: string;
      roomOrHall?: string;
    } | null;
    deletedAt?: Date | null;
  } | null;
  courtId?: {
    _id?: mongoose.Types.ObjectId | string;
    name?: string;
    roomOrHall?: string;
  } | null;
}

export interface LeanCaseRecord {
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

export interface LeanTaskRecord {
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
    deletedAt?: Date | null;
  } | null;
}

export function normalizeCasePriority(priority?: string): CasePriority {
  const p = (priority || "").toUpperCase();
  if (CASE_PRIORITY_LIST.includes(p as CasePriority)) {
    return p as CasePriority;
  }
  return CASE_PRIORITIES.NORMAL;
}

export function normalizeTaskPriority(priority?: string): TaskPriority {
  const p = (priority || "").toUpperCase();
  if (TASK_PRIORITY_LIST.includes(p as TaskPriority)) {
    return p as TaskPriority;
  }
  return TASK_PRIORITIES.NORMAL;
}

export function normalizeHearingStatus(status?: string): HearingStatus {
  const s = (status || "").toUpperCase();
  if (HEARING_STATUS_LIST.includes(s as HearingStatus)) {
    return s as HearingStatus;
  }
  return HEARING_STATUSES.SCHEDULED;
}

export function normalizeCaseStatus(status?: string): CaseStatus {
  const s = (status || "").toUpperCase();
  if (CASE_STATUS_LIST.includes(s as CaseStatus)) {
    return s as CaseStatus;
  }
  return CASE_STATUSES.ACTIVE;
}

export function normalizeCaseType(caseType?: string): CaseType {
  const ct = (caseType || "").toUpperCase();
  if (CASE_TYPE_LIST.includes(ct as CaseType)) {
    return ct as CaseType;
  }
  return CASE_TYPES.CIVIL;
}

export function normalizeTaskStatus(status?: string): TaskStatus {
  const s = (status || "").toUpperCase();
  if (TASK_STATUS_LIST.includes(s as TaskStatus)) {
    return s as TaskStatus;
  }
  return TASK_STATUSES.TODO;
}

export function formatTime(date?: Date | null, startTime?: string | null): string {
  if (startTime) return startTime;
  if (!date) return "10:30 AM";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "10:30 AM";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(date?: Date | null): string {
  if (!date) return "Recently";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDue(date?: Date | null): string {
  if (!date) return "Pending";
  const due = new Date(date);
  if (isNaN(due.getTime())) return "Pending";
  const now = new Date();

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diffDays = Math.round((dueMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

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

export function formatChamberTask(t: LeanTaskRecord): ChamberTaskDto {
  const caseItem = t.caseId && !t.caseId.deletedAt ? t.caseId : null;
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
    dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : null,
  };
}

export const DEMO_TODAY_HEARINGS: TodayHearingDto[] = [
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

export const DEMO_RECENT_CASES: RecentCaseDto[] = [
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

export const DEMO_CHAMBER_TASKS: ChamberTaskDto[] = [
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
