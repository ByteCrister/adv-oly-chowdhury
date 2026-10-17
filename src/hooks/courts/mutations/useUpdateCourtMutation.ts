"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { COURT_QUERY_KEYS } from "@/const/court.const";
import type { UpdateCourtInput, CourtActionResponse } from "@/types/court.types";

export interface UpdateCourtVariables {
  id: string;
  data: UpdateCourtInput;
}

/**
 * API call to update an existing court by ID.
 */
export async function updateCourt({
  id,
  data,
}: UpdateCourtVariables): Promise<CourtActionResponse> {
  const response = await axios.patch<CourtActionResponse>(`/api/v1/courts/${id}`, data);
  return response.data;
}

/**
 * TanStack Query mutation hook for updating a court.
 * Automatically invalidates court query caches upon success.
 */
export function useUpdateCourtMutation(
  options?: UseMutationOptions<CourtActionResponse, Error, UpdateCourtVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateCourt,
    onSuccess: async (data, variables, context, mutation) => {
      await queryClient.invalidateQueries({ queryKey: COURT_QUERY_KEYS.all });
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateCourtMutation;
