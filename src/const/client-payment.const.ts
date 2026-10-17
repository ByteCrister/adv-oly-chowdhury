/**
 * Client Payments & Financial Receipts Domain Constants
 */

export const PAYMENT_METHODS = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  CHEQUE: "CHEQUE",
  BKASH: "BKASH",
  NAGAD: "NAGAD",
  ROCKET: "ROCKET",
  ONLINE_GATEWAY: "ONLINE_GATEWAY",
  OTHER: "OTHER",
} as const;

export const PAYMENT_METHOD_LIST = Object.values(PAYMENT_METHODS);
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_TYPES = {
  RETAINER_FEE: "RETAINER_FEE",
  CONSULTATION_FEE: "CONSULTATION_FEE",
  CASE_PROFESSIONAL_FEE: "CASE_PROFESSIONAL_FEE",
  HEARING_APPEARANCE_FEE: "HEARING_APPEARANCE_FEE",
  EXPENSE_REIMBURSEMENT: "EXPENSE_REIMBURSEMENT",
  FINAL_SETTLEMENT: "FINAL_SETTLEMENT",
  OTHER: "OTHER",
} as const;

export const PAYMENT_TYPE_LIST = Object.values(PAYMENT_TYPES);
export type PaymentType = (typeof PAYMENT_TYPES)[keyof typeof PAYMENT_TYPES];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PAYMENT_METHODS.CASH]: "Cash",
  [PAYMENT_METHODS.BANK_TRANSFER]: "Bank Transfer (BEFTN / RTGS)",
  [PAYMENT_METHODS.CHEQUE]: "Bank Cheque",
  [PAYMENT_METHODS.BKASH]: "bKash",
  [PAYMENT_METHODS.NAGAD]: "Nagad",
  [PAYMENT_METHODS.ROCKET]: "Rocket",
  [PAYMENT_METHODS.ONLINE_GATEWAY]: "Online Gateway",
  [PAYMENT_METHODS.OTHER]: "Other Payment Method",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PAYMENT_TYPES.RETAINER_FEE]: "Retainer Fee",
  [PAYMENT_TYPES.CONSULTATION_FEE]: "Consultation Fee",
  [PAYMENT_TYPES.CASE_PROFESSIONAL_FEE]: "Case Professional Fee",
  [PAYMENT_TYPES.HEARING_APPEARANCE_FEE]: "Hearing Appearance Fee",
  [PAYMENT_TYPES.EXPENSE_REIMBURSEMENT]: "Expense Reimbursement",
  [PAYMENT_TYPES.FINAL_SETTLEMENT]: "Final Settlement",
  [PAYMENT_TYPES.OTHER]: "Other Fee / Payment",
};

export const CLIENT_PAYMENT_PAGE_LIMITS = [10, 20, 50, 100] as const;
export const CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT: ClientPaymentPageLimit = 10;
export type ClientPaymentPageLimit = (typeof CLIENT_PAYMENT_PAGE_LIMITS)[number];

export const CLIENT_PAYMENT_SORT_OPTIONS = {
  NEWEST_PAYMENT: "newest_payment",
  OLDEST_PAYMENT: "oldest_payment",
  AMOUNT_DESC: "amount_desc",
  AMOUNT_ASC: "amount_asc",
  NEWEST_CREATED: "newest_created",
} as const;

export const CLIENT_PAYMENT_SORT_OPTION_LIST = Object.values(CLIENT_PAYMENT_SORT_OPTIONS);
export type ClientPaymentSortOption =
  (typeof CLIENT_PAYMENT_SORT_OPTIONS)[keyof typeof CLIENT_PAYMENT_SORT_OPTIONS];

export const CLIENT_PAYMENT_QUERY_KEYS = {
  all: ["client-payments"] as const,
  byClient: (clientId: string) =>
    [...CLIENT_PAYMENT_QUERY_KEYS.all, "client", clientId] as const,
  list: (clientId: string, filters: Record<string, unknown> = {}) =>
    [...CLIENT_PAYMENT_QUERY_KEYS.byClient(clientId), "list", filters] as const,
  detail: (clientId: string, paymentId: string) =>
    [...CLIENT_PAYMENT_QUERY_KEYS.byClient(clientId), "detail", paymentId] as const,
};
