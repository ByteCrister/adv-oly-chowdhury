/**
 * Audit Logging & Compliance Domain Constants
 */

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  SOFT_DELETE: "SOFT_DELETE",
  RESTORE: "RESTORE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  VIEW_CONFIDENTIAL: "VIEW_CONFIDENTIAL",
  DOWNLOAD_DOCUMENT: "DOWNLOAD_DOCUMENT",
  STATUS_CHANGE: "STATUS_CHANGE",
} as const;

export const AUDIT_ACTION_LIST = Object.values(AUDIT_ACTIONS);
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ENTITY_TYPES = {
  USER: "USER",
  CLIENT: "CLIENT",
  COURT: "COURT",
  CASE: "CASE",
  CASE_PARTY: "CASE_PARTY",
  HEARING: "HEARING",
  CASE_EVENT: "CASE_EVENT",
  TASK: "TASK",
  ASSET: "ASSET",
  ASSET_REFERENCE: "ASSET_REFERENCE",
  CASE_DOCUMENT: "CASE_DOCUMENT",
  CLIENT_DOCUMENT: "CLIENT_DOCUMENT",
  CASE_EXPENSE: "CASE_EXPENSE",
  CLIENT_PAYMENT: "CLIENT_PAYMENT",
} as const;

export const AUDIT_ENTITY_TYPE_LIST = Object.values(AUDIT_ENTITY_TYPES);
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];

export const AUDIT_PAGE_LIMITS = [10, 20, 50, 100] as const;
export type AuditPageLimit = (typeof AUDIT_PAGE_LIMITS)[number];
export const AUDIT_DEFAULT_PAGE_LIMIT: AuditPageLimit = 10;

export const AUDIT_SORT_OPTIONS = {
  NEWEST: "NEWEST",
  OLDEST: "OLDEST",
} as const;

export const AUDIT_SORT_OPTION_LIST = Object.values(AUDIT_SORT_OPTIONS);
export type AuditSortOption = (typeof AUDIT_SORT_OPTIONS)[keyof typeof AUDIT_SORT_OPTIONS];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AUDIT_ACTIONS.CREATE]: "Created",
  [AUDIT_ACTIONS.UPDATE]: "Updated",
  [AUDIT_ACTIONS.DELETE]: "Deleted",
  [AUDIT_ACTIONS.SOFT_DELETE]: "Archived",
  [AUDIT_ACTIONS.RESTORE]: "Restored",
  [AUDIT_ACTIONS.LOGIN]: "Logged In",
  [AUDIT_ACTIONS.LOGOUT]: "Logged Out",
  [AUDIT_ACTIONS.VIEW_CONFIDENTIAL]: "Viewed Confidential",
  [AUDIT_ACTIONS.DOWNLOAD_DOCUMENT]: "Downloaded Document",
  [AUDIT_ACTIONS.STATUS_CHANGE]: "Status Changed",
};

export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  [AUDIT_ENTITY_TYPES.USER]: "Profile & User",
  [AUDIT_ENTITY_TYPES.CLIENT]: "Client",
  [AUDIT_ENTITY_TYPES.COURT]: "Court",
  [AUDIT_ENTITY_TYPES.CASE]: "Case",
  [AUDIT_ENTITY_TYPES.CASE_PARTY]: "Case Party",
  [AUDIT_ENTITY_TYPES.HEARING]: "Hearing",
  [AUDIT_ENTITY_TYPES.CASE_EVENT]: "Case Event",
  [AUDIT_ENTITY_TYPES.TASK]: "Task",
  [AUDIT_ENTITY_TYPES.ASSET]: "Asset",
  [AUDIT_ENTITY_TYPES.ASSET_REFERENCE]: "Asset Reference",
  [AUDIT_ENTITY_TYPES.CASE_DOCUMENT]: "Case Document",
  [AUDIT_ENTITY_TYPES.CLIENT_DOCUMENT]: "Client Document",
  [AUDIT_ENTITY_TYPES.CASE_EXPENSE]: "Case Expense",
  [AUDIT_ENTITY_TYPES.CLIENT_PAYMENT]: "Client Payment",
};

export const AUDIT_QUERY_KEYS = {
  all: ["audit-logs"] as const,
  myHistory: (filters?: Record<string, unknown>) =>
    [...AUDIT_QUERY_KEYS.all, "me", filters] as const,
};
