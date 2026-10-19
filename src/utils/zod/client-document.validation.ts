import { z } from "zod";
import {
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_PAGE_LIMITS,
  CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT,
  CLIENT_DOCUMENT_SORT_OPTIONS,
  CLIENT_DOCUMENT_SORT_OPTION_LIST,
  ClientDocumentType,
  ClientDocumentPageLimit,
  ClientDocumentSortOption,
} from "@/const/client-document.const";

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
 * Base validation schema for client document records without default values.
 * Used as foundation for createClientDocumentSchema and updateClientDocumentSchema.
 */
export const baseClientDocumentSchema = z.object({
  assetReferenceId: objectIdValidator,
  documentType: z.enum(
    CLIENT_DOCUMENT_TYPE_LIST as [ClientDocumentType, ...ClientDocumentType[]],
    {
      message: "Invalid document type",
    }
  ),
  title: z
    .string()
    .trim()
    .min(1, "Document title is required")
    .max(200, "Document title cannot exceed 200 characters"),
  documentDate: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid document date format",
    })
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
  expiryDate: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid expiry date format",
    })
    .transform((val) => (val === "" ? null : val))
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
 * Validation schema for creating a client document record.
 * Injects sensible default for documentType.
 */
export const createClientDocumentSchema = baseClientDocumentSchema.extend({
  documentType: baseClientDocumentSchema.shape.documentType.default(
    CLIENT_DOCUMENT_TYPES.OTHER
  ),
});

/**
 * Validation schema for updating or replacing a client document.
 * Partials the base schema WITHOUT defaults.
 */
export const updateClientDocumentSchema = baseClientDocumentSchema.partial();

/**
 * Strongly typed page limit schema validated against CLIENT_DOCUMENT_PAGE_LIMITS.
 */
export const clientDocumentPageLimitSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === "") {
      return CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT;
    }
    const parsed = Number(val);
    return isNaN(parsed) ? val : parsed;
  },
  z.custom<ClientDocumentPageLimit>(
    (val) => (CLIENT_DOCUMENT_PAGE_LIMITS as readonly number[]).includes(Number(val)),
    {
      message: `Limit must be one of: ${CLIENT_DOCUMENT_PAGE_LIMITS.join(", ")}`,
    }
  )
);

/**
 * Validation schema for client document query parameters.
 */
export const clientDocumentQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  documentType: z.string().trim().optional(),
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
      CLIENT_DOCUMENT_SORT_OPTION_LIST as [
        ClientDocumentSortOption,
        ...ClientDocumentSortOption[],
      ]
    )
    .default(CLIENT_DOCUMENT_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().min(1).default(1),
  limit: clientDocumentPageLimitSchema.default(CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT),
});
