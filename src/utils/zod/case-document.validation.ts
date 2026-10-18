import { z } from "zod";
import {
  CASE_DOCUMENT_TYPE_LIST,
  CASE_DOCUMENT_TYPES,
  CASE_DOCUMENT_PAGE_LIMITS,
  CASE_DOCUMENT_DEFAULT_PAGE_LIMIT,
  CASE_DOCUMENT_SORT_OPTIONS,
  CASE_DOCUMENT_SORT_OPTION_LIST,
  CaseDocumentType,
} from "@/const/case-document.const";

const objectIdValidator = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for creating a case document record.
 */
export const createCaseDocumentSchema = z.object({
  caseId: objectIdValidator,
  assetReferenceId: objectIdValidator,
  documentType: z
    .enum(CASE_DOCUMENT_TYPE_LIST as [CaseDocumentType, ...CaseDocumentType[]], {
      message: "Invalid case document type",
    })
    .default(CASE_DOCUMENT_TYPES.OTHER),
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

/**
 * Validation schema for updating or replacing a case document.
 */
export const updateCaseDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Document title cannot be empty")
    .max(200, "Document title cannot exceed 200 characters")
    .optional(),
  documentType: z
    .enum(CASE_DOCUMENT_TYPE_LIST as [CaseDocumentType, ...CaseDocumentType[]])
    .optional(),
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
  isConfidential: z.boolean().optional(),
  assetReferenceId: objectIdValidator.optional(),
});

/**
 * Validation schema for case document query parameters.
 */
export const caseDocumentQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  caseId: objectIdValidator.optional(),
  documentType: z.string().trim().optional(),
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
    .enum(CASE_DOCUMENT_SORT_OPTION_LIST as [string, ...string[]])
    .default(CASE_DOCUMENT_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (CASE_DOCUMENT_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${CASE_DOCUMENT_PAGE_LIMITS.join(", ")}`,
    })
    .default(CASE_DOCUMENT_DEFAULT_PAGE_LIMIT),
});
