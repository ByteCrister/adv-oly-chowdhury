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
import { CASE_DOCUMENT_TYPE_LIST } from "@/const/case-document.const";
import { CLIENT_DOCUMENT_TYPE_LIST } from "@/const/client-document.const";

export const documentObjectIdValidator = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

const objectIdValidator = documentObjectIdValidator;

/**
 * Validation schema for unified document list query parameters.
 */
export const documentQueryFilterSchema = z
  .object({
    scope: z
      .enum(DOCUMENT_SCOPE_LIST as [DocumentScope, ...DocumentScope[]])
      .default(DOCUMENT_SCOPES.ALL),
    search: z.string().trim().optional(),
    documentType: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val && val !== "ALL" ? val : undefined)),
    caseId: objectIdValidator.optional(),
    clientId: objectIdValidator.optional(),
    isConfidential: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) => {
        if (typeof val === "boolean") return val;
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
      .enum(DOCUMENT_SORT_OPTION_LIST as [string, ...string[]])
      .default(DOCUMENT_SORT_OPTIONS.NEWEST),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine((val) => (DOCUMENT_PAGE_LIMITS as readonly number[]).includes(val as (typeof DOCUMENT_PAGE_LIMITS)[number]), {
        message: `Limit must be one of: ${DOCUMENT_PAGE_LIMITS.join(", ")}`,
      })
      .default(DOCUMENT_DEFAULT_PAGE_LIMIT),
  })
  .refine(
    (data) => {
      if (data.caseId && data.clientId) {
        return false;
      }
      return true;
    },
    {
      message: "Query cannot specify both caseId and clientId simultaneously",
      path: ["caseId"],
    }
  )
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

/**
 * Validation schema for unified document creation - Case Document.
 */
export const createCaseDocumentUnifiedSchema = z.object({
  entityType: z.literal(DOCUMENT_ENTITY_TYPES.CASE),
  caseId: objectIdValidator,
  assetReferenceId: objectIdValidator,
  documentType: z
    .string()
    .trim()
    .min(1, "Document type is required")
    .refine((val) => (CASE_DOCUMENT_TYPE_LIST as readonly string[]).includes(val), {
      message: "Invalid case document type",
    }),
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
    })
    .transform((val) => (val?.trim() ? val.trim() : null)),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : null)),
  exhibitNumber: z
    .string()
    .trim()
    .max(50, "Exhibit number cannot exceed 50 characters")
    .nullable()
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : null)),
  isConfidential: z.boolean().default(false),
});

/**
 * Validation schema for unified document creation - Client Document.
 */
export const createClientDocumentUnifiedSchema = z.object({
  entityType: z.literal(DOCUMENT_ENTITY_TYPES.CLIENT),
  clientId: objectIdValidator,
  assetReferenceId: objectIdValidator,
  documentType: z
    .string()
    .trim()
    .min(1, "Document type is required")
    .refine((val) => (CLIENT_DOCUMENT_TYPE_LIST as readonly string[]).includes(val), {
      message: "Invalid client document type",
    }),
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
    })
    .transform((val) => (val?.trim() ? val.trim() : null)),
  expiryDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid expiry date format",
    })
    .transform((val) => (val?.trim() ? val.trim() : null)),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .nullable()
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : null)),
});

export const createUnifiedDocumentSchema = z.discriminatedUnion("entityType", [
  createCaseDocumentUnifiedSchema,
  createClientDocumentUnifiedSchema,
]);

/**
 * Validation schema for updating unified document metadata or file replacement.
 */
export const updateUnifiedDocumentSchema = z.object({
  entityType: z
    .enum(DOCUMENT_ENTITY_TYPE_LIST as [DocumentEntityType, ...DocumentEntityType[]])
    .optional(),
  title: z
    .string()
    .trim()
    .min(1, "Document title cannot be empty")
    .max(200, "Document title cannot exceed 200 characters")
    .optional(),
  documentType: z.string().trim().min(1, "Document type cannot be empty").optional(),
  documentDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid document date format",
    })
    .transform((val) => (val?.trim() ? val.trim() : null)),
  assetReferenceId: objectIdValidator.optional(),
  // Case document fields
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : null)),
  exhibitNumber: z
    .string()
    .trim()
    .max(50, "Exhibit number cannot exceed 50 characters")
    .nullable()
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : null)),
  isConfidential: z.boolean().optional(),
  // Client document fields
  expiryDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid expiry date format",
    })
    .transform((val) => (val?.trim() ? val.trim() : null)),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .nullable()
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : null)),
});
