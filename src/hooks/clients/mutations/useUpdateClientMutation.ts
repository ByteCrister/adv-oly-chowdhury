"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { TASK_QUERY_KEYS } from "@/const/task.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { DROPDOWN_QUERY_KEYS } from "@/const/dropdown.const";
import type { UpdateClientInput, ClientActionResponse } from "@/types/client.types";

export interface UpdateClientVariables {
  id: string;
  data: UpdateClientInput;
}

/**
 * API call to update an existing client by ID.
 */
export async function updateClient({
  id,
  data,
}: UpdateClientVariables): Promise<ClientActionResponse> {
  const response = await axios.patch<ClientActionResponse>(`/api/v1/clients/${id}`, data);
  return response.data;
}

/**
 * TanStack Query mutation hook for updating a client.
 * Automatically invalidates client query caches, client detail, case and task relationships, dashboard overview, and dropdowns upon success.
 */
export function useUpdateClientMutation(
  options?: UseMutationOptions<ClientActionResponse, Error, UpdateClientVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateClient,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DROPDOWN_QUERY_KEYS.ALL }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateClientMutation;
