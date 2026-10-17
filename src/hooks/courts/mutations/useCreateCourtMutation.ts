"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { COURT_QUERY_KEYS } from "@/const/court.const";
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
 * Automatically invalidates court query caches upon success.
 */
export function useCreateCourtMutation(
  options?: UseMutationOptions<CourtActionResponse, Error, CreateCourtInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createCourt,
    onSuccess: async (data, variables, context, mutation) => {
      await queryClient.invalidateQueries({ queryKey: COURT_QUERY_KEYS.all });
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useCreateCourtMutation;
