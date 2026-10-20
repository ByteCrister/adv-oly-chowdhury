import {
  CaseExpenseCategory,
  CaseExpensePageLimit,
  CaseExpenseSortOption,
} from "@/const/case-expense.const";
import { AssetType } from "@/const/asset.const";

/**
 * Full Case Expense Data Transfer Object including case and client context.
 */
export interface CaseExpenseItemDto {
  id: string; // CaseExpense._id
  caseId: string;
  caseReference: string | null;
  caseTitle: string | null;
  clientId: string | null;
  clientName: string | null;
  clientNumber: string | null;
  expenseDate: string; // ISO date string
  category: CaseExpenseCategory;
  categoryLabel: string;
  description: string | null;
  amount: number;
  currency: string;
  receiptAssetReferenceId: string | null;
  receiptAssetreferenceId?: string | null; // camelCase / lowercase alias
  receiptUrl: string | null;
  receiptFileName: string | null;
  receiptAssetType?: AssetType | null;
  receiptMimeType?: string | null;
  receiptSizeBytes?: number | null;
  recordedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Financial summary stats for case expenses.
 */
export interface CaseExpenseSummaryStats {
  totalCount: number;
  totalAmount: number;
  categoryBreakdown: Partial<Record<CaseExpenseCategory, number>>;
}

/**
 * Filter parameters for case expense queries.
 */
export interface CaseExpenseFilterParams {
  search?: string;
  caseId?: string | "ALL";
  clientId?: string | "ALL";
  category?: CaseExpenseCategory | "ALL";
  startDate?: string | null;
  endDate?: string | null;
  sort?: CaseExpenseSortOption;
  page?: number;
  limit?: CaseExpensePageLimit;
}

/**
 * Paginated case expenses response.
 */
export interface CaseExpensePaginationResponse {
  items: CaseExpenseItemDto[];
  summary: CaseExpenseSummaryStats;
  total: number;
  page: number;
  limit: CaseExpensePageLimit;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Input payload to create a new case expense.
 */
export interface CreateCaseExpenseInput {
  caseId: string;
  expenseDate: string;
  category: CaseExpenseCategory;
  description?: string | null;
  amount: number;
  currency?: string;
  receiptAssetReferenceId?: string | null;
  receiptAssetreferenceId?: string | null;
}

/**
 * Input payload to update an existing case expense.
 */
export type UpdateCaseExpenseInput = Partial<CreateCaseExpenseInput>;

/**
 * Action response for case expense create and update mutations.
 */
export interface CaseExpenseActionResponse {
  success: boolean;
  message: string;
  data: CaseExpenseItemDto;
}

/**
 * Action response for case expense deletion.
 */
export interface CaseExpenseDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}

/**
 * Raw input types representing populated or aggregated case reference data.
 */
export interface RawCaseExpenseCaseInput {
  _id?: unknown;
  internalReference?: string | null;
  caseNumber?: string | null;
  title?: string | null;
  clientId?: unknown;
}

export interface RawCaseExpenseClientInput {
  _id?: unknown;
  name?: string | null;
  clientNumber?: string | null;
}

export interface RawCaseExpenseReceiptInput {
  _id?: unknown;
  originalFileName?: string | null;
  assetId?: {
    _id?: unknown;
    secureUrl?: string | null;
    originalFilename?: string | null;
    assetType?: AssetType | string | null;
    mimeType?: string | null;
    bytes?: number | null;
  } | null;
}

export interface RawCaseExpenseUserInput {
  _id?: unknown;
  name?: string | null;
  email?: string | null;
}

/**
 * Flexible input type for formatCaseExpenseItem accepting populated Mongoose documents,
 * lean query results, or aggregation lookup outputs.
 */
export interface CaseExpenseDocInput {
  _id?: unknown;
  id?: string;
  caseId?: unknown;
  caseDetails?: RawCaseExpenseCaseInput | null;
  clientDetails?: RawCaseExpenseClientInput | null;
  expenseDate?: Date | string | null;
  category?: CaseExpenseCategory | string | null;
  description?: string | null;
  amount?: number | null;
  currency?: string | null;
  receiptAssetReferenceId?: unknown;
  receiptDetails?: RawCaseExpenseReceiptInput | null;
  recordedBy?: unknown;
  userDetails?: RawCaseExpenseUserInput | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

/**
 * Result shape returned by the single $facet aggregation pipeline.
 */
export interface CaseExpenseAggregateResult {
  items: CaseExpenseDocInput[];
  summaryStats: Array<{
    _id: null;
    totalCount: number;
    totalAmount: number;
  }>;
  categoryBreakdown: Array<{
    _id: CaseExpenseCategory;
    amount: number;
  }>;
}
