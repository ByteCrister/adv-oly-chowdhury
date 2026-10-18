import { z } from "zod";
import {
  HEARING_STATUS_LIST,
  HEARING_STATUSES,
  HEARING_PAGE_LIMITS,
  HEARING_DEFAULT_PAGE_LIMIT,
  HEARING_SORT_OPTIONS,
  type HearingStatus,
} from "@/const/hearing.const";

const isValidObjectId = (val: string) => /^[0-9a-fA-F]{24}$/.test(val);

/**
 * Validation schema for creating a new hearing record.
 */
export const createHearingSchema = z.object({
  caseId: z
    .string()
    .trim()
    .min(1, "Case is required")
    .refine((val) => isValidObjectId(val), {
      message: "Invalid Case ID format",
    }),
  courtId: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((val) => !val || isValidObjectId(val), {
      message: "Invalid Court ID format",
    }),
  hearingDate: z
    .string()
    .trim()
    .min(1, "Hearing date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid hearing date format",
    }),
  startTime: z
    .string()
    .trim()
    .max(50, "Start time cannot exceed 50 characters")
    .nullable()
    .optional(),
  hearingType: z
    .string()
    .trim()
    .max(150, "Hearing type cannot exceed 150 characters")
    .nullable()
    .optional(),
  purpose: z
    .string()
    .trim()
    .max(1000, "Purpose cannot exceed 1000 characters")
    .nullable()
    .optional(),
  outcome: z
    .string()
    .trim()
    .max(1000, "Outcome cannot exceed 1000 characters")
    .nullable()
    .optional(),
  nextDate: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid next date format",
    }),
  status: z
    .enum(HEARING_STATUS_LIST as [HearingStatus, ...HearingStatus[]], {
      message: "Invalid hearing status",
    })
    .default(HEARING_STATUSES.SCHEDULED),
  adjournmentReason: z
    .string()
    .trim()
    .max(500, "Adjournment reason cannot exceed 500 characters")
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes cannot exceed 2000 characters")
    .nullable()
    .optional(),
});

/**
 * Validation schema for updating an existing hearing record.
 */
export const updateHearingSchema = createHearingSchema.partial();

/**
 * Validation schema for hearing listing and statistics query parameters.
 */
export const hearingQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  courtId: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || val === "ALL" || isValidObjectId(val), {
      message: "Invalid Court ID format",
    }),
  caseId: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || isValidObjectId(val), {
      message: "Invalid Case ID format",
    }),
  clientId: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || isValidObjectId(val), {
      message: "Invalid Client ID format",
    }),
  hearingType: z.string().trim().optional(),
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
    .enum(Object.values(HEARING_SORT_OPTIONS) as [string, ...string[]])
    .default(HEARING_SORT_OPTIONS.UPCOMING_FIRST),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine(
      (val) => (HEARING_PAGE_LIMITS as readonly number[]).includes(val),
      {
        message: `Limit must be one of: ${HEARING_PAGE_LIMITS.join(", ")}`,
      }
    )
    .default(HEARING_DEFAULT_PAGE_LIMIT),
});
