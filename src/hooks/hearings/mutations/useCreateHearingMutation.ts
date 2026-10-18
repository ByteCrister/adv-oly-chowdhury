"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { HEARING_QUERY_KEYS } from "@/const/hearing.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import type { CreateHearingInput, HearingActionResponse } from "@/types/hearing.types";

/**
 * API call to create a new hearing.
 */
export async function createHearing(
  payload: CreateHearingInput
): Promise<HearingActionResponse> {
  const response = await axios.post<HearingActionResponse>("/api/v1/hearings", payload);
  return response.data;
}

/**
 * TanStack Query mutation hook for creating a hearing.
 * Automatically invalidates hearing query caches, case hearings & next hearing dates, dashboard overview, and client summaries upon success.
 */
export function useCreateHearingMutation(
  options?: UseMutationOptions<HearingActionResponse, Error, CreateHearingInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createHearing,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: HEARING_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useCreateHearingMutation;
