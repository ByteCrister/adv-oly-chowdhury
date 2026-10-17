"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_EXPENSE_QUERY_KEYS } from "@/const/case-expense.const";
import type {
  CaseExpenseFilterParams,
  CaseExpensePaginationResponse,
} from "@/types/case-expense.types";

export const caseExpenseKeys = CASE_EXPENSE_QUERY_KEYS;

/**
 * Fetch paginated list of case expenses.
 */
export async function fetchCaseExpenseList(
  filters: CaseExpenseFilterParams = {}
): Promise<CaseExpensePaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.caseId && filters.caseId !== "ALL") {
    params.append("caseId", filters.caseId);
  }

  if (filters.clientId && filters.clientId !== "ALL") {
    params.append("clientId", filters.clientId);
  }

  if (filters.category && filters.category !== "ALL") {
    params.append("category", filters.category);
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
  const url = queryString ? `/api/v1/case-expenses?${queryString}` : `/api/v1/case-expenses`;

  const response = await axios.get<CaseExpensePaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching case expenses.
 */
export function useCaseExpenseList(
  filters: CaseExpenseFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      CaseExpensePaginationResponse,
      Error,
      CaseExpensePaginationResponse,
      ReturnType<typeof caseExpenseKeys.list>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: caseExpenseKeys.list(filters as Record<string, unknown>),
    queryFn: () => fetchCaseExpenseList(filters),
    ...options,
  });
}

export default useCaseExpenseList;
