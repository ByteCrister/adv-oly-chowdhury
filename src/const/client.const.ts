/**
 * Client Domain Constants
 */

export const CLIENT_TYPES = {
  INDIVIDUAL: "INDIVIDUAL",
  ORGANIZATION: "ORGANIZATION",
} as const;

export const CLIENT_TYPE_LIST = Object.values(CLIENT_TYPES);
export type ClientType = (typeof CLIENT_TYPES)[keyof typeof CLIENT_TYPES];

export const CLIENT_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export const CLIENT_STATUS_LIST = Object.values(CLIENT_STATUSES);
export type ClientStatus = (typeof CLIENT_STATUSES)[keyof typeof CLIENT_STATUSES];

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  [CLIENT_TYPES.INDIVIDUAL]: "Individual",
  [CLIENT_TYPES.ORGANIZATION]: "Corporate / Organization",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  [CLIENT_STATUSES.ACTIVE]: "Active",
  [CLIENT_STATUSES.INACTIVE]: "Inactive",
  [CLIENT_STATUSES.ARCHIVED]: "Archived",
};
