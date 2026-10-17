"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { FINANCIAL_QUERY_KEYS } from "@/const/financial.const";
import type {
  FinancialFilterParams,
  FinancialPaginationResponse,
} from "@/types/financial.types";

export const financialKeys = FINANCIAL_QUERY_KEYS;

/**
 * Fetch paginated unified ledger records combining Client Payments and Case Expenses.
 */
export async function fetchFinancialList(
  filters: FinancialFilterParams = {}
): Promise<FinancialPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.recordType && filters.recordType !== "ALL") {
    params.append("recordType", filters.recordType);
  }

  if (filters.clientId && filters.clientId !== "ALL") {
    params.append("clientId", filters.clientId);
  }

  if (filters.caseId && filters.caseId !== "ALL") {
    params.append("caseId", filters.caseId);
  }

  if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
    params.append("paymentMethod", filters.paymentMethod);
  }

  if (filters.expenseCategory && filters.expenseCategory !== "ALL") {
    params.append("expenseCategory", filters.expenseCategory);
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
  const url = queryString ? `/api/v1/financials?${queryString}` : `/api/v1/financials`;

  const response = await axios.get<FinancialPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching unified financial records.
 */
export function useFinancialList(
  filters: FinancialFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      FinancialPaginationResponse,
      Error,
      FinancialPaginationResponse,
      ReturnType<typeof financialKeys.list>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: financialKeys.list(filters as Record<string, unknown>),
    queryFn: () => fetchFinancialList(filters),
    ...options,
  });
}

export default useFinancialList;
