import { z } from "zod";
import {
  CASE_EXPENSE_CATEGORY_LIST,
  CASE_EXPENSE_CATEGORIES,
  CASE_EXPENSE_PAGE_LIMITS,
  CASE_EXPENSE_DEFAULT_PAGE_LIMIT,
  CASE_EXPENSE_SORT_OPTIONS,
  CASE_EXPENSE_SORT_OPTION_LIST,
  DEFAULT_CURRENCY,
  CaseExpenseCategory,
  CaseExpensePageLimit,
  CaseExpenseSortOption,
} from "@/const/case-expense.const";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdValidator = z
  .string()
  .refine((val) => objectIdRegex.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validates nullable or optional ObjectId fields, safely transforming empty strings to null.
 */
const optionalObjectIdValidator = z
  .string()
  .trim()
  .refine((val) => val === "" || objectIdRegex.test(val), {
    message: "Invalid ObjectId format",
  })
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .optional();

/**
 * Strongly typed page limit schema validated against CASE_EXPENSE_PAGE_LIMITS.
 */
export const caseExpensePageLimitSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === "") {
      return CASE_EXPENSE_DEFAULT_PAGE_LIMIT;
    }
    const parsed = Number(val);
    return isNaN(parsed) ? val : parsed;
  },
  z.custom<CaseExpensePageLimit>(
    (val) => (CASE_EXPENSE_PAGE_LIMITS as readonly number[]).includes(Number(val)),
    {
      message: `Limit must be one of: ${CASE_EXPENSE_PAGE_LIMITS.join(", ")}`,
    }
  )
);

/**
 * Base validation schema for case expenses without default values.
 * Used as foundation for both create and update schemas to prevent unintended
 * default overrides during partial updates.
 */
export const baseCaseExpenseSchema = z.object({
  caseId: objectIdValidator,
  expenseDate: z
    .string()
    .min(1, "Expense date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid expense date format",
    }),
  category: z.enum(
    CASE_EXPENSE_CATEGORY_LIST as [CaseExpenseCategory, ...CaseExpenseCategory[]],
    {
      message: "Invalid expense category",
    }
  ),
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
    .max(100_000_000, "Expense amount exceeds maximum allowable limit")
    .refine((val) => Number.isFinite(val), {
      message: "Valid numeric amount is required",
    }),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Currency code must be at least 2 characters")
    .max(10, "Currency code cannot exceed 10 characters"),
  receiptAssetReferenceId: optionalObjectIdValidator,
});

/**
 * Validation schema for recording a new case expense.
 * Injects sensible defaults for category and currency.
 */
export const createCaseExpenseSchema = baseCaseExpenseSchema.extend({
  category: baseCaseExpenseSchema.shape.category.default(CASE_EXPENSE_CATEGORIES.COURT_FEES),
  currency: baseCaseExpenseSchema.shape.currency.default(DEFAULT_CURRENCY),
});

/**
 * Validation schema for updating an existing case expense.
 * Partials the base schema WITHOUT defaults, ensuring partial updates do not
 * overwrite omitted properties with default values.
 */
export const updateCaseExpenseSchema = baseCaseExpenseSchema.partial();

/**
 * Validation schema for case expense query parameters.
 */
export const caseExpenseQueryFilterSchema = z
  .object({
    search: z.string().trim().optional(),
    caseId: z
      .string()
      .trim()
      .refine((val) => !val || val === "ALL" || objectIdRegex.test(val), {
        message: "Invalid caseId format",
      })
      .optional(),
    clientId: z
      .string()
      .trim()
      .refine((val) => !val || val === "ALL" || objectIdRegex.test(val), {
        message: "Invalid clientId format",
      })
      .optional(),
    category: z
      .string()
      .trim()
      .refine(
        (val) =>
          !val ||
          val === "ALL" ||
          (CASE_EXPENSE_CATEGORY_LIST as readonly string[]).includes(val),
        {
          message: "Invalid expense category filter",
        }
      )
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
      .enum(CASE_EXPENSE_SORT_OPTION_LIST as [CaseExpenseSortOption, ...CaseExpenseSortOption[]])
      .default(CASE_EXPENSE_SORT_OPTIONS.NEWEST_EXPENSE),
    page: z.coerce.number().int().min(1).default(1),
    limit: caseExpensePageLimitSchema,
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "startDate cannot be later than endDate",
      path: ["startDate"],
    }
  );
