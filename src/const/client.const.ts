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

export const CLIENT_PAGE_LIMITS = [10, 20, 50, 100] as const;
export const CLIENT_DEFAULT_PAGE_LIMIT: ClientPageLimit = 10;
export type ClientPageLimit = (typeof CLIENT_PAGE_LIMITS)[number];

export const CLIENT_SORT_OPTIONS = {
  NEWEST: "newest",
  OLDEST: "oldest",
  NAME_ASC: "name_asc",
  NAME_DESC: "name_desc",
  CLIENT_NUMBER_ASC: "client_number_asc",
  CLIENT_NUMBER_DESC: "client_number_desc",
} as const;

export const CLIENT_SORT_OPTION_LIST = Object.values(CLIENT_SORT_OPTIONS);
export type ClientSortOption = (typeof CLIENT_SORT_OPTIONS)[keyof typeof CLIENT_SORT_OPTIONS];

export const CLIENT_QUERY_KEYS = {
  all: ["clients"] as const,
  lists: () => [...CLIENT_QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...CLIENT_QUERY_KEYS.lists(), filters] as const,
  details: () => [...CLIENT_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...CLIENT_QUERY_KEYS.details(), id] as const,
  stats: () => [...CLIENT_QUERY_KEYS.all, "stats"] as const,
};
