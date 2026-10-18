"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_DOCUMENT_QUERY_KEYS } from "@/const/client-document.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import type {
  UpdateClientDocumentInput,
  ClientDocumentActionResponse,
} from "@/types/client-document.types";

export interface UpdateClientDocumentVariables {
  clientId: string;
  docId: string;
  data: UpdateClientDocumentInput;
}

/**
 * API call to update metadata or replace a client document file.
 */
export async function updateClientDocument({
  clientId,
  docId,
  data,
}: UpdateClientDocumentVariables): Promise<ClientDocumentActionResponse> {
  const response = await axios.patch<ClientDocumentActionResponse>(
    `/api/v1/clients/${clientId}/documents/${docId}`,
    data
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for updating/replacing a client document.
 * Automatically invalidates document list, client details, and global documents upon success.
 */
export function useUpdateClientDocumentMutation(
  options?: UseMutationOptions<
    ClientDocumentActionResponse,
    Error,
    UpdateClientDocumentVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateClientDocument,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CLIENT_DOCUMENT_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.detail(variables.clientId),
        }),
        queryClient.invalidateQueries({
          queryKey: DOCUMENT_QUERY_KEYS.all,
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateClientDocumentMutation;
