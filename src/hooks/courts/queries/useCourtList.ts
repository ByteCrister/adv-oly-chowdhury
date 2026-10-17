"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { COURT_QUERY_KEYS } from "@/const/court.const";
import type { CourtFilterParams, CourtPaginationResponse } from "@/types/court.types";

export const courtKeys = COURT_QUERY_KEYS;

/**
 * Fetch paginated list of courts from backend API.
 */
export async function fetchCourtList(
  filters: CourtFilterParams = {}
): Promise<CourtPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.courtType && filters.courtType !== "ALL") {
    params.append("courtType", filters.courtType);
  }

  if (filters.district && filters.district !== "ALL") {
    params.append("district", filters.district);
  }

  if (filters.division && filters.division !== "ALL") {
    params.append("division", filters.division);
  }

  if (filters.isActive !== undefined && filters.isActive !== "ALL") {
    params.append("isActive", String(filters.isActive));
  }

  if (filters.startDate) {
    params.append("startDate", filters.startDate);
  }

  if (filters.endDate) {
    params.append("endDate", filters.endDate);
  }

  if (filters.sort) {
    params.append("sort", filters.sort);
  }

  if (filters.page) {
    params.append("page", String(filters.page));
  }

  if (filters.limit) {
    params.append("limit", String(filters.limit));
  }

  const queryString = params.toString();
  const url = queryString ? `/api/v1/courts?${queryString}` : "/api/v1/courts";

  const response = await axios.get<CourtPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching the court list.
 */
export function useCourtList(
  filters: CourtFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      CourtPaginationResponse,
      Error,
      CourtPaginationResponse,
      ReturnType<typeof courtKeys.list>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: courtKeys.list(filters as Record<string, unknown>),
    queryFn: () => fetchCourtList(filters),
    ...options,
  });
}

export default useCourtList;
