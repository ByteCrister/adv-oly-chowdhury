/**
 * Case Chronological Events Domain Constants
 */

export const CASE_EVENT_TYPES = {
  CASE_FILED: "CASE_FILED",
  NOTICE_SERVED: "NOTICE_SERVED",
  SUMMONS_ISSUED: "SUMMONS_ISSUED",
  APPLICATION_SUBMITTED: "APPLICATION_SUBMITTED",
  REPLY_SUBMITTED: "REPLY_SUBMITTED",
  STAY_ORDER_GRANTED: "STAY_ORDER_GRANTED",
  INTERIM_INJUNCTION_ORDER: "INTERIM_INJUNCTION_ORDER",
  BAIL_GRANTED: "BAIL_GRANTED",
  BAIL_REJECTED: "BAIL_REJECTED",
  DEED_COLLECTED: "DEED_COLLECTED",
  CERTIFIED_COPY_RECEIVED: "CERTIFIED_COPY_RECEIVED",
  EVIDENCE_EXHIBITED: "EVIDENCE_EXHIBITED",
  LOCAL_INVESTIGATION_ORDER: "LOCAL_INVESTIGATION_ORDER",
  FINAL_JUDGMENT: "FINAL_JUDGMENT",
  DECREE_DRAWN: "DECREE_DRAWN",
  APPEAL_PREFERRED: "APPEAL_PREFERRED",
  EXECUTION_PETITION_FILED: "EXECUTION_PETITION_FILED",
  TAX_CHALLAN_DEPOSITED: "TAX_CHALLAN_DEPOSITED",
  SETTLEMENT_REACHED: "SETTLEMENT_REACHED",
  OTHER: "OTHER",
} as const;

export const CASE_EVENT_TYPE_LIST = Object.values(CASE_EVENT_TYPES);
export type CaseEventType = (typeof CASE_EVENT_TYPES)[keyof typeof CASE_EVENT_TYPES];

export const CASE_EVENT_TYPE_LABELS: Record<CaseEventType, string> = {
  [CASE_EVENT_TYPES.CASE_FILED]: "Case Filed",
  [CASE_EVENT_TYPES.NOTICE_SERVED]: "Notice Served",
  [CASE_EVENT_TYPES.SUMMONS_ISSUED]: "Summons Issued",
  [CASE_EVENT_TYPES.APPLICATION_SUBMITTED]: "Application Submitted",
  [CASE_EVENT_TYPES.REPLY_SUBMITTED]: "Reply Submitted",
  [CASE_EVENT_TYPES.STAY_ORDER_GRANTED]: "Stay Order Granted",
  [CASE_EVENT_TYPES.INTERIM_INJUNCTION_ORDER]: "Interim Injunction Order",
  [CASE_EVENT_TYPES.BAIL_GRANTED]: "Bail Granted",
  [CASE_EVENT_TYPES.BAIL_REJECTED]: "Bail Rejected",
  [CASE_EVENT_TYPES.DEED_COLLECTED]: "Deed Collected",
  [CASE_EVENT_TYPES.CERTIFIED_COPY_RECEIVED]: "Certified Copy Received",
  [CASE_EVENT_TYPES.EVIDENCE_EXHIBITED]: "Evidence Exhibited",
  [CASE_EVENT_TYPES.LOCAL_INVESTIGATION_ORDER]: "Local Investigation Order",
  [CASE_EVENT_TYPES.FINAL_JUDGMENT]: "Final Judgment Delivered",
  [CASE_EVENT_TYPES.DECREE_DRAWN]: "Decree Drawn",
  [CASE_EVENT_TYPES.APPEAL_PREFERRED]: "Appeal Preferred",
  [CASE_EVENT_TYPES.EXECUTION_PETITION_FILED]: "Execution Petition Filed",
  [CASE_EVENT_TYPES.TAX_CHALLAN_DEPOSITED]: "Tax Challan Deposited",
  [CASE_EVENT_TYPES.SETTLEMENT_REACHED]: "Settlement Reached (ADR)",
  [CASE_EVENT_TYPES.OTHER]: "Other Case Event",
};

export const CASE_EVENT_PAGE_LIMITS = [10, 20, 50, 100] as const;
export type CaseEventPageLimit = (typeof CASE_EVENT_PAGE_LIMITS)[number];
export const CASE_EVENT_DEFAULT_PAGE_LIMIT: CaseEventPageLimit = 20;

export const CASE_EVENT_SORT_OPTIONS = {
  DATE_DESC: "date_desc",
  DATE_ASC: "date_asc",
  NEWEST: "newest",
  OLDEST: "oldest",
} as const;

export const CASE_EVENT_SORT_OPTION_LIST = Object.values(CASE_EVENT_SORT_OPTIONS);
export type CaseEventSortOption =
  (typeof CASE_EVENT_SORT_OPTIONS)[keyof typeof CASE_EVENT_SORT_OPTIONS];

export const CASE_EVENT_SORT_LABELS: Record<CaseEventSortOption, string> = {
  [CASE_EVENT_SORT_OPTIONS.DATE_DESC]: "Event Date (Latest First)",
  [CASE_EVENT_SORT_OPTIONS.DATE_ASC]: "Event Date (Earliest First)",
  [CASE_EVENT_SORT_OPTIONS.NEWEST]: "Recently Added",
  [CASE_EVENT_SORT_OPTIONS.OLDEST]: "Oldest Added",
};

export const CASE_EVENT_QUERY_KEYS = {
  all: ["case-events"] as const,
  byCase: (caseId: string) => [...CASE_EVENT_QUERY_KEYS.all, "case", caseId] as const,
  list: (caseId: string, filters: Record<string, unknown> = {}) =>
    [...CASE_EVENT_QUERY_KEYS.byCase(caseId), "list", filters] as const,
  detail: (caseId: string, eventId: string) =>
    [...CASE_EVENT_QUERY_KEYS.byCase(caseId), "detail", eventId] as const,
};

