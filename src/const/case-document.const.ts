/**
 * Case Legal Documents Domain Constants
 */

export const CASE_DOCUMENT_TYPES = {
  PLAINT_OR_PETITION: "PLAINT_OR_PETITION",
  WRITTEN_STATEMENT: "WRITTEN_STATEMENT",
  INJUNCTION_APPLICATION: "INJUNCTION_APPLICATION",
  BAIL_PETITION: "BAIL_PETITION",
  INTERLOCUTORY_ORDER: "INTERLOCUTORY_ORDER",
  FINAL_JUDGMENT: "FINAL_JUDGMENT",
  DECREE: "DECREE",
  DOCUMENTARY_EVIDENCE: "DOCUMENTARY_EVIDENCE",
  CERTIFIED_COPY: "CERTIFIED_COPY",
  TITLE_DEED_DALIL: "TITLE_DEED_DALIL",
  KHATIAN_OR_MUTATION: "KHATIAN_OR_MUTATION",
  VAKALATNAMA_POWER: "VAKALATNAMA_POWER",
  POLICE_FIRST_INFORMATION_REPORT: "POLICE_FIRST_INFORMATION_REPORT",
  CHARGE_SHEET: "CHARGE_SHEET",
  TAX_ASSESSMENT_ORDER: "TAX_ASSESSMENT_ORDER",
  TAX_DEMAND_NOTICE: "TAX_DEMAND_NOTICE",
  CORRESPONDENCE: "CORRESPONDENCE",
  LEGAL_NOTICE: "LEGAL_NOTICE",
  OTHER: "OTHER",
} as const;

export const CASE_DOCUMENT_TYPE_LIST = Object.values(CASE_DOCUMENT_TYPES);
export type CaseDocumentType = (typeof CASE_DOCUMENT_TYPES)[keyof typeof CASE_DOCUMENT_TYPES];

export const CASE_DOCUMENT_TYPE_LABELS: Record<CaseDocumentType, string> = {
  [CASE_DOCUMENT_TYPES.PLAINT_OR_PETITION]: "Plaint / Petition",
  [CASE_DOCUMENT_TYPES.WRITTEN_STATEMENT]: "Written Statement (Jabab)",
  [CASE_DOCUMENT_TYPES.INJUNCTION_APPLICATION]: "Injunction Application",
  [CASE_DOCUMENT_TYPES.BAIL_PETITION]: "Bail Petition",
  [CASE_DOCUMENT_TYPES.INTERLOCUTORY_ORDER]: "Interlocutory Order",
  [CASE_DOCUMENT_TYPES.FINAL_JUDGMENT]: "Final Judgment",
  [CASE_DOCUMENT_TYPES.DECREE]: "Decree",
  [CASE_DOCUMENT_TYPES.DOCUMENTARY_EVIDENCE]: "Documentary Evidence (Prashangik Dalil)",
  [CASE_DOCUMENT_TYPES.CERTIFIED_COPY]: "Certified Copy (Nokol)",
  [CASE_DOCUMENT_TYPES.TITLE_DEED_DALIL]: "Title Deed (Saf-Kabala / Heba Dalil)",
  [CASE_DOCUMENT_TYPES.KHATIAN_OR_MUTATION]: "Khatian / Mutation (CS/SA/RS/BS/Porcha)",
  [CASE_DOCUMENT_TYPES.VAKALATNAMA_POWER]: "Vakalatnama / Power of Attorney",
  [CASE_DOCUMENT_TYPES.POLICE_FIRST_INFORMATION_REPORT]: "Police FIR (First Information Report)",
  [CASE_DOCUMENT_TYPES.CHARGE_SHEET]: "Police Charge Sheet",
  [CASE_DOCUMENT_TYPES.TAX_ASSESSMENT_ORDER]: "Tax Assessment Order",
  [CASE_DOCUMENT_TYPES.TAX_DEMAND_NOTICE]: "Tax Demand Notice",
  [CASE_DOCUMENT_TYPES.CORRESPONDENCE]: "Legal Correspondence",
  [CASE_DOCUMENT_TYPES.LEGAL_NOTICE]: "Legal Notice / Demand Notice",
  [CASE_DOCUMENT_TYPES.OTHER]: "Other Legal Document",
};

// Maximum document size is 25 MB per legal domain specification
export const CASE_DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024;

export const CASE_DOCUMENT_PAGE_LIMITS = [10, 20, 50, 100] as const;
export const CASE_DOCUMENT_DEFAULT_PAGE_LIMIT: CaseDocumentPageLimit = 10;
export type CaseDocumentPageLimit = (typeof CASE_DOCUMENT_PAGE_LIMITS)[number];

export const CASE_DOCUMENT_SORT_OPTIONS = {
  NEWEST: "newest",
  OLDEST: "oldest",
  TITLE_ASC: "title_asc",
  TITLE_DESC: "title_desc",
  DATE_DESC: "date_desc",
  DATE_ASC: "date_asc",
} as const;

export const CASE_DOCUMENT_SORT_OPTION_LIST = Object.values(CASE_DOCUMENT_SORT_OPTIONS);
export type CaseDocumentSortOption =
  (typeof CASE_DOCUMENT_SORT_OPTIONS)[keyof typeof CASE_DOCUMENT_SORT_OPTIONS];

export const CASE_DOCUMENT_ALLOWED_MIME_TYPES = [
  // PDF
  "application/pdf",
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const CASE_DOCUMENT_QUERY_KEYS = {
  all: ["case-documents"] as const,
  byCase: (caseId: string) =>
    [...CASE_DOCUMENT_QUERY_KEYS.all, "case", caseId] as const,
  list: (caseId: string, filters: Record<string, unknown> = {}) =>
    [...CASE_DOCUMENT_QUERY_KEYS.byCase(caseId), "list", filters] as const,
  detail: (caseId: string, docId: string) =>
    [...CASE_DOCUMENT_QUERY_KEYS.byCase(caseId), "detail", docId] as const,
};
