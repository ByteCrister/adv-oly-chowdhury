"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { DROPDOWN_QUERY_KEYS } from "@/const/dropdown.const";
import type { ClientDeleteResponse } from "@/types/client.types";

/**
 * API call to delete a client safely by ID.
 */
export async function deleteClient(id: string): Promise<ClientDeleteResponse> {
  const response = await axios.delete<ClientDeleteResponse>(`/api/v1/clients/${id}`);
  return response.data;
}

/**
 * TanStack Query mutation hook for deleting a client safely.
 * Automatically invalidates client query caches, cases, dashboard overview, and dropdowns upon success.
 */
export function useDeleteClientMutation(
  options?: UseMutationOptions<ClientDeleteResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteClient,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DROPDOWN_QUERY_KEYS.ALL }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useDeleteClientMutation;
