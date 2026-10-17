"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_EXPENSE_QUERY_KEYS } from "@/const/case-expense.const";
import { FINANCIAL_QUERY_KEYS } from "@/const/financial.const";
import type {
  CreateCaseExpenseInput,
  CaseExpenseActionResponse,
} from "@/types/case-expense.types";

/**
 * API call to create a case expense.
 */
export async function createCaseExpense(
  data: CreateCaseExpenseInput
): Promise<CaseExpenseActionResponse> {
  const response = await axios.post<CaseExpenseActionResponse>(
    `/api/v1/case-expenses`,
    data
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for recording a new case expense.
 * Automatically invalidates case expense lists, unified financials, and related aggregates.
 */
export function useCreateCaseExpenseMutation(
  options?: UseMutationOptions<
    CaseExpenseActionResponse,
    Error,
    CreateCaseExpenseInput
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createCaseExpense,
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

export default useCreateCaseExpenseMutation;
