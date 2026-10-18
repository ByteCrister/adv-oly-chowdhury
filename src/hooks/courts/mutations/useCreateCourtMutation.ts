"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { COURT_QUERY_KEYS } from "@/const/court.const";
import { DROPDOWN_QUERY_KEYS } from "@/const/dropdown.const";
import type { CreateCourtInput, CourtActionResponse } from "@/types/court.types";

/**
 * API call to create a new court.
 */
export async function createCourt(payload: CreateCourtInput): Promise<CourtActionResponse> {
  const response = await axios.post<CourtActionResponse>("/api/v1/courts", payload);
  return response.data;
}

/**
 * TanStack Query mutation hook for creating a court.
 * Automatically invalidates court query caches and dropdowns upon success.
 */
export function useCreateCourtMutation(
  options?: UseMutationOptions<CourtActionResponse, Error, CreateCourtInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createCourt,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: COURT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DROPDOWN_QUERY_KEYS.ALL }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useCreateCourtMutation;
