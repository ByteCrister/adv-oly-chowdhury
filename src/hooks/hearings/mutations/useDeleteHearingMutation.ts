"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { HEARING_QUERY_KEYS } from "@/const/hearing.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
import type { HearingDeleteResponse } from "@/types/hearing.types";

/**
 * API call to delete a hearing record.
 */
export async function deleteHearing(id: string): Promise<HearingDeleteResponse> {
  const response = await axios.delete<HearingDeleteResponse>(`/api/v1/hearings/${id}`);
  return response.data;
}

/**
 * TanStack Query mutation hook for deleting a hearing.
 * Automatically invalidates hearing query caches, case hearings & next hearing dates, dashboard overview, and client summaries upon success.
 */
export function useDeleteHearingMutation(
  options?: UseMutationOptions<HearingDeleteResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteHearing,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: HEARING_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useDeleteHearingMutation;
