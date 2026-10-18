"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import type {
  CaseFilterParams,
  CasePaginationResponse,
} from "@/types/case.types";

export const caseKeys = CASE_QUERY_KEYS;

/**
 * Fetch paginated list of cases and aggregate statistics from the backend API.
 */
export async function fetchCaseList(
  filters: CaseFilterParams = {}
): Promise<CasePaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.caseStatus && filters.caseStatus !== "ALL") {
    params.append("caseStatus", filters.caseStatus);
  }

  if (filters.caseType && filters.caseType !== "ALL") {
    params.append("caseType", filters.caseType);
  }

  if (filters.priority && filters.priority !== "ALL") {
    params.append("priority", filters.priority);
  }

  if (filters.courtId && filters.courtId !== "ALL") {
    params.append("courtId", filters.courtId);
  }

  if (filters.clientId && filters.clientId !== "ALL") {
    params.append("clientId", filters.clientId);
  }

  if (filters.filingYear) {
    params.append("filingYear", String(filters.filingYear));
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
  const url = queryString ? `/api/v1/cases?${queryString}` : "/api/v1/cases";

  const response = await axios.get<CasePaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching the case list and statistics.
 */
export function useCaseList(
  filters: CaseFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      CasePaginationResponse,
      Error,
      CasePaginationResponse,
      ReturnType<typeof caseKeys.list>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: caseKeys.list(filters as Record<string, unknown>),
    queryFn: () => fetchCaseList(filters),
    ...options,
  });
}

export default useCaseList;
