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
