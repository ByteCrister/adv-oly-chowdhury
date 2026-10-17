"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_EXPENSE_QUERY_KEYS } from "@/const/case-expense.const";
import { FINANCIAL_QUERY_KEYS } from "@/const/financial.const";
import type {
  UpdateCaseExpenseInput,
  CaseExpenseActionResponse,
} from "@/types/case-expense.types";

export interface UpdateCaseExpenseVariables {
  id: string;
  data: UpdateCaseExpenseInput;
}

/**
 * API call to update a case expense.
 */
export async function updateCaseExpense({
  id,
  data,
}: UpdateCaseExpenseVariables): Promise<CaseExpenseActionResponse> {
  const response = await axios.put<CaseExpenseActionResponse>(
    `/api/v1/case-expenses/${id}`,
    data
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for updating an existing case expense.
 * Automatically invalidates case expense details, case expense lists, and unified financials.
 */
export function useUpdateCaseExpenseMutation(
  options?: UseMutationOptions<
    CaseExpenseActionResponse,
    Error,
    UpdateCaseExpenseVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateCaseExpense,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CASE_EXPENSE_QUERY_KEYS.detail(variables.id),
        }),
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

export default useUpdateCaseExpenseMutation;
