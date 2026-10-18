import { z } from "zod";
import {
  PARTY_TYPE_LIST,
  PARTY_TYPES,
  PARTY_ROLE_LIST,
  PARTY_ROLES,
  CASE_PARTY_PAGE_LIMITS,
  CASE_PARTY_DEFAULT_PAGE_LIMIT,
  CASE_PARTY_SORT_OPTIONS,
  CASE_PARTY_SORT_OPTION_LIST,
  PartyType,
  PartyRole,
} from "@/const/case-party.const";

const objectIdValidator = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for creating a CaseParty record.
 */
export const createCasePartySchema = z.object({
  caseId: objectIdValidator.optional(),
  clientId: objectIdValidator.nullable().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Party name is required")
    .max(200, "Party name cannot exceed 200 characters"),
  partyType: z
    .enum(PARTY_TYPE_LIST as [PartyType, ...PartyType[]], {
      message: "Invalid party type",
    })
    .default(PARTY_TYPES.INDIVIDUAL),
  role: z
    .enum(PARTY_ROLE_LIST as [PartyRole, ...PartyRole[]], {
      message: "Invalid party role",
    })
    .default(PARTY_ROLES.PLAINTIFF),
  address: z
    .string()
    .trim()
    .max(500, "Address cannot exceed 500 characters")
    .nullable()
    .optional(),
  phone: z
    .string()
    .trim()
    .max(50, "Phone cannot exceed 50 characters")
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes cannot exceed 2000 characters")
    .nullable()
    .optional(),
});

/**
 * Validation schema for updating a CaseParty record.
 */
export const updateCasePartySchema = z.object({
  clientId: objectIdValidator.nullable().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Party name cannot be empty")
    .max(200, "Party name cannot exceed 200 characters")
    .optional(),
  partyType: z
    .enum(PARTY_TYPE_LIST as [PartyType, ...PartyType[]])
    .optional(),
  role: z
    .enum(PARTY_ROLE_LIST as [PartyRole, ...PartyRole[]])
    .optional(),
  address: z
    .string()
    .trim()
    .max(500, "Address cannot exceed 500 characters")
    .nullable()
    .optional(),
  phone: z
    .string()
    .trim()
    .max(50, "Phone cannot exceed 50 characters")
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes cannot exceed 2000 characters")
    .nullable()
    .optional(),
});

/**
 * Validation schema for CaseParty query parameters.
 */
export const casePartyQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  role: z.string().trim().optional(),
  partyType: z.string().trim().optional(),
  sort: z
    .enum(CASE_PARTY_SORT_OPTION_LIST as [string, ...string[]])
    .default(CASE_PARTY_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (CASE_PARTY_PAGE_LIMITS as readonly number[]).includes(val), {
      message: `Limit must be one of: ${CASE_PARTY_PAGE_LIMITS.join(", ")}`,
    })
    .default(CASE_PARTY_DEFAULT_PAGE_LIMIT),
});
