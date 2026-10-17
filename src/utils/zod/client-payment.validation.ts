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
} from "@/const/client-payment.const";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdValidator = z
  .string()
  .refine((val) => objectIdRegex.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for recording a new client payment.
 */
export const createClientPaymentSchema = z.object({
  caseId: objectIdValidator.nullable().optional(),
  paymentDate: z
    .string()
    .min(1, "Payment date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid payment date format",
    }),
  amount: z
    .coerce
    .number()
    .min(0, "Payment amount cannot be negative")
    .refine((val) => !isNaN(val), {
      message: "Valid numeric amount is required",
    }),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .max(10, "Currency code cannot exceed 10 characters")
    .default("BDT"),
  paymentMethod: z
    .enum(PAYMENT_METHOD_LIST as [PaymentMethod, ...PaymentMethod[]], {
      message: "Invalid payment method",
    })
    .default(PAYMENT_METHODS.CASH),
  paymentType: z
    .enum(PAYMENT_TYPE_LIST as [PaymentType, ...PaymentType[]], {
      message: "Invalid payment type",
    })
    .default(PAYMENT_TYPES.CASE_PROFESSIONAL_FEE),
  referenceNumber: z
    .string()
    .trim()
    .max(100, "Reference number cannot exceed 100 characters")
    .nullable()
    .optional(),
  receiptAssetreferenceId: objectIdValidator.nullable().optional(),
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
 * Validation schema for updating a client payment.
 */
export const updateClientPaymentSchema = createClientPaymentSchema.partial();

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
    .enum(CLIENT_PAYMENT_SORT_OPTION_LIST as [string, ...string[]])
    .default(CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_PAYMENT),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (CLIENT_PAYMENT_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${CLIENT_PAYMENT_PAGE_LIMITS.join(", ")}`,
    })
    .default(CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT),
});
