/**
 * Case Parties Domain Constants
 */

export const PARTY_TYPES = {
  INDIVIDUAL: "INDIVIDUAL",
  ORGANIZATION: "ORGANIZATION",
} as const;

export const PARTY_TYPE_LIST = Object.values(PARTY_TYPES);
export type PartyType = (typeof PARTY_TYPES)[keyof typeof PARTY_TYPES];

export const PARTY_ROLES = {
  PLAINTIFF: "PLAINTIFF",
  DEFENDANT: "DEFENDANT",
  PETITIONER: "PETITIONER",
  RESPONDENT: "RESPONDENT",
  COMPLAINANT: "COMPLAINANT",
  ACCUSED: "ACCUSED",
  APPELLANT: "APPELLANT",
  OPPOSITE_PARTY: "OPPOSITE_PARTY",
  THIRD_PARTY: "THIRD_PARTY",
  WITNESS: "WITNESS",
  LEGAL_HEIR: "LEGAL_HEIR",
  OTHER: "OTHER",
} as const;

export const PARTY_ROLE_LIST = Object.values(PARTY_ROLES);
export type PartyRole = (typeof PARTY_ROLES)[keyof typeof PARTY_ROLES];

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  [PARTY_TYPES.INDIVIDUAL]: "Individual",
  [PARTY_TYPES.ORGANIZATION]: "Organization / Corporate",
};

export const PARTY_ROLE_LABELS: Record<PartyRole, string> = {
  [PARTY_ROLES.PLAINTIFF]: "Plaintiff (Badi)",
  [PARTY_ROLES.DEFENDANT]: "Defendant (Bibadi)",
  [PARTY_ROLES.PETITIONER]: "Petitioner (Dor-khastokari)",
  [PARTY_ROLES.RESPONDENT]: "Respondent (Uttordata)",
  [PARTY_ROLES.COMPLAINANT]: "Complainant (Foriadi)",
  [PARTY_ROLES.ACCUSED]: "Accused (Ashami)",
  [PARTY_ROLES.APPELLANT]: "Appellant (Apil-kari)",
  [PARTY_ROLES.OPPOSITE_PARTY]: "Opposite Party (Apor-pokkho)",
  [PARTY_ROLES.THIRD_PARTY]: "Third Party",
  [PARTY_ROLES.WITNESS]: "Witness (Shakkhi)",
  [PARTY_ROLES.LEGAL_HEIR]: "Legal Heir (Waris)",
  [PARTY_ROLES.OTHER]: "Other Party",
};

export const CASE_PARTY_TYPE_LABELS = PARTY_TYPE_LABELS;
export const CASE_PARTY_ROLE_LABELS = PARTY_ROLE_LABELS;


export const CASE_PARTY_PAGE_LIMITS = [10, 20, 50, 100] as const;
export type CasePartyPageLimit = (typeof CASE_PARTY_PAGE_LIMITS)[number];
export const CASE_PARTY_DEFAULT_PAGE_LIMIT: CasePartyPageLimit = 20;

export const CASE_PARTY_SORT_OPTIONS = {
  NAME_ASC: "name_asc",
  NAME_DESC: "name_desc",
  ROLE_ASC: "role_asc",
  NEWEST: "newest",
  OLDEST: "oldest",
} as const;

export const CASE_PARTY_SORT_OPTION_LIST = Object.values(CASE_PARTY_SORT_OPTIONS);
export type CasePartySortOption =
  (typeof CASE_PARTY_SORT_OPTIONS)[keyof typeof CASE_PARTY_SORT_OPTIONS];

export const CASE_PARTY_SORT_LABELS: Record<CasePartySortOption, string> = {
  [CASE_PARTY_SORT_OPTIONS.NAME_ASC]: "Name (A-Z)",
  [CASE_PARTY_SORT_OPTIONS.NAME_DESC]: "Name (Z-A)",
  [CASE_PARTY_SORT_OPTIONS.ROLE_ASC]: "Role (A-Z)",
  [CASE_PARTY_SORT_OPTIONS.NEWEST]: "Recently Added",
  [CASE_PARTY_SORT_OPTIONS.OLDEST]: "Oldest Added",
};

export const CASE_PARTY_QUERY_KEYS = {
  all: ["case-parties"] as const,
  byCase: (caseId: string) => [...CASE_PARTY_QUERY_KEYS.all, "case", caseId] as const,
  list: (caseId: string, filters: Record<string, unknown> = {}) =>
    [...CASE_PARTY_QUERY_KEYS.byCase(caseId), "list", filters] as const,
  detail: (caseId: string, partyId: string) =>
    [...CASE_PARTY_QUERY_KEYS.byCase(caseId), "detail", partyId] as const,
};

