import type { CasePriority, CaseStatus, CaseType } from "@/const/case.const";
import type { TaskPriority, TaskStatus } from "@/const/task.const";
import type { HearingStatus } from "@/const/hearing.const";

export interface DashboardAdvocateInfo {
  name: string;
  preferredName: string;
  title: string;
  subtitle: string;
  chamberLocation: string;
  phone?: string | null;
  whatsappNumber?: string | null;
}

export interface DashboardMetricStat {
  label: string;
  value: number;
  subtext: string;
  href: string;
  iconName?: string;
}

export interface DashboardStatsDto {
  activeCases: number;
  activeCasesSubtext: string;
  upcomingHearings: number;
  todayHearingsCount: number;
  activeClients: number;
  activeClientsSubtext: string;
  pendingTasks: number;
  urgentTasksCount: number;
}

export type { CasePriority, CaseStatus, CaseType } from "@/const/case.const";
export type { TaskPriority, TaskStatus } from "@/const/task.const";
export type { HearingStatus } from "@/const/hearing.const";

export interface TodayHearingDto {
  id: string;
  caseId?: string | null;
  caseRef: string;
  caseTitle: string;
  courtName: string;
  room?: string | null;
  purpose: string;
  time: string;
  caseType: CaseType;
  priority: CasePriority;
  status: HearingStatus;
}

export interface RecentCaseDto {
  id: string;
  ref: string;
  title: string;
  client: string;
  type: CaseType;
  court: string;
  filingDate: string;
  status: CaseStatus;
}

export interface ChamberTaskDto {
  id: string;
  title: string;
  caseId?: string | null;
  caseRef: string | null;
  due: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt?: string | null;
}

export interface DashboardOverviewData {
  advocate: DashboardAdvocateInfo;
  stats: DashboardStatsDto;
  todayHearings: TodayHearingDto[];
  recentCases: RecentCaseDto[];
  chamberTasks: ChamberTaskDto[];
}

export interface DashboardApiResponse {
  success: boolean;
  data: DashboardOverviewData;
  message?: string;
}

export interface TaskStatusUpdateDto {
  taskId: string;
  status: TaskStatus;
}

export interface TaskUpdateApiResponse {
  success: boolean;
  data: ChamberTaskDto;
  message?: string;
}
