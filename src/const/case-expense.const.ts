/**
 * Case Expenses Domain Constants
 */

export const CASE_EXPENSE_CATEGORIES = {
  COURT_FEES: "COURT_FEES",
  STAMP_DUTY: "STAMP_DUTY",
  PROCESS_FEE_TALBANA: "PROCESS_FEE_TALBANA",
  CERTIFIED_COPY_FEE: "CERTIFIED_COPY_FEE",
  ADVOCATE_CLERK_EXPENSE: "ADVOCATE_CLERK_EXPENSE",
  PHOTOCOPY_AND_PRINTING: "PHOTOCOPY_AND_PRINTING",
  NOTARY_AFFIDAVIT: "NOTARY_AFFIDAVIT",
  LOCAL_CONVEYANCE_TRAVEL: "LOCAL_CONVEYANCE_TRAVEL",
  EXPERT_WITNESS_FEE: "EXPERT_WITNESS_FEE",
  TAX_GOVT_CHALLAN: "TAX_GOVT_CHALLAN",
  POSTAGE_COURIER: "POSTAGE_COURIER",
  OTHER: "OTHER",
} as const;

export const CASE_EXPENSE_CATEGORY_LIST = Object.values(CASE_EXPENSE_CATEGORIES);
export type CaseExpenseCategory = (typeof CASE_EXPENSE_CATEGORIES)[keyof typeof CASE_EXPENSE_CATEGORIES];

export const CASE_EXPENSE_CATEGORY_LABELS: Record<CaseExpenseCategory, string> = {
  [CASE_EXPENSE_CATEGORIES.COURT_FEES]: "Court Fees",
  [CASE_EXPENSE_CATEGORIES.STAMP_DUTY]: "Stamp Duty",
  [CASE_EXPENSE_CATEGORIES.PROCESS_FEE_TALBANA]: "Process Fee (Talbana)",
  [CASE_EXPENSE_CATEGORIES.CERTIFIED_COPY_FEE]: "Certified Copy Fee",
  [CASE_EXPENSE_CATEGORIES.ADVOCATE_CLERK_EXPENSE]: "Advocate / Clerk Expense",
  [CASE_EXPENSE_CATEGORIES.PHOTOCOPY_AND_PRINTING]: "Photocopy & Printing",
  [CASE_EXPENSE_CATEGORIES.NOTARY_AFFIDAVIT]: "Notary & Affidavit",
  [CASE_EXPENSE_CATEGORIES.LOCAL_CONVEYANCE_TRAVEL]: "Local Conveyance & Travel",
  [CASE_EXPENSE_CATEGORIES.EXPERT_WITNESS_FEE]: "Expert Witness Fee",
  [CASE_EXPENSE_CATEGORIES.TAX_GOVT_CHALLAN]: "Tax / Govt Challan",
  [CASE_EXPENSE_CATEGORIES.POSTAGE_COURIER]: "Postage & Courier",
  [CASE_EXPENSE_CATEGORIES.OTHER]: "Other Chamber Expense",
};

export const DEFAULT_CURRENCY = "BDT";

export const CASE_EXPENSE_PAGE_LIMITS = [10, 20, 50, 100] as const;
export const CASE_EXPENSE_DEFAULT_PAGE_LIMIT: CaseExpensePageLimit = 10;
export type CaseExpensePageLimit = (typeof CASE_EXPENSE_PAGE_LIMITS)[number];

export const CASE_EXPENSE_SORT_OPTIONS = {
  NEWEST_EXPENSE: "newest_expense",
  OLDEST_EXPENSE: "oldest_expense",
  AMOUNT_DESC: "amount_desc",
  AMOUNT_ASC: "amount_asc",
  NEWEST_CREATED: "newest_created",
} as const;

export const CASE_EXPENSE_SORT_OPTION_LIST = Object.values(CASE_EXPENSE_SORT_OPTIONS);
export type CaseExpenseSortOption =
  (typeof CASE_EXPENSE_SORT_OPTIONS)[keyof typeof CASE_EXPENSE_SORT_OPTIONS];

export const CASE_EXPENSE_QUERY_KEYS = {
  all: ["case-expenses"] as const,
  lists: () => [...CASE_EXPENSE_QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...CASE_EXPENSE_QUERY_KEYS.lists(), filters] as const,
  byCase: (caseId: string) =>
    [...CASE_EXPENSE_QUERY_KEYS.all, "case", caseId] as const,
  details: () => [...CASE_EXPENSE_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...CASE_EXPENSE_QUERY_KEYS.details(), id] as const,
};

// Receipt voucher file constraints (Max 2MB, PDF and Images)
export const CASE_EXPENSE_RECEIPT_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const CASE_EXPENSE_RECEIPT_MAX_SIZE_MB = 2;

export const CASE_EXPENSE_RECEIPT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const CASE_EXPENSE_RECEIPT_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

