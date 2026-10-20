/**
 * Client Identity & Organizational Documents Domain Constants
 */

export const CLIENT_DOCUMENT_TYPES = {
  NATIONAL_ID: "NATIONAL_ID",
  PASSPORT: "PASSPORT",
  BIRTH_CERTIFICATE: "BIRTH_CERTIFICATE",
  TRADE_LICENSE: "TRADE_LICENSE",
  TIN_CERTIFICATE: "TIN_CERTIFICATE",
  BIN_VAT_CERTIFICATE: "BIN_VAT_CERTIFICATE",
  CERTIFICATE_OF_INCORPORATION: "CERTIFICATE_OF_INCORPORATION",
  MEMORANDUM_OF_ASSOCIATION: "MEMORANDUM_OF_ASSOCIATION",
  BOARD_RESOLUTION: "BOARD_RESOLUTION",
  POWER_OF_ATTORNEY: "POWER_OF_ATTORNEY",
  RETAINER_AGREEMENT: "RETAINER_AGREEMENT",
  CLIENT_PHOTOGRAPH: "CLIENT_PHOTOGRAPH",
  TAX_RETURN_ACKNOWLEDGEMENT: "TAX_RETURN_ACKNOWLEDGEMENT",
  OTHER: "OTHER",
} as const;

export const CLIENT_DOCUMENT_TYPE_LIST = Object.values(CLIENT_DOCUMENT_TYPES);
export type ClientDocumentType = (typeof CLIENT_DOCUMENT_TYPES)[keyof typeof CLIENT_DOCUMENT_TYPES];

export const CLIENT_DOCUMENT_TYPE_LABELS: Record<ClientDocumentType, string> = {
  [CLIENT_DOCUMENT_TYPES.NATIONAL_ID]: "National ID (NID / Smart Card)",
  [CLIENT_DOCUMENT_TYPES.PASSPORT]: "Passport",
  [CLIENT_DOCUMENT_TYPES.BIRTH_CERTIFICATE]: "Birth Certificate",
  [CLIENT_DOCUMENT_TYPES.TRADE_LICENSE]: "Trade License",
  [CLIENT_DOCUMENT_TYPES.TIN_CERTIFICATE]: "TIN Certificate",
  [CLIENT_DOCUMENT_TYPES.BIN_VAT_CERTIFICATE]: "BIN / VAT Certificate",
  [CLIENT_DOCUMENT_TYPES.CERTIFICATE_OF_INCORPORATION]: "Certificate of Incorporation",
  [CLIENT_DOCUMENT_TYPES.MEMORANDUM_OF_ASSOCIATION]: "Memorandum & Articles of Association",
  [CLIENT_DOCUMENT_TYPES.BOARD_RESOLUTION]: "Board Resolution",
  [CLIENT_DOCUMENT_TYPES.POWER_OF_ATTORNEY]: "Power of Attorney (Am-Moktarnama)",
  [CLIENT_DOCUMENT_TYPES.RETAINER_AGREEMENT]: "Legal Retainer Agreement",
  [CLIENT_DOCUMENT_TYPES.CLIENT_PHOTOGRAPH]: "Client Photograph",
  [CLIENT_DOCUMENT_TYPES.TAX_RETURN_ACKNOWLEDGEMENT]: "Tax Return Acknowledgement Receipt",
  [CLIENT_DOCUMENT_TYPES.OTHER]: "Other Document",
};

// Maximum document size is 2 MB per system specification
export const CLIENT_DOCUMENT_MAX_SIZE_BYTES = 2 * 1024 * 1024;

export const CLIENT_DOCUMENT_PAGE_LIMITS = [10, 20, 50, 100] as const;
export const CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT: ClientDocumentPageLimit = 10;
export type ClientDocumentPageLimit = (typeof CLIENT_DOCUMENT_PAGE_LIMITS)[number];

export const CLIENT_DOCUMENT_SORT_OPTIONS = {
  NEWEST: "newest",
  OLDEST: "oldest",
  TITLE_ASC: "title_asc",
  TITLE_DESC: "title_desc",
  EXPIRY_ASC: "expiry_asc",
  EXPIRY_DESC: "expiry_desc",
} as const;

export const CLIENT_DOCUMENT_SORT_OPTION_LIST = Object.values(CLIENT_DOCUMENT_SORT_OPTIONS);
export type ClientDocumentSortOption =
  (typeof CLIENT_DOCUMENT_SORT_OPTIONS)[keyof typeof CLIENT_DOCUMENT_SORT_OPTIONS];

export const CLIENT_DOCUMENT_ALLOWED_MIME_TYPES = [
  // PDF
  "application/pdf",
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const CLIENT_DOCUMENT_QUERY_KEYS = {
  all: ["client-documents"] as const,
  byClient: (clientId: string) =>
    [...CLIENT_DOCUMENT_QUERY_KEYS.all, "client", clientId] as const,
  list: (clientId: string, filters: Record<string, unknown> = {}) =>
    [...CLIENT_DOCUMENT_QUERY_KEYS.byClient(clientId), "list", filters] as const,
  detail: (clientId: string, docId: string) =>
    [...CLIENT_DOCUMENT_QUERY_KEYS.byClient(clientId), "detail", docId] as const,
};
