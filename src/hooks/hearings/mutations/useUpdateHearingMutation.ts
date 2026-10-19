"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { HEARING_QUERY_KEYS } from "@/const/hearing.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
import type { UpdateHearingInput, HearingActionResponse } from "@/types/hearing.types";

export interface UpdateHearingParams {
  id: string;
  payload: UpdateHearingInput;
}

/**
 * API call to update an existing hearing.
 */
export async function updateHearing({
  id,
  payload,
}: UpdateHearingParams): Promise<HearingActionResponse> {
  const response = await axios.patch<HearingActionResponse>(`/api/v1/hearings/${id}`, payload);
  return response.data;
}

/**
 * TanStack Query mutation hook for updating a hearing.
 * Automatically invalidates hearing query caches, specific hearing detail, case hearings & next hearing dates, dashboard overview, and client summaries upon success.
 */
export function useUpdateHearingMutation(
  options?: UseMutationOptions<HearingActionResponse, Error, UpdateHearingParams>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateHearing,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: HEARING_QUERY_KEYS.all }),
        queryClient.invalidateQueries({
          queryKey: HEARING_QUERY_KEYS.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateHearingMutation;
