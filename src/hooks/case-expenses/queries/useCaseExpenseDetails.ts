"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_EXPENSE_QUERY_KEYS } from "@/const/case-expense.const";
import type { CaseExpenseItemDto } from "@/types/case-expense.types";


/**
 * Fetch details for an individual case expense.
 */
export async function fetchCaseExpenseDetails(id: string): Promise<CaseExpenseItemDto> {
  const response = await axios.get<{ success: boolean; data: CaseExpenseItemDto }>(
    `/api/v1/case-expenses/${id}`
  );
  return response.data.data;
}

/**
 * TanStack Query hook for fetching details of a single case expense.
 */
export function useCaseExpenseDetails(
  id: string,
  options?: Omit<
    UseQueryOptions<
      CaseExpenseItemDto,
      Error,
      CaseExpenseItemDto,
      ReturnType<typeof CASE_EXPENSE_QUERY_KEYS.detail>
    >,
    "queryKey" | "queryFn"
  >
) {
  const isValidId = Boolean(id && id !== "new" && id.length === 24);

  return useQuery({
    queryKey: CASE_EXPENSE_QUERY_KEYS.detail(id),
    queryFn: () => fetchCaseExpenseDetails(id),
    enabled: isValidId,
    ...options,
  });
}

export default useCaseExpenseDetails;
