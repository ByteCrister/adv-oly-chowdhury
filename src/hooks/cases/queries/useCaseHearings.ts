"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import type {
  HearingFilterParams,
  HearingPaginationResponse,
} from "@/types/hearing.types";

/**
 * Fetch case-scoped hearings and live case-scoped hearing statistics.
 */
export async function fetchCaseHearings(
  caseId: string,
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
  const url = queryString
    ? `/api/v1/cases/${caseId}/hearings?${queryString}`
    : `/api/v1/cases/${caseId}/hearings`;

  const response = await axios.get<HearingPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for retrieving hearings and statistics belonging to a specific case.
 */
export function useCaseHearings(
  caseId: string,
  filters: HearingFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      HearingPaginationResponse,
      Error,
      HearingPaginationResponse,
      ReturnType<typeof CASE_QUERY_KEYS.hearings>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.hearings(caseId, filters as Record<string, unknown>),
    queryFn: () => fetchCaseHearings(caseId, filters),
    enabled: Boolean(caseId && /^[0-9a-fA-F]{24}$/.test(caseId)),
    ...options,
  });
}

export default useCaseHearings;
