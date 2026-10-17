"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { COURT_QUERY_KEYS } from "@/const/court.const";
import type { CourtDeleteResponse } from "@/types/court.types";

/**
 * API call to hard delete a court by ID.
 * Returns error if the court has active associations with Cases, Hearings, or Files.
 */
export async function deleteCourt(id: string): Promise<CourtDeleteResponse> {
  const response = await axios.delete<CourtDeleteResponse>(`/api/v1/courts/${id}`);
  return response.data;
}

/**
 * TanStack Query mutation hook for hard deleting a court.
 * Automatically invalidates court query caches upon success.
 */
export function useDeleteCourtMutation(
  options?: UseMutationOptions<CourtDeleteResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteCourt,
    onSuccess: async (data, id, context, mutation) => {
      await queryClient.invalidateQueries({ queryKey: COURT_QUERY_KEYS.all });
      await options?.onSuccess?.(data, id, context, mutation);
    },
  });
}

export default useDeleteCourtMutation;
