import { z } from "zod";
import {
  CASE_EXPENSE_CATEGORY_LIST,
  CASE_EXPENSE_CATEGORIES,
  CASE_EXPENSE_PAGE_LIMITS,
  CASE_EXPENSE_DEFAULT_PAGE_LIMIT,
  CASE_EXPENSE_SORT_OPTIONS,
  CASE_EXPENSE_SORT_OPTION_LIST,
  CaseExpenseCategory,
} from "@/const/case-expense.const";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdValidator = z
  .string()
  .refine((val) => objectIdRegex.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for recording a new case expense.
 */
export const createCaseExpenseSchema = z.object({
  caseId: objectIdValidator,
  expenseDate: z
    .string()
    .min(1, "Expense date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid expense date format",
    }),
  category: z
    .enum(CASE_EXPENSE_CATEGORY_LIST as [CaseExpenseCategory, ...CaseExpenseCategory[]], {
      message: "Invalid expense category",
    })
    .default(CASE_EXPENSE_CATEGORIES.COURT_FEES),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .nullable()
    .optional(),
  amount: z
    .coerce
    .number()
    .min(0, "Expense amount cannot be negative")
    .refine((val) => !isNaN(val), {
      message: "Valid numeric amount is required",
    }),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .max(10, "Currency code cannot exceed 10 characters")
    .default("BDT"),
  receiptAssetReferenceId: objectIdValidator.nullable().optional(),
});

/**
 * Validation schema for updating an existing case expense.
 */
export const updateCaseExpenseSchema = createCaseExpenseSchema.partial();

/**
 * Validation schema for case expense query parameters.
 */
export const caseExpenseQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  caseId: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  category: z.string().trim().optional(),
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
    .enum(CASE_EXPENSE_SORT_OPTION_LIST as [string, ...string[]])
    .default(CASE_EXPENSE_SORT_OPTIONS.NEWEST_EXPENSE),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (CASE_EXPENSE_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${CASE_EXPENSE_PAGE_LIMITS.join(", ")}`,
    })
    .default(CASE_EXPENSE_DEFAULT_PAGE_LIMIT),
});
