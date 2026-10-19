"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { DROPDOWN_QUERY_KEYS } from "@/const/dropdown.const";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
import type { UpdateCaseInput, CaseActionResponse } from "@/types/case.types";

interface UpdateCaseVariables {
  id: string;
  payload: UpdateCaseInput;
}

/**
 * API call to update an existing case.
 */
export async function updateCase({
  id,
  payload,
}: UpdateCaseVariables): Promise<CaseActionResponse> {
  const response = await axios.patch<CaseActionResponse>(`/api/v1/cases/${id}`, payload);
  return response.data;
}

/**
 * TanStack Query mutation hook for updating a case.
 * Automatically invalidates case query caches, specific case detail, client summaries, dashboard stats, and dropdowns.
 */
export function useUpdateCaseMutation(
  options?: UseMutationOptions<CaseActionResponse, Error, UpdateCaseVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateCase,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DROPDOWN_QUERY_KEYS.ALL }),
        queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateCaseMutation;
