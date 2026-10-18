/**
 * Tasks & Deadlines Domain Constants
 */

export const TASK_PRIORITIES = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export const TASK_PRIORITY_LIST = Object.values(TASK_PRIORITIES);
export type TaskPriority = (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];

export const TASK_STATUSES = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const TASK_STATUS_LIST = Object.values(TASK_STATUSES);
export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TASK_STATUSES.TODO]: "To Do",
  [TASK_STATUSES.IN_PROGRESS]: "In Progress",
  [TASK_STATUSES.COMPLETED]: "Completed",
  [TASK_STATUSES.CANCELLED]: "Cancelled",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TASK_PRIORITIES.LOW]: "Low",
  [TASK_PRIORITIES.NORMAL]: "Normal",
  [TASK_PRIORITIES.HIGH]: "High",
  [TASK_PRIORITIES.URGENT]: "Urgent",
};

export const TASK_PAGE_LIMITS = [10, 20, 50, 100] as const;
export const TASK_DEFAULT_PAGE_LIMIT: TaskPageLimit = 10;
export type TaskPageLimit = (typeof TASK_PAGE_LIMITS)[number];

export const TASK_SORT_OPTIONS = {
  DUE_DATE_ASC: "due_asc",
  DUE_DATE_DESC: "due_desc",
  NEWEST: "newest",
  OLDEST: "oldest",
  PRIORITY_DESC: "priority_desc",
  PRIORITY_ASC: "priority_asc",
  TITLE_ASC: "title_asc",
  TITLE_DESC: "title_desc",
} as const;

export const TASK_SORT_OPTION_LIST = Object.values(TASK_SORT_OPTIONS);
export type TaskSortOption = (typeof TASK_SORT_OPTIONS)[keyof typeof TASK_SORT_OPTIONS];

export const TASK_SORT_LABELS: Record<TaskSortOption, string> = {
  [TASK_SORT_OPTIONS.DUE_DATE_ASC]: "Due Soonest",
  [TASK_SORT_OPTIONS.DUE_DATE_DESC]: "Due Furthest",
  [TASK_SORT_OPTIONS.NEWEST]: "Newest Created",
  [TASK_SORT_OPTIONS.OLDEST]: "Oldest Created",
  [TASK_SORT_OPTIONS.PRIORITY_DESC]: "Priority: Urgent First",
  [TASK_SORT_OPTIONS.PRIORITY_ASC]: "Priority: Low First",
  [TASK_SORT_OPTIONS.TITLE_ASC]: "Title: A to Z",
  [TASK_SORT_OPTIONS.TITLE_DESC]: "Title: Z to A",
};

export const TASK_DUE_FILTERS = {
  ALL: "ALL",
  OVERDUE: "OVERDUE",
  TODAY: "TODAY",
  THIS_WEEK: "THIS_WEEK",
  NEXT_7_DAYS: "NEXT_7_DAYS",
  NO_DUE_DATE: "NO_DUE_DATE",
} as const;

export const TASK_DUE_FILTER_LIST = Object.values(TASK_DUE_FILTERS);
export type TaskDueFilter = (typeof TASK_DUE_FILTERS)[keyof typeof TASK_DUE_FILTERS];

export const TASK_DUE_FILTER_LABELS: Record<TaskDueFilter, string> = {
  [TASK_DUE_FILTERS.ALL]: "All Deadlines",
  [TASK_DUE_FILTERS.OVERDUE]: "Overdue",
  [TASK_DUE_FILTERS.TODAY]: "Due Today",
  [TASK_DUE_FILTERS.THIS_WEEK]: "Due This Week",
  [TASK_DUE_FILTERS.NEXT_7_DAYS]: "Next 7 Days",
  [TASK_DUE_FILTERS.NO_DUE_DATE]: "No Due Date",
};

export const TASK_QUERY_KEYS = {
  all: ["tasks"] as const,
  lists: () => [...TASK_QUERY_KEYS.all, "list"] as const,
  list: (params: Record<string, unknown> = {}) =>
    [...TASK_QUERY_KEYS.lists(), params] as const,
  detail: (id: string) => [...TASK_QUERY_KEYS.all, "detail", id] as const,
};

