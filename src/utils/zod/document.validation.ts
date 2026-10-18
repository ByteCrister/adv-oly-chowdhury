import { z } from "zod";
import {
  DOCUMENT_ENTITY_TYPES,
  DOCUMENT_ENTITY_TYPE_LIST,
  DOCUMENT_SCOPES,
  DOCUMENT_SCOPE_LIST,
  DOCUMENT_PAGE_LIMITS,
  DOCUMENT_DEFAULT_PAGE_LIMIT,
  DOCUMENT_SORT_OPTIONS,
  DOCUMENT_SORT_OPTION_LIST,
  DocumentEntityType,
  DocumentScope,
} from "@/const/document.const";

const objectIdValidator = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for unified document list query parameters.
 */
export const documentQueryFilterSchema = z.object({
  scope: z
    .enum(DOCUMENT_SCOPE_LIST as [DocumentScope, ...DocumentScope[]])
    .default(DOCUMENT_SCOPES.ALL),
  search: z.string().trim().optional(),
  documentType: z.string().trim().optional(),
  caseId: objectIdValidator.optional(),
  clientId: objectIdValidator.optional(),
  isConfidential: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
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
    .enum(DOCUMENT_SORT_OPTION_LIST as [string, ...string[]])
    .default(DOCUMENT_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (DOCUMENT_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${DOCUMENT_PAGE_LIMITS.join(", ")}`,
    })
    .default(DOCUMENT_DEFAULT_PAGE_LIMIT),
});

/**
 * Validation schema for unified document creation.
 */
export const createCaseDocumentUnifiedSchema = z.object({
  entityType: z.literal(DOCUMENT_ENTITY_TYPES.CASE),
  caseId: objectIdValidator,
  assetReferenceId: objectIdValidator,
  documentType: z.string().min(1, "Document type is required"),
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
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .optional(),
  exhibitNumber: z
    .string()
    .trim()
    .max(50, "Exhibit number cannot exceed 50 characters")
    .nullable()
    .optional(),
  isConfidential: z.boolean().default(false),
});

export const createClientDocumentUnifiedSchema = z.object({
  entityType: z.literal(DOCUMENT_ENTITY_TYPES.CLIENT),
  clientId: objectIdValidator,
  assetReferenceId: objectIdValidator,
  documentType: z.string().min(1, "Document type is required"),
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

export const createUnifiedDocumentSchema = z.discriminatedUnion("entityType", [
  createCaseDocumentUnifiedSchema,
  createClientDocumentUnifiedSchema,
]);

/**
 * Validation schema for updating unified document metadata or file replacement.
 */
export const updateUnifiedDocumentSchema = z.object({
  entityType: z.enum(DOCUMENT_ENTITY_TYPE_LIST as [DocumentEntityType, ...DocumentEntityType[]]),
  title: z
    .string()
    .trim()
    .min(1, "Document title cannot be empty")
    .max(200, "Document title cannot exceed 200 characters")
    .optional(),
  documentType: z.string().min(1).optional(),
  documentDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid document date format",
    }),
  assetReferenceId: objectIdValidator.optional(),
  // Case document fields
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .optional(),
  exhibitNumber: z
    .string()
    .trim()
    .max(50, "Exhibit number cannot exceed 50 characters")
    .nullable()
    .optional(),
  isConfidential: z.boolean().optional(),
  // Client document fields
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
