import {
  FinancialRecordType,
  FinancialPageLimit,
  FinancialSortOption,
} from "@/const/financial.const";
import { PaymentMethod, PaymentType } from "@/const/client-payment.const";
import { CaseExpenseCategory } from "@/const/case-expense.const";

/**
 * Unified Financial Record DTO representing either a Client Payment (Income)
 * or a Case Expense (Disbursement/Expense) in a consolidated ledger.
 */
export interface UnifiedFinancialRecordDto {
  id: string; // Mongo _id
  recordType: "PAYMENT" | "EXPENSE";
  transactionDate: string; // ISO date string
  amount: number;
  currency: string;
  clientId: string | null;
  clientName: string | null;
  clientNumber: string | null;
  caseId: string | null;
  caseTitle: string | null;
  caseReference: string | null;
  paymentMethod: PaymentMethod | null;
  paymentMethodLabel: string | null;
  paymentType: PaymentType | null;
  paymentTypeLabel: string | null;
  expenseCategory: CaseExpenseCategory | null;
  expenseCategoryLabel: string | null;
  referenceNumber: string | null;
  moneyReceiptNumber: string | null;
  description: string | null;
  receiptAssetId: string | null;
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
 * Comprehensive financial statistics calculated across ledger records.
 */
export interface FinancialSummaryStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  paymentCount: number;
  expenseCount: number;
  totalCount: number;
  methodBreakdown: Partial<Record<PaymentMethod, number>>;
  categoryBreakdown: Partial<Record<CaseExpenseCategory, number>>;
}

/**
 * Filter parameters for unified financial ledger query.
 */
export interface FinancialFilterParams {
  search?: string;
  recordType?: FinancialRecordType;
  clientId?: string | "ALL";
  caseId?: string | "ALL";
  paymentMethod?: PaymentMethod | "ALL";
  expenseCategory?: CaseExpenseCategory | "ALL";
  startDate?: string | null;
  endDate?: string | null;
  sort?: FinancialSortOption;
  page?: number;
  limit?: FinancialPageLimit;
}

/**
 * Paginated response for unified financial ledger.
 */
export interface FinancialPaginationResponse {
  items: UnifiedFinancialRecordDto[];
  summary: FinancialSummaryStats;
  total: number;
  page: number;
  limit: FinancialPageLimit;
  totalPages: number;
  hasMore: boolean;
}
