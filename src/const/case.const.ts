/**
 * Legal Case Domain Constants
 */

export const CASE_TYPES = {
  CIVIL: "CIVIL",
  CRIMINAL: "CRIMINAL",
  FAMILY: "FAMILY",
  LAND_PROPERTY: "LAND_PROPERTY",
  CONSTITUTIONAL_WRIT: "CONSTITUTIONAL_WRIT",
  TAXATION_REVENUE: "TAXATION_REVENUE",
  CUSTOMS_VAT: "CUSTOMS_VAT",
  LABOUR_EMPLOYMENT: "LABOUR_EMPLOYMENT",
  COMMERCIAL_CORPORATE: "COMMERCIAL_CORPORATE",
  ARBITRATION_ADR: "ARBITRATION_ADR",
  BANKING_ARTHA_RIN: "BANKING_ARTHA_RIN",
  CHEQUE_DISHONOUR_NI_ACT: "CHEQUE_DISHONOUR_NI_ACT",
  OTHER: "OTHER",
} as const;

export const CASE_TYPE_LIST = Object.values(CASE_TYPES);
export type CaseType = (typeof CASE_TYPES)[keyof typeof CASE_TYPES];

export const CASE_STATUSES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  HEARING_STAGED: "HEARING_STAGED",
  ARGUMENTS_PENDING: "ARGUMENTS_PENDING",
  JUDGMENT_RESERVED: "JUDGMENT_RESERVED",
  ON_HOLD: "ON_HOLD",
  DISPOSED: "DISPOSED",
  CLOSED: "CLOSED",
} as const;

export const CASE_STATUS_LIST = Object.values(CASE_STATUSES);
export type CaseStatus = (typeof CASE_STATUSES)[keyof typeof CASE_STATUSES];

export const CASE_PRIORITIES = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export const CASE_PRIORITY_LIST = Object.values(CASE_PRIORITIES);
export type CasePriority = (typeof CASE_PRIORITIES)[keyof typeof CASE_PRIORITIES];

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  [CASE_TYPES.CIVIL]: "Civil",
  [CASE_TYPES.CRIMINAL]: "Criminal",
  [CASE_TYPES.FAMILY]: "Family",
  [CASE_TYPES.LAND_PROPERTY]: "Land & Property",
  [CASE_TYPES.CONSTITUTIONAL_WRIT]: "Constitutional Writ",
  [CASE_TYPES.TAXATION_REVENUE]: "Taxation & Revenue",
  [CASE_TYPES.CUSTOMS_VAT]: "Customs & VAT",
  [CASE_TYPES.LABOUR_EMPLOYMENT]: "Labour & Employment",
  [CASE_TYPES.COMMERCIAL_CORPORATE]: "Commercial & Corporate",
  [CASE_TYPES.ARBITRATION_ADR]: "Arbitration & ADR",
  [CASE_TYPES.BANKING_ARTHA_RIN]: "Banking & Artha Rin",
  [CASE_TYPES.CHEQUE_DISHONOUR_NI_ACT]: "Cheque Dishonour (NI Act)",
  [CASE_TYPES.OTHER]: "Other Matter",
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  [CASE_STATUSES.DRAFT]: "Draft",
  [CASE_STATUSES.ACTIVE]: "Active",
  [CASE_STATUSES.HEARING_STAGED]: "Hearing Staged",
  [CASE_STATUSES.ARGUMENTS_PENDING]: "Arguments Pending",
  [CASE_STATUSES.JUDGMENT_RESERVED]: "Judgment Reserved",
  [CASE_STATUSES.ON_HOLD]: "On Hold",
  [CASE_STATUSES.DISPOSED]: "Disposed",
  [CASE_STATUSES.CLOSED]: "Closed",
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  [CASE_PRIORITIES.LOW]: "Low",
  [CASE_PRIORITIES.NORMAL]: "Normal",
  [CASE_PRIORITIES.HIGH]: "High",
  [CASE_PRIORITIES.URGENT]: "Urgent",
};

export const CASE_PAGE_LIMITS = [10, 20, 50, 100] as const;
export type CasePageLimit = (typeof CASE_PAGE_LIMITS)[number];
export const CASE_DEFAULT_PAGE_LIMIT: CasePageLimit = 10;

