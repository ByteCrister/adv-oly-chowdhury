import { create } from "zustand";
import {
  COURT_DEFAULT_PAGE_LIMIT,
  COURT_SORT_OPTIONS,
  CourtPageLimit,
  CourtSortOption,
  CourtType,
} from "@/const/court.const";
import type { CourtFilterParams } from "@/types/court.types";

export interface CourtStoreState {
  // Search & Filter state
  search: string;
  courtType: CourtType | "ALL";
  district: string | "ALL";
  division: string | "ALL";
  isActive: boolean | "ALL";
  startDate: string | null;
  endDate: string | null;

  // Sorting & Pagination state
  sort: CourtSortOption;
  page: number;
  limit: CourtPageLimit;

  // Actions
  setSearch: (search: string) => void;
  setCourtType: (courtType: CourtType | "ALL") => void;
  setDistrict: (district: string | "ALL") => void;
  setDivision: (division: string | "ALL") => void;
  setIsActive: (isActive: boolean | "ALL") => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setSort: (sort: CourtSortOption) => void;
  setPage: (page: number) => void;
  setLimit: (limit: CourtPageLimit) => void;

  // Resetters
  resetFilters: () => void;
  resetAll: () => void;

  // Formatter for TanStack Query
  getFilterParams: () => CourtFilterParams;
}

const initialFilterState = {
  search: "",
  courtType: "ALL" as const,
  district: "ALL" as const,
  division: "ALL" as const,
  isActive: "ALL" as const,
  startDate: null as string | null,
  endDate: null as string | null,
};

const initialPaginationState = {
  sort: COURT_SORT_OPTIONS.NEWEST as CourtSortOption,
  page: 1,
  limit: COURT_DEFAULT_PAGE_LIMIT as CourtPageLimit,
};

export const useCourtStore = create<CourtStoreState>((set, get) => ({
  ...initialFilterState,
  ...initialPaginationState,

  setSearch: (search) =>
    set({
      search,
      page: 1, // Reset page on search change
    }),

  setCourtType: (courtType) =>
    set({
      courtType,
      page: 1, // Reset page on filter change
    }),

  setDistrict: (district) =>
    set({
      district,
      page: 1,
    }),

  setDivision: (division) =>
    set({
      division,
      page: 1,
    }),

  setIsActive: (isActive) =>
    set({
      isActive,
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
      page: 1, // Reset page when limit changes
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
    const params: CourtFilterParams = {
      page: state.page,
      limit: state.limit,
      sort: state.sort,
    };

    if (state.search.trim()) {
      params.search = state.search.trim();
    }

    if (state.courtType !== "ALL") {
      params.courtType = state.courtType;
    }

    if (state.district !== "ALL") {
      params.district = state.district;
    }

    if (state.division !== "ALL") {
      params.division = state.division;
    }

    if (state.isActive !== "ALL") {
      params.isActive = state.isActive;
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

export default useCourtStore;
