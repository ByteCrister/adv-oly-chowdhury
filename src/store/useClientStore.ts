import { create } from "zustand";
import {
  CLIENT_DEFAULT_PAGE_LIMIT,
  CLIENT_SORT_OPTIONS,
  ClientPageLimit,
  ClientSortOption,
  ClientType,
  ClientStatus,
} from "@/const/client.const";
import type { ClientFilterParams } from "@/types/client.types";

export interface ClientStoreState {
  // Search & Filter state
  search: string;
  clientType: ClientType | "ALL";
  status: ClientStatus | "ALL";
  startDate: string | null;
  endDate: string | null;

  // Sorting & Pagination state
  sort: ClientSortOption;
  page: number;
  limit: ClientPageLimit;

  // Actions
  setSearch: (search: string) => void;
  setClientType: (clientType: ClientType | "ALL") => void;
  setStatus: (status: ClientStatus | "ALL") => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setSort: (sort: ClientSortOption) => void;
  setPage: (page: number) => void;
  setLimit: (limit: ClientPageLimit) => void;

  // Resetters
  resetFilters: () => void;
  resetAll: () => void;

  // Formatter for TanStack Query
  getFilterParams: () => ClientFilterParams;
}

const initialFilterState = {
  search: "",
  clientType: "ALL" as const,
  status: "ALL" as const,
  startDate: null as string | null,
  endDate: null as string | null,
};

const initialPaginationState = {
  sort: CLIENT_SORT_OPTIONS.NEWEST as ClientSortOption,
  page: 1,
  limit: CLIENT_DEFAULT_PAGE_LIMIT as ClientPageLimit,
};

export const useClientStore = create<ClientStoreState>((set, get) => ({
  ...initialFilterState,
  ...initialPaginationState,

  setSearch: (search) =>
    set({
      search,
      page: 1, // Reset page on search change
    }),

  setClientType: (clientType) =>
    set({
      clientType,
      page: 1, // Reset page on filter change
    }),

  setStatus: (status) =>
    set({
      status,
      page: 1, // Reset page on filter change
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
    const params: ClientFilterParams = {
      page: state.page,
      limit: state.limit,
      sort: state.sort,
    };

    if (state.search.trim()) {
      params.search = state.search.trim();
    }

    if (state.clientType !== "ALL") {
      params.clientType = state.clientType;
    }

    if (state.status !== "ALL") {
      params.status = state.status;
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

export default useClientStore;
