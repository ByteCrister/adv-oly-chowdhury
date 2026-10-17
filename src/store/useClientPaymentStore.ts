import { create } from "zustand";
import {
  CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT,
  CLIENT_PAYMENT_SORT_OPTIONS,
  ClientPaymentPageLimit,
  ClientPaymentSortOption,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import type { ClientPaymentFilterParams } from "@/types/client-payment.types";

export interface ClientPaymentStoreState {
  // Search & Filter state
  search: string;
  paymentMethod: PaymentMethod | "ALL";
  paymentType: PaymentType | "ALL";
  caseId: string | "ALL";
  startDate: string | null;
  endDate: string | null;

  // Sorting & Pagination state
  sort: ClientPaymentSortOption;
  page: number;
  limit: ClientPaymentPageLimit;

  // Actions
  setSearch: (search: string) => void;
  setPaymentMethod: (paymentMethod: PaymentMethod | "ALL") => void;
  setPaymentType: (paymentType: PaymentType | "ALL") => void;
  setCaseId: (caseId: string | "ALL") => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setSort: (sort: ClientPaymentSortOption) => void;
  setPage: (page: number) => void;
  setLimit: (limit: ClientPaymentPageLimit) => void;

  // Resetters
  resetFilters: () => void;
  resetAll: () => void;

  // Formatter for TanStack Query
  getFilterParams: () => ClientPaymentFilterParams;
}

const initialFilterState = {
  search: "",
  paymentMethod: "ALL" as const,
  paymentType: "ALL" as const,
  caseId: "ALL" as const,
  startDate: null as string | null,
  endDate: null as string | null,
};

const initialPaginationState = {
  sort: CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_PAYMENT as ClientPaymentSortOption,
  page: 1,
  limit: CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT as ClientPaymentPageLimit,
};

export const useClientPaymentStore = create<ClientPaymentStoreState>((set, get) => ({
  ...initialFilterState,
  ...initialPaginationState,

  setSearch: (search) =>
    set({
      search,
      page: 1,
    }),

  setPaymentMethod: (paymentMethod) =>
    set({
      paymentMethod,
      page: 1,
    }),

  setPaymentType: (paymentType) =>
    set({
      paymentType,
      page: 1,
    }),

  setCaseId: (caseId) =>
    set({
      caseId,
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
    const params: ClientPaymentFilterParams = {
      page: state.page,
      limit: state.limit,
      sort: state.sort,
    };

    if (state.search.trim()) {
      params.search = state.search.trim();
    }

    if (state.paymentMethod !== "ALL") {
      params.paymentMethod = state.paymentMethod;
    }

    if (state.paymentType !== "ALL") {
      params.paymentType = state.paymentType;
    }

    if (state.caseId !== "ALL") {
      params.caseId = state.caseId;
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

export default useClientPaymentStore;
