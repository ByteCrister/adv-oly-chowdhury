/**
 * Unified Legal Documents Management Domain Constants
 * Central registry for /dashboard/documents and unified document APIs.
 */

export const DOCUMENT_ENTITY_TYPES = {
  CASE: "CASE",
  CLIENT: "CLIENT",
} as const;

export const DOCUMENT_ENTITY_TYPE_LIST = Object.values(DOCUMENT_ENTITY_TYPES);
export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[keyof typeof DOCUMENT_ENTITY_TYPES];

export const DOCUMENT_SCOPES = {
  ALL: "all",
  CASE: "case",
  CLIENT: "client",
} as const;

export const DOCUMENT_SCOPE_LIST = Object.values(DOCUMENT_SCOPES);
export type DocumentScope = (typeof DOCUMENT_SCOPES)[keyof typeof DOCUMENT_SCOPES];

export const DOCUMENT_PAGE_LIMITS = [10, 20, 50, 100] as const;
export const DOCUMENT_DEFAULT_PAGE_LIMIT: DocumentPageLimit = 10;
export type DocumentPageLimit = (typeof DOCUMENT_PAGE_LIMITS)[number];

export const DOCUMENT_SORT_OPTIONS = {
  NEWEST: "newest",
  OLDEST: "oldest",
  TITLE_ASC: "title_asc",
  TITLE_DESC: "title_desc",
  DATE_DESC: "date_desc",
  DATE_ASC: "date_asc",
} as const;

export const DOCUMENT_SORT_OPTION_LIST = Object.values(DOCUMENT_SORT_OPTIONS);
export type DocumentSortOption =
  (typeof DOCUMENT_SORT_OPTIONS)[keyof typeof DOCUMENT_SORT_OPTIONS];

export const DOCUMENT_QUERY_KEYS = {
  all: ["documents"] as const,
  list: (params: Record<string, unknown> = {}) =>
    [...DOCUMENT_QUERY_KEYS.all, "list", params] as const,
  detail: (id: string, entityType?: string) =>
    [...DOCUMENT_QUERY_KEYS.all, "detail", id, entityType || "any"] as const,
};

// Strict 2MB size limit for legal and client documents
export const DOCUMENT_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const DOCUMENT_MAX_SIZE_MB = 2;

export const DOCUMENT_ALLOWED_MIME_TYPES = [
  // PDF
  "application/pdf",
  // Word Documents
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  // Images (scans, deeds, NID cards, receipts)
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const DOCUMENT_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

