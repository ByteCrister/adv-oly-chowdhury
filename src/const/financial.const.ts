/**
 * Unified Financial Management Domain Constants
 */

export const FINANCIAL_RECORD_TYPES = {
  ALL: "ALL",
  PAYMENT: "PAYMENT",
  EXPENSE: "EXPENSE",
} as const;

export const FINANCIAL_RECORD_TYPE_LIST = Object.values(FINANCIAL_RECORD_TYPES);
export type FinancialRecordType =
  (typeof FINANCIAL_RECORD_TYPES)[keyof typeof FINANCIAL_RECORD_TYPES];

export const FINANCIAL_PAGE_LIMITS = [10, 20, 50, 100] as const;
export const FINANCIAL_DEFAULT_PAGE_LIMIT: FinancialPageLimit = 10;
export type FinancialPageLimit = (typeof FINANCIAL_PAGE_LIMITS)[number];

export const FINANCIAL_SORT_OPTIONS = {
  NEWEST_DATE: "newest_date",
  OLDEST_DATE: "oldest_date",
  AMOUNT_DESC: "amount_desc",
  AMOUNT_ASC: "amount_asc",
  NEWEST_CREATED: "newest_created",
} as const;

export const FINANCIAL_SORT_OPTION_LIST = Object.values(FINANCIAL_SORT_OPTIONS);
export type FinancialSortOption =
  (typeof FINANCIAL_SORT_OPTIONS)[keyof typeof FINANCIAL_SORT_OPTIONS];

export const FINANCIAL_QUERY_KEYS = {
  all: ["financials"] as const,
  lists: () => [...FINANCIAL_QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...FINANCIAL_QUERY_KEYS.lists(), filters] as const,
  stats: (filters: Record<string, unknown> = {}) =>
    [...FINANCIAL_QUERY_KEYS.all, "stats", filters] as const,
};
