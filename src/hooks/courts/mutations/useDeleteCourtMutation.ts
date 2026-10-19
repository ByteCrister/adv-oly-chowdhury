"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { COURT_QUERY_KEYS } from "@/const/court.const";
import { DROPDOWN_QUERY_KEYS } from "@/const/dropdown.const";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
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
 * Automatically invalidates court query caches and dropdowns upon success.
 */
export function useDeleteCourtMutation(
  options?: UseMutationOptions<CourtDeleteResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteCourt,
    onSuccess: async (data, id, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: COURT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DROPDOWN_QUERY_KEYS.ALL }),
        queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, id, context, mutation);
    },
  });
}

export default useDeleteCourtMutation;
