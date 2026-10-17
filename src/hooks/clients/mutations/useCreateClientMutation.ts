"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import type { CreateClientInput, ClientActionResponse } from "@/types/client.types";

/**
 * API call to create a new client.
 */
export async function createClient(
  payload: CreateClientInput
): Promise<ClientActionResponse> {
  const response = await axios.post<ClientActionResponse>("/api/v1/clients", payload);
  return response.data;
}

/**
 * TanStack Query mutation hook for creating a client.
 * Automatically invalidates client query caches upon success.
 */
export function useCreateClientMutation(
  options?: UseMutationOptions<ClientActionResponse, Error, CreateClientInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createClient,
    onSuccess: async (data, variables, context, mutation) => {
      await queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all });
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useCreateClientMutation;
