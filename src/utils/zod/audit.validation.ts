import { z } from "zod";
import {
  AUDIT_ACTION_LIST,
  AUDIT_PAGE_LIMITS,
  AUDIT_DEFAULT_PAGE_LIMIT,
  AUDIT_SORT_OPTIONS,
  AUDIT_SORT_OPTION_LIST,
  AuditPageLimit,
} from "@/const/audit-log.const";

export const auditHistoryQuerySchema = z.object({
  action: z
    .enum(["ALL", ...AUDIT_ACTION_LIST])
    .optional(),
  date: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
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
    .enum(AUDIT_SORT_OPTION_LIST as [string, ...string[]])
    .default(AUDIT_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((val) => (AUDIT_PAGE_LIMITS as readonly number[]).includes(val as AuditPageLimit), {
      message: `Limit must be one of: ${AUDIT_PAGE_LIMITS.join(", ")}`,
    })
    .default(AUDIT_DEFAULT_PAGE_LIMIT),
});

export type AuditHistoryQueryInput = z.infer<typeof auditHistoryQuerySchema>;
