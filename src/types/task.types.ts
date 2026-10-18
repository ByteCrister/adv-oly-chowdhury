import type {
  TaskPriority,
  TaskStatus,
  TaskPageLimit,
  TaskSortOption,
  TaskDueFilter,
} from "@/const/task.const";

export type {
  TaskPriority,
  TaskStatus,
  TaskPageLimit,
  TaskSortOption,
  TaskDueFilter,
};

/**
 * Embedded case summary returned with task DTO
 */
export interface TaskCaseDetails {
  id: string;
  title: string;
  caseNumber: string | null;
  internalReference: string;
  caseStatus?: string;
}

/**
 * Embedded client summary returned with task DTO
 */
export interface TaskClientDetails {
  id: string;
  name: string;
  clientNumber: string;
  organizationName?: string | null;
  phone?: string | null;
}

/**
 * Full Task Item Data Transfer Object for client-side rendering
 */
export interface TaskItemDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  completedAt: string | null;
  isOverdue: boolean;
  caseId: string | null;
  caseDetails: TaskCaseDetails | null;
  clientId: string | null;
  clientDetails: TaskClientDetails | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Chamber Task Statistics computed across all matching filter criteria
 */
export interface TaskStatsDto {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
  urgent: number;
  high: number;
}

/**
 * Query filter parameters supported by GET /api/v1/tasks
 */
export interface TaskFilterParams {
  search?: string;
  status?: TaskStatus | "ALL";
  priority?: TaskPriority | "ALL";
  caseId?: string;
  clientId?: string;
  dueFilter?: TaskDueFilter;
  startDate?: string | null;
  endDate?: string | null;
  sort?: TaskSortOption;
  page?: number;
  limit?: TaskPageLimit;
}

/**
 * Unified task list API response containing paginated items and filter-aware stats
 */
export interface TaskPaginationResponse {
  items: TaskItemDto[];
  total: number;
  page: number;
  limit: TaskPageLimit;
  totalPages: number;
  hasMore: boolean;
  stats: TaskStatsDto;
}

/**
 * Payload for creating a new Task
 */
export interface CreateTaskInputDto {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
  caseId?: string | null;
  clientId?: string | null;
}

/**
 * Payload for updating an existing Task
 */
export interface UpdateTaskInputDto {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
  caseId?: string | null;
  clientId?: string | null;
}

/**
 * Mutation response for create/update operations
 */
export interface TaskActionResponse {
  success: boolean;
  message: string;
  data: TaskItemDto;
}

/**
 * Soft-delete response
 */
export interface TaskDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}
