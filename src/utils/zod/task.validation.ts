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
  TaskPageLimit,
} from "@/const/task.const";

export const objectIdValidator = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validates nullable or optional ObjectId fields, safely transforming empty strings to null.
 */
export const optionalObjectIdValidator = z
  .string()
  .trim()
  .refine((val) => val === "" || /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId format",
  })
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .optional();

/**
 * Strongly typed page limit schema validated against TASK_PAGE_LIMITS
 */
export const taskPageLimitSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === "") {
      return TASK_DEFAULT_PAGE_LIMIT;
    }
    const parsed = Number(val);
    return isNaN(parsed) ? val : parsed;
  },
  z.custom<TaskPageLimit>(
    (val) => (TASK_PAGE_LIMITS as readonly number[]).includes(Number(val)),
    {
      message: `Limit must be one of: ${TASK_PAGE_LIMITS.join(", ")}`,
    }
  )
);

/**
 * Validation schema for task list query parameters
 */
export const taskQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum([...TASK_STATUS_LIST, "ALL"]).optional(),
  priority: z.enum([...TASK_PRIORITY_LIST, "ALL"]).optional(),
  caseId: objectIdValidator.optional(),
  clientId: objectIdValidator.optional(),
  dueFilter: z.enum(TASK_DUE_FILTER_LIST).optional(),
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
  sort: z.enum(TASK_SORT_OPTION_LIST).default(TASK_SORT_OPTIONS.DUE_DATE_ASC),
  page: z.coerce.number().int().min(1).default(1),
  limit: taskPageLimitSchema,
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
  status: z.enum(TASK_STATUS_LIST).default(TASK_STATUSES.TODO),
  priority: z.enum(TASK_PRIORITY_LIST).default(TASK_PRIORITIES.NORMAL),
  dueAt: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid due date format",
    }),
  caseId: optionalObjectIdValidator,
  clientId: optionalObjectIdValidator,
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
  status: z.enum(TASK_STATUS_LIST).optional(),
  priority: z.enum(TASK_PRIORITY_LIST).optional(),
  dueAt: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid due date format",
    }),
  caseId: optionalObjectIdValidator,
  clientId: optionalObjectIdValidator,
});

/**
 * Validation schema for task ID parameter
 */
export const taskIdParamSchema = z.object({
  id: objectIdValidator,
});

/**
 * Validation schema for updating task status from dashboard quick-toggle
 */
export const updateTaskStatusSchema = z.object({
  status: z.preprocess(
    (val) => (typeof val === "string" ? val.toUpperCase() : val),
    z.enum(TASK_STATUS_LIST)
  ),
});

export type TaskQueryFilterInput = z.infer<typeof taskQueryFilterSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
