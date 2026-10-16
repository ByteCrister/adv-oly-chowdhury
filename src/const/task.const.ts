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
