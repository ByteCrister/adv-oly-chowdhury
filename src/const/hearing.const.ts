/**
 * Court Hearing Domain Constants
 */

export const HEARING_STATUSES = {
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  ADJOURNED: "ADJOURNED",
  CANCELLED: "CANCELLED",
} as const;

export const HEARING_STATUS_LIST = Object.values(HEARING_STATUSES);
export type HearingStatus = (typeof HEARING_STATUSES)[keyof typeof HEARING_STATUSES];

export const HEARING_STATUS_LABELS: Record<HearingStatus, string> = {
  [HEARING_STATUSES.SCHEDULED]: "Scheduled",
  [HEARING_STATUSES.IN_PROGRESS]: "In Progress",
  [HEARING_STATUSES.COMPLETED]: "Completed",
  [HEARING_STATUSES.ADJOURNED]: "Adjourned",
  [HEARING_STATUSES.CANCELLED]: "Cancelled",
};

export const COMMON_HEARING_TYPES = {
  SUMMONS_RETURN: "Summons / Notice Return",
  WRITTEN_STATEMENT: "Filing of Written Statement",
  FRAMING_OF_ISSUES: "Framing of Issues",
  DOCUMENTARY_EVIDENCE: "Production of Documents",
  WITNESS_EXAMINATION: "Witness Examination (P.W. / D.W.)",
  CROSS_EXAMINATION: "Cross Examination",
  ARGUMENTS: "Final Arguments",
  ORDER: "Interlocutory Order",
  JUDGMENT: "Delivery of Judgment",
  BAIL_HEARING: "Bail Hearing",
  POLICE_REPORT_HEARING: "Hearing on Police Report / Charge-Sheet",
  CHARGE_FRAMING: "Charge Framing",
  TAX_ASSESSMENT_HEARING: "Tax Assessment Hearing",
  TAX_APPEAL_HEARING: "Tax Appeal / Tribunal Hearing",
  OTHER: "Other Proceedings",
} as const;

export const COMMON_HEARING_TYPE_LIST = Object.values(COMMON_HEARING_TYPES);
export type CommonHearingType = (typeof COMMON_HEARING_TYPES)[keyof typeof COMMON_HEARING_TYPES];

export const HEARING_PAGE_LIMITS = [10, 20, 50, 100] as const;
export type HearingPageLimit = (typeof HEARING_PAGE_LIMITS)[number];
export const HEARING_DEFAULT_PAGE_LIMIT: HearingPageLimit = 10;

export const HEARING_SORT_OPTIONS = {
  UPCOMING_FIRST: "upcoming_first",
  DATE_DESC: "date_desc",
  DATE_ASC: "date_asc",
  NEWEST_CREATED: "newest",
  OLDEST_CREATED: "oldest",
} as const;

export type HearingSortOption =
  (typeof HEARING_SORT_OPTIONS)[keyof typeof HEARING_SORT_OPTIONS];

export const HEARING_SORT_LABELS: Record<HearingSortOption, string> = {
  [HEARING_SORT_OPTIONS.UPCOMING_FIRST]: "Upcoming First",
  [HEARING_SORT_OPTIONS.DATE_DESC]: "Hearing Date (Latest First)",
  [HEARING_SORT_OPTIONS.DATE_ASC]: "Hearing Date (Earliest First)",
  [HEARING_SORT_OPTIONS.NEWEST_CREATED]: "Recently Added",
  [HEARING_SORT_OPTIONS.OLDEST_CREATED]: "Oldest Added",
};

export const HEARING_STATUS_BADGE_VARIANTS: Record<
  HearingStatus,
  "gold" | "sapphire" | "emerald" | "amber" | "destructive"
> = {
  [HEARING_STATUSES.SCHEDULED]: "gold",
  [HEARING_STATUSES.IN_PROGRESS]: "sapphire",
  [HEARING_STATUSES.COMPLETED]: "emerald",
  [HEARING_STATUSES.ADJOURNED]: "amber",
  [HEARING_STATUSES.CANCELLED]: "destructive",
};

export const HEARING_QUERY_KEYS = {
  all: ["hearings"] as const,
  lists: () => [...HEARING_QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...HEARING_QUERY_KEYS.lists(), filters] as const,
  details: () => [...HEARING_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...HEARING_QUERY_KEYS.details(), id] as const,
};
