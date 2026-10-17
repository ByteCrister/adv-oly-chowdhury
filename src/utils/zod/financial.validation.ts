import { z } from "zod";
import {
  FINANCIAL_RECORD_TYPES,
  FINANCIAL_RECORD_TYPE_LIST,
  FINANCIAL_PAGE_LIMITS,
  FINANCIAL_DEFAULT_PAGE_LIMIT,
  FINANCIAL_SORT_OPTIONS,
  FINANCIAL_SORT_OPTION_LIST,
} from "@/const/financial.const";

/**
 * Validation schema for unified financial ledger query parameters.
 */
export const financialQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  recordType: z
    .enum(FINANCIAL_RECORD_TYPE_LIST as [string, ...string[]])
    .default(FINANCIAL_RECORD_TYPES.ALL),
  clientId: z.string().trim().optional(),
  caseId: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  expenseCategory: z.string().trim().optional(),
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
    .enum(FINANCIAL_SORT_OPTION_LIST as [string, ...string[]])
    .default(FINANCIAL_SORT_OPTIONS.NEWEST_DATE),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (FINANCIAL_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${FINANCIAL_PAGE_LIMITS.join(", ")}`,
    })
    .default(FINANCIAL_DEFAULT_PAGE_LIMIT),
});
