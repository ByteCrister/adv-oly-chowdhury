import { create } from "zustand";
import {
  CASE_DEFAULT_PAGE_LIMIT,
  CASE_SORT_OPTIONS,
  CasePageLimit,
  CaseSortOption,
  CaseStatus,
  CaseType,
  CasePriority,
} from "@/const/case.const";
import type { CaseFilterParams } from "@/types/case.types";

export interface CaseStoreState {
  // Search & Filter state
  search: string;
  caseStatus: CaseStatus | "ALL";
  caseType: CaseType | "ALL";
  priority: CasePriority | "ALL";
  courtId: string | "ALL";
  clientId: string | "ALL";
  filingYear: string;
  startDate: string | null;
  endDate: string | null;

  // Sorting & Pagination state
  sort: CaseSortOption;
  page: number;
  limit: CasePageLimit;

  // Actions
  setSearch: (search: string) => void;
  setCaseStatus: (caseStatus: CaseStatus | "ALL") => void;
  setCaseType: (caseType: CaseType | "ALL") => void;
  setPriority: (priority: CasePriority | "ALL") => void;
  setCourtId: (courtId: string | "ALL") => void;
  setClientId: (clientId: string | "ALL") => void;
  setFilingYear: (filingYear: string) => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setSort: (sort: CaseSortOption) => void;
  setPage: (page: number) => void;
  setLimit: (limit: CasePageLimit) => void;

  // Resetters
  resetFilters: () => void;
  resetAll: () => void;

  // Formatter for TanStack Query
  getFilterParams: () => CaseFilterParams;
}

const initialFilterState = {
  search: "",
  caseStatus: "ALL" as const,
  caseType: "ALL" as const,
  priority: "ALL" as const,
  courtId: "ALL" as const,
  clientId: "ALL" as const,
  filingYear: "",
  startDate: null as string | null,
  endDate: null as string | null,
};

const initialPaginationState = {
  sort: CASE_SORT_OPTIONS.NEWEST as CaseSortOption,
  page: 1,
  limit: CASE_DEFAULT_PAGE_LIMIT as CasePageLimit,
};

export const useCaseStore = create<CaseStoreState>((set, get) => ({
  ...initialFilterState,
  ...initialPaginationState,

  setSearch: (search) =>
    set({
      search,
      page: 1,
    }),

  setCaseStatus: (caseStatus) =>
    set({
      caseStatus,
      page: 1,
    }),

  setCaseType: (caseType) =>
    set({
      caseType,
      page: 1,
    }),

  setPriority: (priority) =>
    set({
      priority,
      page: 1,
    }),

  setCourtId: (courtId) =>
    set({
      courtId,
      page: 1,
    }),

  setClientId: (clientId) =>
    set({
      clientId,
      page: 1,
    }),

  setFilingYear: (filingYear) =>
    set({
      filingYear,
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
    const params: CaseFilterParams = {
      page: state.page,
      limit: state.limit,
      sort: state.sort,
    };

    if (state.search.trim()) {
      params.search = state.search.trim();
    }

    if (state.caseStatus !== "ALL") {
      params.caseStatus = state.caseStatus;
    }

    if (state.caseType !== "ALL") {
      params.caseType = state.caseType;
    }

    if (state.priority !== "ALL") {
      params.priority = state.priority;
    }

    if (state.courtId !== "ALL" && state.courtId.trim()) {
      params.courtId = state.courtId.trim();
    }

    if (state.clientId !== "ALL" && state.clientId.trim()) {
      params.clientId = state.clientId.trim();
    }

    if (state.filingYear.trim()) {
      params.filingYear = state.filingYear.trim();
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

export default useCaseStore;
