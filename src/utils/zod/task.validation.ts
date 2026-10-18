import { z } from "zod";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LIST,
  TASK_STATUSES,
  TASK_STATUS_LIST,
  TASK_PAGE_LIMITS,
  TASK_DEFAULT_PAGE_LIMIT,
  TASK_SORT_OPTIONS,
  TASK_SORT_OPTION_LIST,
  TASK_DUE_FILTER_LIST,
  TaskPriority,
  TaskStatus,
  TaskSortOption,
  TaskDueFilter,
} from "@/const/task.const";

export const objectIdValidator = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for task list query parameters
 */
export const taskQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z
    .enum([...TASK_STATUS_LIST, "ALL"] as unknown as [string, ...string[]])
    .optional(),
  priority: z
    .enum([...TASK_PRIORITY_LIST, "ALL"] as unknown as [string, ...string[]])
    .optional(),
  caseId: objectIdValidator.optional(),
  clientId: objectIdValidator.optional(),
  dueFilter: z
    .enum(TASK_DUE_FILTER_LIST as unknown as [TaskDueFilter, ...TaskDueFilter[]])
    .optional(),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid startDate format",
    }),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid endDate format",
    }),
  sort: z
    .enum(TASK_SORT_OPTION_LIST as unknown as [TaskSortOption, ...TaskSortOption[]])
    .default(TASK_SORT_OPTIONS.DUE_DATE_ASC),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (TASK_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${TASK_PAGE_LIMITS.join(", ")}`,
    })
    .default(TASK_DEFAULT_PAGE_LIMIT),
});

/**
 * Validation schema for creating a new task
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required")
    .max(200, "Task title cannot exceed 200 characters"),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .optional(),
  status: z
    .enum(TASK_STATUS_LIST as [TaskStatus, ...TaskStatus[]])
    .default(TASK_STATUSES.TODO),
  priority: z
    .enum(TASK_PRIORITY_LIST as [TaskPriority, ...TaskPriority[]])
    .default(TASK_PRIORITIES.NORMAL),
  dueAt: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid due date format",
    }),
  caseId: objectIdValidator.nullable().optional(),
  clientId: objectIdValidator.nullable().optional(),
});

/**
 * Validation schema for updating a task
 */
export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title cannot be empty")
    .max(200, "Task title cannot exceed 200 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .optional(),
  status: z
    .enum(TASK_STATUS_LIST as [TaskStatus, ...TaskStatus[]])
    .optional(),
  priority: z
    .enum(TASK_PRIORITY_LIST as [TaskPriority, ...TaskPriority[]])
    .optional(),
  dueAt: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid due date format",
    }),
  caseId: objectIdValidator.nullable().optional(),
  clientId: objectIdValidator.nullable().optional(),
});

/**
 * Validation schema for task ID parameter
 */
export const taskIdParamSchema = z.object({
  id: objectIdValidator,
});

export type TaskQueryFilterInput = z.infer<typeof taskQueryFilterSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
