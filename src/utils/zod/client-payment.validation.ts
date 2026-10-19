import { z } from "zod";
import {
  PAYMENT_METHOD_LIST,
  PAYMENT_METHODS,
  PAYMENT_TYPE_LIST,
  PAYMENT_TYPES,
  CLIENT_PAYMENT_PAGE_LIMITS,
  CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT,
  CLIENT_PAYMENT_SORT_OPTIONS,
  CLIENT_PAYMENT_SORT_OPTION_LIST,
  PaymentMethod,
  PaymentType,
  ClientPaymentPageLimit,
  ClientPaymentSortOption,
} from "@/const/client-payment.const";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdValidator = z
  .string()
  .refine((val) => objectIdRegex.test(val), {
    message: "Invalid ObjectId format",
  });

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
 * Base validation schema for client payment records without default values.
 * Used as foundation for createClientPaymentSchema and updateClientPaymentSchema
 * to prevent partial updates from resetting paymentMethod or paymentType.
 */
export const baseClientPaymentSchema = z.object({
  caseId: optionalObjectIdValidator,
  paymentDate: z
    .string()
    .min(1, "Payment date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid payment date format",
    }),
  amount: z
    .coerce
    .number()
    .positive("Payment amount must be greater than zero")
    .max(100_000_000, "Payment amount exceeds maximum allowable limit")
    .refine((val) => Number.isFinite(val), {
      message: "Valid numeric amount is required",
    }),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Currency code must be at least 2 characters")
    .max(10, "Currency code cannot exceed 10 characters"),
  paymentMethod: z.enum(PAYMENT_METHOD_LIST as [PaymentMethod, ...PaymentMethod[]], {
    message: "Invalid payment method",
  }),
  paymentType: z.enum(PAYMENT_TYPE_LIST as [PaymentType, ...PaymentType[]], {
    message: "Invalid payment type",
  }),
  referenceNumber: z
    .string()
    .trim()
    .max(100, "Reference number cannot exceed 100 characters")
    .nullable()
    .optional(),
  receiptAssetreferenceId: optionalObjectIdValidator,
  moneyReceiptNumber: z
    .string()
    .trim()
    .max(100, "Money receipt number cannot exceed 100 characters")
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .nullable()
    .optional(),
});

/**
 * Validation schema for recording a new client payment.
 * Injects sensible defaults for currency, paymentMethod, and paymentType.
 */
export const createClientPaymentSchema = baseClientPaymentSchema.extend({
  currency: baseClientPaymentSchema.shape.currency.default("BDT"),
  paymentMethod: baseClientPaymentSchema.shape.paymentMethod.default(PAYMENT_METHODS.CASH),
  paymentType: baseClientPaymentSchema.shape.paymentType.default(
    PAYMENT_TYPES.CASE_PROFESSIONAL_FEE
  ),
});

/**
 * Validation schema for updating an existing client payment.
 * Partials the base schema WITHOUT defaults, ensuring omitted properties
 * are not overwritten with default values.
 */
export const updateClientPaymentSchema = baseClientPaymentSchema.partial();

/**
 * Strongly typed page limit schema validated against CLIENT_PAYMENT_PAGE_LIMITS.
 */
export const clientPaymentPageLimitSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === "") {
      return CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT;
    }
    const parsed = Number(val);
    return isNaN(parsed) ? val : parsed;
  },
  z.custom<ClientPaymentPageLimit>(
    (val) => (CLIENT_PAYMENT_PAGE_LIMITS as readonly number[]).includes(Number(val)),
    {
      message: `Limit must be one of: ${CLIENT_PAYMENT_PAGE_LIMITS.join(", ")}`,
    }
  )
);

/**
 * Validation schema for client payment query parameters.
 */
export const clientPaymentQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  paymentType: z.string().trim().optional(),
  caseId: z.string().trim().optional(),
  startDate: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid startDate format",
    }),
  endDate: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid endDate format",
    }),
  sort: z
    .enum(
      CLIENT_PAYMENT_SORT_OPTION_LIST as [
        ClientPaymentSortOption,
        ...ClientPaymentSortOption[],
      ]
    )
    .default(CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_PAYMENT),
  page: z.coerce.number().int().min(1).default(1),
  limit: clientPaymentPageLimitSchema.default(CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT),
});
