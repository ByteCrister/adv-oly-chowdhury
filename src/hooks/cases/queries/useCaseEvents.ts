"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import type {
  CaseEventFilterParams,
  CaseEventPaginationResponse,
} from "@/types/case-event.types";

/**
 * Fetch case-scoped chronological events from the backend API.
 */
export async function fetchCaseEvents(
  caseId: string,
  filters: CaseEventFilterParams = {}
): Promise<CaseEventPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.eventType && filters.eventType !== "ALL") {
    params.append("eventType", filters.eventType);
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
    ? `/api/v1/cases/${caseId}/events?${queryString}`
    : `/api/v1/cases/${caseId}/events`;

  const response = await axios.get<CaseEventPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching chronological events for a specific case.
 */
export function useCaseEvents(
  caseId: string,
  filters: CaseEventFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      CaseEventPaginationResponse,
      Error,
      CaseEventPaginationResponse,
      ReturnType<typeof CASE_QUERY_KEYS.events>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.events(caseId, filters as Record<string, unknown>),
    queryFn: () => fetchCaseEvents(caseId, filters),
    enabled: Boolean(caseId && /^[0-9a-fA-F]{24}$/.test(caseId)),
    ...options,
  });
}

export default useCaseEvents;
