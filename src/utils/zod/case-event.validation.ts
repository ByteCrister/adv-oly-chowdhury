import { z } from "zod";
import {
  CASE_EVENT_TYPE_LIST,
  CASE_EVENT_TYPES,
  CASE_EVENT_PAGE_LIMITS,
  CASE_EVENT_DEFAULT_PAGE_LIMIT,
  CASE_EVENT_SORT_OPTIONS,
  CASE_EVENT_SORT_OPTION_LIST,
  CaseEventType,
} from "@/const/case-event.const";

const objectIdValidator = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for creating a CaseEvent record.
 */
export const createCaseEventSchema = z.object({
  caseId: objectIdValidator.optional(),
  eventType: z
    .enum(CASE_EVENT_TYPE_LIST as [CaseEventType, ...CaseEventType[]], {
      message: "Invalid event type",
    })
    .default(CASE_EVENT_TYPES.OTHER),
  title: z
    .string()
    .trim()
    .min(1, "Event title is required")
    .max(200, "Event title cannot exceed 200 characters"),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .nullable()
    .optional(),
  eventDate: z
    .string()
    .min(1, "Event date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid event date format",
    }),
  assetReferenceId: objectIdValidator.nullable().optional(),
});

/**
 * Validation schema for updating a CaseEvent record.
 */
export const updateCaseEventSchema = z.object({
  eventType: z
    .enum(CASE_EVENT_TYPE_LIST as [CaseEventType, ...CaseEventType[]])
    .optional(),
  title: z
    .string()
    .trim()
    .min(1, "Event title cannot be empty")
    .max(200, "Event title cannot exceed 200 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .nullable()
    .optional(),
  eventDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid event date format",
    }),
  assetReferenceId: objectIdValidator.nullable().optional(),
});

/**
 * Validation schema for CaseEvent query parameters.
 */
export const caseEventQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  eventType: z.string().trim().optional(),
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
    .enum(CASE_EVENT_SORT_OPTION_LIST as [string, ...string[]])
    .default(CASE_EVENT_SORT_OPTIONS.DATE_DESC),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (CASE_EVENT_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${CASE_EVENT_PAGE_LIMITS.join(", ")}`,
    })
    .default(CASE_EVENT_DEFAULT_PAGE_LIMIT),
});
