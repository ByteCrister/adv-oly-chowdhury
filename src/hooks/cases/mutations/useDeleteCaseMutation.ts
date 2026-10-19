"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { DROPDOWN_QUERY_KEYS } from "@/const/dropdown.const";
import { HEARING_QUERY_KEYS } from "@/const/hearing.const";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
import type { CaseDeleteResponse } from "@/types/case.types";

/**
 * API call to soft-delete (archive) a case.
 */
export async function deleteCase(id: string): Promise<CaseDeleteResponse> {
  const response = await axios.delete<CaseDeleteResponse>(`/api/v1/cases/${id}`);
  return response.data;
}

/**
 * TanStack Query mutation hook for soft-deleting a case.
 * Automatically invalidates case query caches, client summaries, dashboard stats, hearings, and dropdowns.
 */
export function useDeleteCaseMutation(
  options?: UseMutationOptions<CaseDeleteResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteCase,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: HEARING_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DROPDOWN_QUERY_KEYS.ALL }),
        queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useDeleteCaseMutation;
