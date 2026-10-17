import {
  CaseExpenseCategory,
  CaseExpensePageLimit,
  CaseExpenseSortOption,
} from "@/const/case-expense.const";

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
  receiptUrl: string | null;
  receiptFileName: string | null;
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
