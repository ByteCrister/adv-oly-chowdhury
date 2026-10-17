import { z } from "zod";
import {
  DROPDOWN_TYPE_LIST,
  DROPDOWN_DEFAULT_LIMIT,
  DROPDOWN_MAX_LIMIT,
  DropdownType,
} from "@/const/dropdown.const";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdValidator = z
  .string()
  .refine((val) => objectIdRegex.test(val), {
    message: "Invalid ObjectId format",
  });

/**
 * Validation schema for the unified dropdown GET endpoint.
 */
export const dropdownQuerySchema = z.object({
  type: z.enum(DROPDOWN_TYPE_LIST as unknown as [DropdownType, ...DropdownType[]], {
    message: `Invalid dropdown type. Permitted values: ${DROPDOWN_TYPE_LIST.join(", ")}`,
  }),
  search: z.string().trim().optional(),
  clientId: objectIdValidator.optional(),
  courtId: objectIdValidator.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(DROPDOWN_MAX_LIMIT)
    .default(DROPDOWN_DEFAULT_LIMIT),
});
