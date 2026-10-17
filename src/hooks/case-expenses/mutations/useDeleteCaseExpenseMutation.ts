"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_EXPENSE_QUERY_KEYS } from "@/const/case-expense.const";
import { FINANCIAL_QUERY_KEYS } from "@/const/financial.const";
import type { CaseExpenseDeleteResponse } from "@/types/case-expense.types";

/**
 * API call to delete a case expense.
 */
export async function deleteCaseExpense(id: string): Promise<CaseExpenseDeleteResponse> {
  const response = await axios.delete<CaseExpenseDeleteResponse>(
    `/api/v1/case-expenses/${id}`
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for deleting a case expense.
 * Automatically invalidates case expense caches and unified financials.
 */
export function useDeleteCaseExpenseMutation(
  options?: UseMutationOptions<
    CaseExpenseDeleteResponse,
    Error,
    string
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteCaseExpense,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CASE_EXPENSE_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: FINANCIAL_QUERY_KEYS.all,
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useDeleteCaseExpenseMutation;
