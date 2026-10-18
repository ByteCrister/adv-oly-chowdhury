import { create } from "zustand";
import {
  HEARING_DEFAULT_PAGE_LIMIT,
  HEARING_SORT_OPTIONS,
  HearingPageLimit,
  HearingSortOption,
  HearingStatus,
} from "@/const/hearing.const";
import type { HearingFilterParams } from "@/types/hearing.types";

export interface HearingStoreState {
  // Search & Filter state
  search: string;
  status: HearingStatus | "ALL";
  courtId: string | "ALL";
  caseId: string;
  clientId: string;
  hearingType: string | "ALL";
  startDate: string | null;
  endDate: string | null;

  // Sorting & Pagination state
  sort: HearingSortOption;
  page: number;
  limit: HearingPageLimit;

  // Actions
  setSearch: (search: string) => void;
  setStatus: (status: HearingStatus | "ALL") => void;
  setCourtId: (courtId: string | "ALL") => void;
  setCaseId: (caseId: string) => void;
  setClientId: (clientId: string) => void;
  setHearingType: (hearingType: string | "ALL") => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setSort: (sort: HearingSortOption) => void;
  setPage: (page: number) => void;
  setLimit: (limit: HearingPageLimit) => void;

  // Resetters
  resetFilters: () => void;
  resetAll: () => void;

  // Formatter for TanStack Query
  getFilterParams: () => HearingFilterParams;
}

const initialFilterState = {
  search: "",
  status: "ALL" as const,
  courtId: "ALL" as const,
  caseId: "",
  clientId: "",
  hearingType: "ALL" as const,
  startDate: null as string | null,
  endDate: null as string | null,
};

const initialPaginationState = {
  sort: HEARING_SORT_OPTIONS.UPCOMING_FIRST as HearingSortOption,
  page: 1,
  limit: HEARING_DEFAULT_PAGE_LIMIT as HearingPageLimit,
};

export const useHearingStore = create<HearingStoreState>((set, get) => ({
  ...initialFilterState,
  ...initialPaginationState,

  setSearch: (search) =>
    set({
      search,
      page: 1,
    }),

  setStatus: (status) =>
    set({
      status,
      page: 1,
    }),

  setCourtId: (courtId) =>
    set({
      courtId,
      page: 1,
    }),

  setCaseId: (caseId) =>
    set({
      caseId,
      page: 1,
    }),

  setClientId: (clientId) =>
    set({
      clientId,
      page: 1,
    }),

  setHearingType: (hearingType) =>
    set({
      hearingType,
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
    const params: HearingFilterParams = {
      page: state.page,
      limit: state.limit,
      sort: state.sort,
    };

    if (state.search.trim()) {
      params.search = state.search.trim();
    }

    if (state.status !== "ALL") {
      params.status = state.status;
    }

    if (state.courtId !== "ALL" && state.courtId.trim()) {
      params.courtId = state.courtId;
    }

    if (state.caseId.trim()) {
      params.caseId = state.caseId.trim();
    }

    if (state.clientId.trim()) {
      params.clientId = state.clientId.trim();
    }

    if (state.hearingType !== "ALL" && state.hearingType.trim()) {
      params.hearingType = state.hearingType;
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

export default useHearingStore;
