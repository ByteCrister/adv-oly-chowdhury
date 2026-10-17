import { z } from "zod";
import {
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_PAGE_LIMITS,
  CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT,
  CLIENT_DOCUMENT_SORT_OPTIONS,
  CLIENT_DOCUMENT_SORT_OPTION_LIST,
  ClientDocumentType,
} from "@/const/client-document.const";

const objectIdValidator = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for creating a client document record.
 */
export const createClientDocumentSchema = z.object({
  assetReferenceId: objectIdValidator,
  documentType: z
    .enum(CLIENT_DOCUMENT_TYPE_LIST as [ClientDocumentType, ...ClientDocumentType[]], {
      message: "Invalid document type",
    })
    .default(CLIENT_DOCUMENT_TYPES.OTHER),
  title: z
    .string()
    .trim()
    .min(1, "Document title is required")
    .max(200, "Document title cannot exceed 200 characters"),
  documentDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid document date format",
    }),
  expiryDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid expiry date format",
    }),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .nullable()
    .optional(),
});

/**
 * Validation schema for updating or replacing a client document.
 */
export const updateClientDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Document title cannot be empty")
    .max(200, "Document title cannot exceed 200 characters")
    .optional(),
  documentType: z
    .enum(CLIENT_DOCUMENT_TYPE_LIST as [ClientDocumentType, ...ClientDocumentType[]])
    .optional(),
  documentDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid document date format",
    }),
  expiryDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid expiry date format",
    }),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .nullable()
    .optional(),
  assetReferenceId: objectIdValidator.optional(),
});

/**
 * Validation schema for client document query parameters.
 */
export const clientDocumentQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  documentType: z.string().trim().optional(),
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
    .enum(CLIENT_DOCUMENT_SORT_OPTION_LIST as [string, ...string[]])
    .default(CLIENT_DOCUMENT_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (CLIENT_DOCUMENT_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${CLIENT_DOCUMENT_PAGE_LIMITS.join(", ")}`,
    })
    .default(CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT),
});
