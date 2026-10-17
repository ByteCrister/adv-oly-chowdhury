"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
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
 * Automatically invalidates client query caches upon success.
 */
export function useDeleteClientMutation(
  options?: UseMutationOptions<ClientDeleteResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteClient,
    onSuccess: async (data, variables, context, mutation) => {
      await queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all });
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useDeleteClientMutation;
