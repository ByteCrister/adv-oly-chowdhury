/**
 * Court & Judicial System Constants (Bangladesh Legal System)
 */

export const COURT_TYPES = {
  SUPREME_COURT: "SUPREME_COURT",
  APPELLATE_DIVISION: "APPELLATE_DIVISION",
  HIGH_COURT_DIVISION: "HIGH_COURT_DIVISION",
  DISTRICT_JUDGE_COURT: "DISTRICT_JUDGE_COURT",
  ADDITIONAL_DISTRICT_JUDGE: "ADDITIONAL_DISTRICT_JUDGE",
  JOINT_DISTRICT_JUDGE: "JOINT_DISTRICT_JUDGE",
  SENIOR_ASSISTANT_JUDGE: "SENIOR_ASSISTANT_JUDGE",
  ASSISTANT_JUDGE: "ASSISTANT_JUDGE",
  SESSIONS_COURT: "SESSIONS_COURT",
  METROPOLITAN_SESSIONS_COURT: "METROPOLITAN_SESSIONS_COURT",
  CHIEF_JUDICIAL_MAGISTRATE: "CHIEF_JUDICIAL_MAGISTRATE",
  CHIEF_METROPOLITAN_MAGISTRATE: "CHIEF_METROPOLITAN_MAGISTRATE",
  MAGISTRATE_COURT: "MAGISTRATE_COURT",
  TAXES_BAR_TRIBUNAL: "TAXES_BAR_TRIBUNAL",
  CUSTOMS_EXCISE_VAT_TRIBUNAL: "CUSTOMS_EXCISE_VAT_TRIBUNAL",
  LABOUR_COURT: "LABOUR_COURT",
  FAMILY_COURT: "FAMILY_COURT",
  MONEY_LOAN_COURT: "MONEY_LOAN_COURT",
  ADMINISTRATIVE_TRIBUNAL: "ADMINISTRATIVE_TRIBUNAL",
  SPECIAL_TRIBUNAL: "SPECIAL_TRIBUNAL",
  OTHER: "OTHER",
} as const;

export const COURT_TYPE_LIST = Object.values(COURT_TYPES);
export type CourtType = (typeof COURT_TYPES)[keyof typeof COURT_TYPES];

export const BANGLADESH_DIVISIONS = {
  SYLHET: "Sylhet",
  DHAKA: "Dhaka",
  CHATTOGRAM: "Chattogram",
  RAJSHAHI: "Rajshahi",
  KHULNA: "Khulna",
  BARISHAL: "Barishal",
  RANGPUR: "Rangpur",
  MYMENSINGH: "Mymensingh",
} as const;

export const BANGLADESH_DIVISION_LIST = Object.values(BANGLADESH_DIVISIONS);
export type BangladeshDivision = (typeof BANGLADESH_DIVISIONS)[keyof typeof BANGLADESH_DIVISIONS];

export const COURT_TYPE_LABELS: Record<CourtType, string> = {
  [COURT_TYPES.SUPREME_COURT]: "Supreme Court of Bangladesh",
  [COURT_TYPES.APPELLATE_DIVISION]: "Appellate Division",
  [COURT_TYPES.HIGH_COURT_DIVISION]: "High Court Division",
  [COURT_TYPES.DISTRICT_JUDGE_COURT]: "District Judge Court",
  [COURT_TYPES.ADDITIONAL_DISTRICT_JUDGE]: "Additional District Judge Court",
  [COURT_TYPES.JOINT_DISTRICT_JUDGE]: "Joint District Judge Court",
  [COURT_TYPES.SENIOR_ASSISTANT_JUDGE]: "Senior Assistant Judge Court",
  [COURT_TYPES.ASSISTANT_JUDGE]: "Assistant Judge Court",
  [COURT_TYPES.SESSIONS_COURT]: "Sessions Judge Court",
  [COURT_TYPES.METROPOLITAN_SESSIONS_COURT]: "Metropolitan Sessions Judge Court",
  [COURT_TYPES.CHIEF_JUDICIAL_MAGISTRATE]: "Chief Judicial Magistrate (CJM) Court",
  [COURT_TYPES.CHIEF_METROPOLITAN_MAGISTRATE]: "Chief Metropolitan Magistrate (CMM) Court",
  [COURT_TYPES.MAGISTRATE_COURT]: "Judicial Magistrate Court",
  [COURT_TYPES.TAXES_BAR_TRIBUNAL]: "Taxes Appellate Tribunal",
  [COURT_TYPES.CUSTOMS_EXCISE_VAT_TRIBUNAL]: "Customs, Excise & VAT Appellate Tribunal",
  [COURT_TYPES.LABOUR_COURT]: "Labour Court",
  [COURT_TYPES.FAMILY_COURT]: "Family Court",
  [COURT_TYPES.MONEY_LOAN_COURT]: "Money Loan Court (Artha Rin Adalat)",
  [COURT_TYPES.ADMINISTRATIVE_TRIBUNAL]: "Administrative Tribunal",
  [COURT_TYPES.SPECIAL_TRIBUNAL]: "Special Tribunal",
  [COURT_TYPES.OTHER]: "Other Court / Tribunal",
};

export const COURT_PAGE_LIMITS = [10, 20, 50, 100] as const;
export type CourtPageLimit = (typeof COURT_PAGE_LIMITS)[number];
export const COURT_DEFAULT_PAGE_LIMIT: CourtPageLimit = 10;

export const COURT_SORT_OPTIONS = {
  NEWEST: "newest",
  OLDEST: "oldest",
  NAME_ASC: "name_asc",
  NAME_DESC: "name_desc",
  TYPE_ASC: "type_asc",
  TYPE_DESC: "type_desc",
} as const;

export type CourtSortOption =
  (typeof COURT_SORT_OPTIONS)[keyof typeof COURT_SORT_OPTIONS];

export const COURT_SORT_LABELS: Record<CourtSortOption, string> = {
  [COURT_SORT_OPTIONS.NEWEST]: "Newest First",
  [COURT_SORT_OPTIONS.OLDEST]: "Oldest First",
  [COURT_SORT_OPTIONS.NAME_ASC]: "Name (A–Z)",
  [COURT_SORT_OPTIONS.NAME_DESC]: "Name (Z–A)",
  [COURT_SORT_OPTIONS.TYPE_ASC]: "Court Type (A–Z)",
  [COURT_SORT_OPTIONS.TYPE_DESC]: "Court Type (Z–A)",
};

export const COURT_QUERY_KEYS = {
  all: ["courts"] as const,
  lists: () => [...COURT_QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...COURT_QUERY_KEYS.lists(), filters] as const,
};

