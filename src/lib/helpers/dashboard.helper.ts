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
  if (!date) return "Time TBD";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Time TBD";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(date?: Date | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDue(date?: Date | null): string {
  if (!date) return "No Due Date";
  const due = new Date(date);
  if (isNaN(due.getTime())) return "No Due Date";
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
  const caseRef = caseItem?.caseNumber || caseItem?.internalReference || null;
  const caseId = caseItem?._id ? String(caseItem._id) : null;
  const priority = normalizeTaskPriority(t.priority);
  const status = normalizeTaskStatus(t.status);

  return {
    id: String(t._id),
    title: t.title,
    caseId,
    caseRef,
    due: formatDue(t.dueAt),
    priority,
    status,
    dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : null,
  };
}

