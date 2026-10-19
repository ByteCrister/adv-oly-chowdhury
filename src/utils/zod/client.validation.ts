import { z } from "zod";
import {
  CLIENT_TYPE_LIST,
  CLIENT_TYPES,
  CLIENT_STATUS_LIST,
  CLIENT_STATUSES,
  CLIENT_PAGE_LIMITS,
  CLIENT_DEFAULT_PAGE_LIMIT,
  CLIENT_SORT_OPTIONS,
  CLIENT_SORT_OPTION_LIST,
  ClientType,
  ClientStatus,
  ClientPageLimit,
  ClientSortOption,
} from "@/const/client.const";

/**
 * Base validation schema for client attributes without injected default values.
 * Used as the foundation for createClientSchema (which injects defaults) and
 * updateClientSchema (which partials WITHOUT defaults to prevent unintended field resets).
 */
export const baseClientSchema = z.object({
  clientNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Client number must be at least 3 characters")
    .max(50, "Client number cannot exceed 50 characters")
    .optional(),
  clientType: z.enum(CLIENT_TYPE_LIST as [ClientType, ...ClientType[]], {
    message: "Invalid client type",
  }),
  status: z.enum(CLIENT_STATUS_LIST as [ClientStatus, ...ClientStatus[]], {
    message: "Invalid client status",
  }),
  name: z
    .string()
    .trim()
    .min(1, "Client name is required")
    .max(200, "Client name cannot exceed 200 characters"),
  organizationName: z
    .string()
    .trim()
    .max(200, "Organization name cannot exceed 200 characters")
    .nullable()
    .optional(),
  fatherOrSpouseName: z
    .string()
    .trim()
    .max(150, "Father/Spouse name cannot exceed 150 characters")
    .nullable()
    .optional(),
  motherName: z
    .string()
    .trim()
    .max(150, "Mother name cannot exceed 150 characters")
    .nullable()
    .optional(),
  dateOfBirth: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date of birth format",
    })
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
  nationalId: z
    .string()
    .trim()
    .max(50, "National ID cannot exceed 50 characters")
    .nullable()
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters")
    .nullable()
    .optional(),
  alternatePhone: z
    .string()
    .trim()
    .max(30, "Alternate phone cannot exceed 30 characters")
    .nullable()
    .optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .nullable()
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(500, "Address cannot exceed 500 characters")
    .nullable()
    .optional(),
  permanentAddress: z
    .string()
    .trim()
    .max(500, "Permanent address cannot exceed 500 characters")
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
 * Validation schema for creating a new client.
 * Injects default clientType and status.
 */
export const createClientSchema = baseClientSchema.extend({
  clientType: baseClientSchema.shape.clientType.default(CLIENT_TYPES.INDIVIDUAL),
  status: baseClientSchema.shape.status.default(CLIENT_STATUSES.ACTIVE),
});

/**
 * Validation schema for updating an existing client.
 * Partials the base schema WITHOUT defaults, ensuring omitted properties
 * are not overwritten with default values.
 */
export const updateClientSchema = baseClientSchema.partial();

/**
 * Strongly typed page limit schema validated against CLIENT_PAGE_LIMITS.
 */
export const clientPageLimitSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === "") {
      return CLIENT_DEFAULT_PAGE_LIMIT;
    }
    const parsed = Number(val);
    return isNaN(parsed) ? val : parsed;
  },
  z.custom<ClientPageLimit>(
    (val) => (CLIENT_PAGE_LIMITS as readonly number[]).includes(Number(val)),
    {
      message: `Limit must be one of: ${CLIENT_PAGE_LIMITS.join(", ")}`,
    }
  )
);

/**
 * Validation schema for client listing query parameters.
 */
export const clientQueryFilterSchema = z.object({
  search: z.string().trim().optional(),
  clientType: z.string().trim().optional(),
  status: z.string().trim().optional(),
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
    .enum(CLIENT_SORT_OPTION_LIST as [ClientSortOption, ...ClientSortOption[]])
    .default(CLIENT_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().min(1).default(1),
  limit: clientPageLimitSchema.default(CLIENT_DEFAULT_PAGE_LIMIT),
});
