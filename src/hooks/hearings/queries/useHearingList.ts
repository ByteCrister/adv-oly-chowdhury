"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { HEARING_QUERY_KEYS } from "@/const/hearing.const";
import type {
  HearingFilterParams,
  HearingPaginationResponse,
} from "@/types/hearing.types";

export const hearingKeys = HEARING_QUERY_KEYS;

/**
 * Fetch paginated list of hearings and aggregate statistics from the backend API.
 */
export async function fetchHearingList(
  filters: HearingFilterParams = {}
): Promise<HearingPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.status && filters.status !== "ALL") {
    params.append("status", filters.status);
  }

  if (filters.courtId && filters.courtId !== "ALL") {
    params.append("courtId", filters.courtId);
  }

  if (filters.caseId) {
    params.append("caseId", filters.caseId);
  }

  if (filters.clientId) {
    params.append("clientId", filters.clientId);
  }

  if (filters.hearingType && filters.hearingType !== "ALL") {
    params.append("hearingType", filters.hearingType);
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
  const url = queryString ? `/api/v1/hearings?${queryString}` : "/api/v1/hearings";

  const response = await axios.get<HearingPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching the hearings list and statistics.
 */
export function useHearingList(
  filters: HearingFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      HearingPaginationResponse,
      Error,
      HearingPaginationResponse,
      ReturnType<typeof hearingKeys.list>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: hearingKeys.list(filters as Record<string, unknown>),
    queryFn: () => fetchHearingList(filters),
    ...options,
  });
}

export default useHearingList;
