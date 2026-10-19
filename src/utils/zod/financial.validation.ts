import { z } from "zod";
import {
  FINANCIAL_RECORD_TYPES,
  FINANCIAL_RECORD_TYPE_LIST,
  FINANCIAL_PAGE_LIMITS,
  FINANCIAL_DEFAULT_PAGE_LIMIT,
  FINANCIAL_SORT_OPTIONS,
  FINANCIAL_SORT_OPTION_LIST,
  FinancialSortOption,
  FinancialRecordType,
} from "@/const/financial.const";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates a string that is either a valid 24-char hex MongoDB ObjectId,
 * or the sentinel value "ALL" (used by some filter selects to mean "no filter").
 */
const objectIdOrAllValidator = z
  .string()
  .trim()
  .refine((val) => val === "ALL" || objectIdRegex.test(val), {
    message: 'Must be a valid ObjectId or "ALL"',
  })
  .optional();

/**
 * Validation schema for unified financial ledger query parameters.
 */
export const financialQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  recordType: z
    .enum(FINANCIAL_RECORD_TYPE_LIST as [FinancialRecordType, ...FinancialRecordType[]])
    .default(FINANCIAL_RECORD_TYPES.ALL),
  clientId: objectIdOrAllValidator,
  caseId: objectIdOrAllValidator,
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
    .enum(FINANCIAL_SORT_OPTION_LIST as [FinancialSortOption, ...FinancialSortOption[]])
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
