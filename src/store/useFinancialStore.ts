import { create } from "zustand";
import {
  FINANCIAL_DEFAULT_PAGE_LIMIT,
  FINANCIAL_RECORD_TYPES,
  FINANCIAL_SORT_OPTIONS,
  FinancialPageLimit,
  FinancialRecordType,
  FinancialSortOption,
} from "@/const/financial.const";
import type { PaymentMethod } from "@/const/client-payment.const";
import type { CaseExpenseCategory } from "@/const/case-expense.const";
import type { FinancialFilterParams } from "@/types/financial.types";

export interface FinancialStoreState {
  // Search & Filter state
  search: string;
  recordType: FinancialRecordType;
  clientId: string | "ALL";
  caseId: string | "ALL";
  paymentMethod: PaymentMethod | "ALL";
  expenseCategory: CaseExpenseCategory | "ALL";
  startDate: string | null;
  endDate: string | null;

  // Sorting & Pagination state
  sort: FinancialSortOption;
  page: number;
  limit: FinancialPageLimit;

  // Actions
  setSearch: (search: string) => void;
  setRecordType: (recordType: FinancialRecordType) => void;
  setClientId: (clientId: string | "ALL") => void;
  setCaseId: (caseId: string | "ALL") => void;
  setPaymentMethod: (paymentMethod: PaymentMethod | "ALL") => void;
  setExpenseCategory: (expenseCategory: CaseExpenseCategory | "ALL") => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setSort: (sort: FinancialSortOption) => void;
  setPage: (page: number) => void;
  setLimit: (limit: FinancialPageLimit) => void;

  // Resetters
  resetFilters: () => void;
  resetAll: () => void;

  // Formatter for TanStack Query
  getFilterParams: () => FinancialFilterParams;
}

const initialFilterState = {
  search: "",
  recordType: FINANCIAL_RECORD_TYPES.ALL as FinancialRecordType,
  clientId: "ALL" as const,
  caseId: "ALL" as const,
  paymentMethod: "ALL" as const,
  expenseCategory: "ALL" as const,
  startDate: null as string | null,
  endDate: null as string | null,
};

const initialPaginationState = {
  sort: FINANCIAL_SORT_OPTIONS.NEWEST_DATE as FinancialSortOption,
  page: 1,
  limit: FINANCIAL_DEFAULT_PAGE_LIMIT as FinancialPageLimit,
};

export const useFinancialStore = create<FinancialStoreState>((set, get) => ({
  ...initialFilterState,
  ...initialPaginationState,

  setSearch: (search) =>
    set({
      search,
      page: 1,
    }),

  setRecordType: (recordType) =>
    set({
      recordType,
      page: 1,
    }),

  setClientId: (clientId) =>
    set({
      clientId,
      // Reset caseId if client changed, unless case belongs to this client
      caseId: "ALL",
      page: 1,
    }),

  setCaseId: (caseId) =>
    set({
      caseId,
      page: 1,
    }),

  setPaymentMethod: (paymentMethod) =>
    set({
      paymentMethod,
      page: 1,
    }),

  setExpenseCategory: (expenseCategory) =>
    set({
      expenseCategory,
      page: 1,
    }),

  setDateRange: (startDate, endDate) =>
    set({
      startDate,
      endDate,
      page: 1,
    }),

  setSort: (sort) =>
    set({
      sort,
      page: 1,
    }),

  setPage: (page) =>
    set({
      page: Math.max(1, page),
    }),

  setLimit: (limit) =>
    set({
      limit,
      page: 1,
    }),

  resetFilters: () =>
    set({
      ...initialFilterState,
      page: 1,
    }),

  resetAll: () =>
    set({
      ...initialFilterState,
      ...initialPaginationState,
    }),

  getFilterParams: () => {
    const state = get();
    const params: FinancialFilterParams = {
      page: state.page,
      limit: state.limit,
      sort: state.sort,
    };

    if (state.search.trim()) {
      params.search = state.search.trim();
    }

    if (state.recordType !== "ALL") {
      params.recordType = state.recordType;
    }

    if (state.clientId !== "ALL") {
      params.clientId = state.clientId;
    }

    if (state.caseId !== "ALL") {
      params.caseId = state.caseId;
    }

    if (state.paymentMethod !== "ALL") {
      params.paymentMethod = state.paymentMethod;
    }

    if (state.expenseCategory !== "ALL") {
      params.expenseCategory = state.expenseCategory;
    }

    if (state.startDate) {
      params.startDate = state.startDate;
    }

    if (state.endDate) {
      params.endDate = state.endDate;
    }

    return params;
  },
}));

export default useFinancialStore;
