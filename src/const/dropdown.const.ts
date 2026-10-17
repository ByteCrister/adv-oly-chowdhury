/**
 * Dropdown Entity Constants & Query Keys
 */

export const DROPDOWN_TYPES = {
  CLIENT: "client",
  COURT: "court",
  CASE: "case",
  USER: "user",
} as const;

export const DROPDOWN_TYPE_LIST = [
  DROPDOWN_TYPES.CLIENT,
  DROPDOWN_TYPES.COURT,
  DROPDOWN_TYPES.CASE,
  DROPDOWN_TYPES.USER,
] as const;

export type DropdownType = (typeof DROPDOWN_TYPES)[keyof typeof DROPDOWN_TYPES];

export const DROPDOWN_DEFAULT_LIMIT = 50;
export const DROPDOWN_MAX_LIMIT = 200;

export const DROPDOWN_QUERY_KEYS = {
  ALL: ["dropdowns"] as const,
  BY_TYPE: (type: string, params?: Record<string, unknown>) =>
    ["dropdowns", type, params] as const,
};
