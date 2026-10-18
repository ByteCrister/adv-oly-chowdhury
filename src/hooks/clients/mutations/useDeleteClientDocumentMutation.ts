"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_DOCUMENT_QUERY_KEYS } from "@/const/client-document.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import type { ClientDocumentDeleteResponse } from "@/types/client-document.types";

export interface DeleteClientDocumentVariables {
  clientId: string;
  docId: string;
}

/**
 * API call to delete a client document safely.
 */
export async function deleteClientDocument({
  clientId,
  docId,
}: DeleteClientDocumentVariables): Promise<ClientDocumentDeleteResponse> {
  const response = await axios.delete<ClientDocumentDeleteResponse>(
    `/api/v1/clients/${clientId}/documents/${docId}`
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for deleting a client document.
 * Automatically invalidates document list, client details, client lists, and global documents upon success.
 */
export function useDeleteClientDocumentMutation(
  options?: UseMutationOptions<
    ClientDocumentDeleteResponse,
    Error,
    DeleteClientDocumentVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteClientDocument,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CLIENT_DOCUMENT_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.detail(variables.clientId),
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: DOCUMENT_QUERY_KEYS.all,
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useDeleteClientDocumentMutation;
