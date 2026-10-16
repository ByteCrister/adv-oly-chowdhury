/**
 * Database Collections and Mongoose Model Names Registry.
 * Centralized constants for all MongoDB collections and models.
 * 
 * Note: 'user_settings' collection is intentionally excluded per design specifications.
 */

export const COLLECTIONS = {
  USERS: "users",
  CLIENTS: "clients",
  COURTS: "courts",
  CASES: "cases",
  CASE_PARTIES: "case_parties",
  HEARINGS: "hearings",
  CASE_EVENTS: "case_events",
  TASKS: "tasks",
  ASSETS: "assets",
  ASSET_REFERENCES: "asset_references",
  CASE_DOCUMENTS: "case_documents",
  CLIENT_DOCUMENTS: "client_documents",
  CASE_EXPENSES: "case_expenses",
  CLIENT_PAYMENTS: "client_payments",
  AUDIT_LOGS: "audit_logs",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export const MODELS = {
  USER: "User",
  CLIENT: "Client",
  COURT: "Court",
  CASE: "Case",
  CASE_PARTY: "CaseParty",
  HEARING: "Hearing",
  CASE_EVENT: "CaseEvent",
  TASK: "Task",
  ASSET: "Asset",
  ASSET_REFERENCE: "AssetReference",
  CASE_DOCUMENT: "CaseDocument",
  CLIENT_DOCUMENT: "ClientDocument",
  CASE_EXPENSE: "CaseExpense",
  CLIENT_PAYMENT: "ClientPayment",
  AUDIT_LOG: "AuditLog",
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];
