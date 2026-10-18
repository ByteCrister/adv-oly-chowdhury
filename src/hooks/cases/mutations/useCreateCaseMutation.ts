"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { DROPDOWN_QUERY_KEYS } from "@/const/dropdown.const";
import type { CreateCaseInput, CaseActionResponse } from "@/types/case.types";

/**
 * API call to create a new case.
 */
export async function createCase(
  payload: CreateCaseInput
): Promise<CaseActionResponse> {
  const response = await axios.post<CaseActionResponse>("/api/v1/cases", payload);
  return response.data;
}

/**
 * TanStack Query mutation hook for creating a case.
 * Automatically invalidates case query caches, client summaries, dashboard stats, and dropdowns upon success.
 */
export function useCreateCaseMutation(
  options?: UseMutationOptions<CaseActionResponse, Error, CreateCaseInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createCase,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DROPDOWN_QUERY_KEYS.ALL }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useCreateCaseMutation;
