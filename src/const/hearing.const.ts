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
