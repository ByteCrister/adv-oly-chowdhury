import { z } from "zod";
import {
  CASE_TYPE_LIST,
  CASE_TYPES,
  CASE_STATUS_LIST,
  CASE_STATUSES,
  CASE_PRIORITY_LIST,
  CASE_PRIORITIES,
  CASE_PAGE_LIMITS,
  CASE_DEFAULT_PAGE_LIMIT,
  CASE_SORT_OPTIONS,
  CASE_SORT_OPTION_LIST,
  CaseType,
  CaseStatus,
  CasePriority,
} from "@/const/case.const";

const objectIdValidator = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for creating a new Case.
 */
export const createCaseSchema = z.object({
  internalReference: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Internal reference must be at least 3 characters")
    .max(50, "Internal reference cannot exceed 50 characters")
    .optional(),
  caseNumber: z
    .string()
    .trim()
    .max(100, "Case number cannot exceed 100 characters")
    .nullable()
    .optional(),
  filingYear: z
    .coerce
    .number()
    .int()
    .min(1900, "Filing year must be on or after 1900")
    .max(2100, "Filing year cannot exceed 2100")
    .nullable()
    .optional(),
  title: z
    .string()
    .trim()
    .min(1, "Case title is required")
    .max(250, "Title cannot exceed 250 characters"),
  caseType: z
    .enum(CASE_TYPE_LIST as [CaseType, ...CaseType[]], {
      message: "Invalid case type",
    })
    .default(CASE_TYPES.CIVIL),
  caseCategory: z
    .string()
    .trim()
    .max(150, "Case category cannot exceed 150 characters")
    .nullable()
    .optional(),
  courtId: objectIdValidator,
  clientId: objectIdValidator,
  filingDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid filing date format",
    }),
  caseStatus: z
    .enum(CASE_STATUS_LIST as [CaseStatus, ...CaseStatus[]], {
      message: "Invalid case status",
    })
    .default(CASE_STATUSES.ACTIVE),
  priority: z
    .enum(CASE_PRIORITY_LIST as [CasePriority, ...CasePriority[]], {
      message: "Invalid priority",
    })
    .default(CASE_PRIORITIES.NORMAL),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .nullable()
    .optional(),
  legalIssues: z
    .string()
    .trim()
    .max(5000, "Legal issues cannot exceed 5000 characters")
    .nullable()
    .optional(),
  opposingCounsel: z
    .string()
    .trim()
    .max(200, "Opposing counsel cannot exceed 200 characters")
    .nullable()
    .optional(),
  opposingParties: z
    .array(z.string().trim().min(1, "Party name cannot be empty").max(200, "Party name cannot exceed 200 characters"))
    .max(50, "Cannot specify more than 50 opposing parties")
    .default([]),
});

/**
 * Validation schema for updating an existing Case.
 */
export const updateCaseSchema = z.object({
  internalReference: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Internal reference must be at least 3 characters")
    .max(50, "Internal reference cannot exceed 50 characters")
    .optional(),
  caseNumber: z
    .string()
    .trim()
    .max(100, "Case number cannot exceed 100 characters")
    .nullable()
    .optional(),
  filingYear: z
    .coerce
    .number()
    .int()
    .min(1900, "Filing year must be on or after 1900")
    .max(2100, "Filing year cannot exceed 2100")
    .nullable()
    .optional(),
  title: z
    .string()
    .trim()
    .min(1, "Case title cannot be empty")
    .max(250, "Title cannot exceed 250 characters")
    .optional(),
  caseType: z
    .enum(CASE_TYPE_LIST as [CaseType, ...CaseType[]])
    .optional(),
  caseCategory: z
    .string()
    .trim()
    .max(150, "Case category cannot exceed 150 characters")
    .nullable()
    .optional(),
  courtId: objectIdValidator.optional(),
  clientId: objectIdValidator.optional(),
  filingDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid filing date format",
    }),
  caseStatus: z
    .enum(CASE_STATUS_LIST as [CaseStatus, ...CaseStatus[]])
    .optional(),
  priority: z
    .enum(CASE_PRIORITY_LIST as [CasePriority, ...CasePriority[]])
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .nullable()
    .optional(),
  legalIssues: z
    .string()
    .trim()
    .max(5000, "Legal issues cannot exceed 5000 characters")
    .nullable()
    .optional(),
  opposingCounsel: z
    .string()
    .trim()
    .max(200, "Opposing counsel cannot exceed 200 characters")
    .nullable()
    .optional(),
  opposingParties: z
    .array(z.string().trim().min(1, "Party name cannot be empty").max(200, "Party name cannot exceed 200 characters"))
    .max(50, "Cannot specify more than 50 opposing parties")
    .optional(),
  closedAt: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid closure date format",
    }),
  closureReason: z
    .string()
    .trim()
    .max(1000, "Closure reason cannot exceed 1000 characters")
    .nullable()
    .optional(),
});

/**
 * Validation schema for Case list query parameters.
 */
export const caseQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  caseStatus: z.string().trim().optional(),
  caseType: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  courtId: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  filingYear: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "ALL" || !val ? undefined : val))
    .refine((val) => !val || !isNaN(parseInt(val, 10)), {
      message: "Invalid filing year",
    }),
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
    .enum(CASE_SORT_OPTION_LIST as [string, ...string[]])
    .default(CASE_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (CASE_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${CASE_PAGE_LIMITS.join(", ")}`,
    })
    .default(CASE_DEFAULT_PAGE_LIMIT),
});
