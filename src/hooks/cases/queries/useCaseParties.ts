"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import type {
  CasePartyFilterParams,
  CasePartyPaginationResponse,
} from "@/types/case-party.types";

/**
 * Fetch case-scoped parties list from the backend API.
 */
export async function fetchCaseParties(
  caseId: string,
  filters: CasePartyFilterParams = {}
): Promise<CasePartyPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.role && filters.role !== "ALL") {
    params.append("role", filters.role);
  }

  if (filters.partyType && filters.partyType !== "ALL") {
    params.append("partyType", filters.partyType);
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
    ? `/api/v1/cases/${caseId}/parties?${queryString}`
    : `/api/v1/cases/${caseId}/parties`;

  const response = await axios.get<CasePartyPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching parties involved in a legal case.
 */
export function useCaseParties(
  caseId: string,
  filters: CasePartyFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      CasePartyPaginationResponse,
      Error,
      CasePartyPaginationResponse,
      ReturnType<typeof CASE_QUERY_KEYS.parties>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.parties(caseId, filters as Record<string, unknown>),
    queryFn: () => fetchCaseParties(caseId, filters),
    enabled: Boolean(caseId && /^[0-9a-fA-F]{24}$/.test(caseId)),
    ...options,
  });
}

export default useCaseParties;