export const CASE_SORT_OPTIONS = {
  NEWEST: "newest",
  OLDEST: "oldest",
  TITLE_ASC: "title_asc",
  TITLE_DESC: "title_desc",
  CASE_NUMBER_ASC: "case_number_asc",
  CASE_NUMBER_DESC: "case_number_desc",
  FILING_DATE_DESC: "filing_date_desc",
  FILING_DATE_ASC: "filing_date_asc",
  NEXT_HEARING_ASC: "next_hearing_asc",
  NEXT_HEARING_DESC: "next_hearing_desc",
} as const;

export const CASE_SORT_OPTION_LIST = Object.values(CASE_SORT_OPTIONS);
export type CaseSortOption = (typeof CASE_SORT_OPTIONS)[keyof typeof CASE_SORT_OPTIONS];

export const CASE_SORT_LABELS: Record<CaseSortOption, string> = {
  [CASE_SORT_OPTIONS.NEWEST]: "Recently Created",
  [CASE_SORT_OPTIONS.OLDEST]: "Oldest Created",
  [CASE_SORT_OPTIONS.TITLE_ASC]: "Title (A-Z)",
  [CASE_SORT_OPTIONS.TITLE_DESC]: "Title (Z-A)",
  [CASE_SORT_OPTIONS.CASE_NUMBER_ASC]: "Case Number (Asc)",
  [CASE_SORT_OPTIONS.CASE_NUMBER_DESC]: "Case Number (Desc)",
  [CASE_SORT_OPTIONS.FILING_DATE_DESC]: "Filing Date (Latest First)",
  [CASE_SORT_OPTIONS.FILING_DATE_ASC]: "Filing Date (Earliest First)",
  [CASE_SORT_OPTIONS.NEXT_HEARING_ASC]: "Next Hearing (Upcoming First)",
  [CASE_SORT_OPTIONS.NEXT_HEARING_DESC]: "Next Hearing (Latest First)",
};

export const CASE_STATUS_BADGE_VARIANTS: Record<
  CaseStatus,
  "gold" | "sapphire" | "emerald" | "amber" | "destructive" | "purple" | "muted"
> = {
  [CASE_STATUSES.DRAFT]: "muted",
  [CASE_STATUSES.ACTIVE]: "sapphire",
  [CASE_STATUSES.HEARING_STAGED]: "gold",
  [CASE_STATUSES.ARGUMENTS_PENDING]: "amber",
  [CASE_STATUSES.JUDGMENT_RESERVED]: "purple",
  [CASE_STATUSES.ON_HOLD]: "destructive",
  [CASE_STATUSES.DISPOSED]: "emerald",
  [CASE_STATUSES.CLOSED]: "muted",
};

export const CASE_PRIORITY_BADGE_VARIANTS: Record<
  CasePriority,
  "gold" | "sapphire" | "emerald" | "destructive"
> = {
  [CASE_PRIORITIES.LOW]: "emerald",
  [CASE_PRIORITIES.NORMAL]: "sapphire",
  [CASE_PRIORITIES.HIGH]: "gold",
  [CASE_PRIORITIES.URGENT]: "destructive",
};

export const CASE_QUERY_KEYS = {
  all: ["cases"] as const,
  lists: () => [...CASE_QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...CASE_QUERY_KEYS.lists(), filters] as const,
  details: () => [...CASE_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...CASE_QUERY_KEYS.details(), id] as const,
  hearings: (caseId: string, filters: Record<string, unknown> = {}) =>
    [...CASE_QUERY_KEYS.detail(caseId), "hearings", filters] as const,
  hearingsPrefix: (caseId: string) =>
    [...CASE_QUERY_KEYS.detail(caseId), "hearings"] as const,
  documents: (caseId: string, filters: Record<string, unknown> = {}) =>
    [...CASE_QUERY_KEYS.detail(caseId), "documents", filters] as const,
  documentsPrefix: (caseId: string) =>
    [...CASE_QUERY_KEYS.detail(caseId), "documents"] as const,
  events: (caseId: string, filters: Record<string, unknown> = {}) =>
    [...CASE_QUERY_KEYS.detail(caseId), "events", filters] as const,
  eventsPrefix: (caseId: string) =>
    [...CASE_QUERY_KEYS.detail(caseId), "events"] as const,
  parties: (caseId: string, filters: Record<string, unknown> = {}) =>
    [...CASE_QUERY_KEYS.detail(caseId), "parties", filters] as const,
  partiesPrefix: (caseId: string) =>
    [...CASE_QUERY_KEYS.detail(caseId), "parties"] as const,
};

