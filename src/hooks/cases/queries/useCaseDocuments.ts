"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import type {
  CaseDocumentFilterParams,
  CaseDocumentPaginationResponse,
} from "@/types/case-document.types";

/**
 * Fetch case-scoped documents list from the backend API.
 */
export async function fetchCaseDocuments(
  caseId: string,
  filters: CaseDocumentFilterParams = {}
): Promise<CaseDocumentPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.documentType && filters.documentType !== "ALL") {
    params.append("documentType", filters.documentType);
  }

  if (filters.isConfidential !== undefined) {
    params.append("isConfidential", String(filters.isConfidential));
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
    ? `/api/v1/cases/${caseId}/documents?${queryString}`
    : `/api/v1/cases/${caseId}/documents`;

  const response = await axios.get<CaseDocumentPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching documents belonging to a legal case.
 */
export function useCaseDocuments(
  caseId: string,
  filters: CaseDocumentFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      CaseDocumentPaginationResponse,
      Error,
      CaseDocumentPaginationResponse,
      ReturnType<typeof CASE_QUERY_KEYS.documents>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.documents(caseId, filters as Record<string, unknown>),
    queryFn: () => fetchCaseDocuments(caseId, filters),
    enabled: Boolean(caseId && /^[0-9a-fA-F]{24}$/.test(caseId)),
    ...options,
  });
}

export default useCaseDocuments;
