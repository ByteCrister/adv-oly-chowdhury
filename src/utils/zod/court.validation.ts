import { z } from "zod";
import {
  COURT_TYPE_LIST,
  COURT_TYPES,
  COURT_PAGE_LIMITS,
  COURT_DEFAULT_PAGE_LIMIT,
  COURT_SORT_OPTIONS,
  CourtType,
} from "@/const/court.const";


/**
 * Validation schema for creating a new court record.
 */
export const createCourtSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Court name is required")
    .max(200, "Court name cannot exceed 200 characters"),
  courtType: z
    .enum(COURT_TYPE_LIST as [CourtType, ...CourtType[]], {
      message: "Invalid court type",
    })
    .default(COURT_TYPES.DISTRICT_JUDGE_COURT),
  district: z
    .string()
    .trim()
    .min(1, "District is required")
    .max(100, "District cannot exceed 100 characters")
    .default("Sylhet"),

  division: z
    .string()
    .trim()
    .max(100, "Division cannot exceed 100 characters")
    .nullable()
    .optional()
    .default("Sylhet"),
  roomOrHall: z
    .string()
    .trim()
    .max(150, "Room or Hall cannot exceed 150 characters")
    .nullable()
    .optional(),
  address: z
    .string()
    .trim()
    .max(300, "Address cannot exceed 300 characters")
    .nullable()
    .optional(),
  presidingJudgeTitle: z
    .string()
    .trim()
    .max(150, "Presiding judge title cannot exceed 150 characters")
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
});

/**
 * Validation schema for updating an existing court.
 */
export const updateCourtSchema = createCourtSchema.partial();

/**
 * Validation schema for court listing query parameters.
 */
export const courtQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  courtType: z.string().trim().optional(),
  district: z.string().trim().optional(),
  division: z.string().trim().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
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
    .enum(Object.values(COURT_SORT_OPTIONS) as [string, ...string[]])
    .default(COURT_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (COURT_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${COURT_PAGE_LIMITS.join(", ")}`,
    })
    .default(COURT_DEFAULT_PAGE_LIMIT),
});

