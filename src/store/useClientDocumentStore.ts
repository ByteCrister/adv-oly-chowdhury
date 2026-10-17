import { create } from "zustand";
import {
  CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT,
  CLIENT_DOCUMENT_SORT_OPTIONS,
  ClientDocumentPageLimit,
  ClientDocumentSortOption,
  ClientDocumentType,
} from "@/const/client-document.const";
import type { ClientDocumentFilterParams } from "@/types/client-document.types";

export interface ClientDocumentStoreState {
  // Search & Filter state
  search: string;
  documentType: ClientDocumentType | "ALL";
  startDate: string | null;
  endDate: string | null;

  // Sorting & Pagination state
  sort: ClientDocumentSortOption;
  page: number;
  limit: ClientDocumentPageLimit;

  // Actions
  setSearch: (search: string) => void;
  setDocumentType: (documentType: ClientDocumentType | "ALL") => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setSort: (sort: ClientDocumentSortOption) => void;
  setPage: (page: number) => void;
  setLimit: (limit: ClientDocumentPageLimit) => void;

  // Resetters
  resetFilters: () => void;
  resetAll: () => void;

  // Formatter for TanStack Query
  getFilterParams: () => ClientDocumentFilterParams;
}

const initialFilterState = {
  search: "",
  documentType: "ALL" as const,
  startDate: null as string | null,
  endDate: null as string | null,
};

const initialPaginationState = {
  sort: CLIENT_DOCUMENT_SORT_OPTIONS.NEWEST as ClientDocumentSortOption,
  page: 1,
  limit: CLIENT_DOCUMENT_DEFAULT_PAGE_LIMIT as ClientDocumentPageLimit,
};

export const useClientDocumentStore = create<ClientDocumentStoreState>((set, get) => ({
  ...initialFilterState,
  ...initialPaginationState,

  setSearch: (search) =>
    set({
      search,
      page: 1,
    }),

  setDocumentType: (documentType) =>
    set({
      documentType,
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
    const params: ClientDocumentFilterParams = {
      page: state.page,
      limit: state.limit,
      sort: state.sort,
    };

    if (state.search.trim()) {
      params.search = state.search.trim();
    }

    if (state.documentType !== "ALL") {
      params.documentType = state.documentType;
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

export default useClientDocumentStore;
