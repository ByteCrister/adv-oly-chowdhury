"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_DOCUMENT_QUERY_KEYS } from "@/const/client-document.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import type {
  CreateClientDocumentInput,
  ClientDocumentActionResponse,
} from "@/types/client-document.types";

export interface CreateClientDocumentVariables {
  clientId: string;
  data: CreateClientDocumentInput;
}

/**
 * API call to add a document record to a client.
 */
export async function createClientDocument({
  clientId,
  data,
}: CreateClientDocumentVariables): Promise<ClientDocumentActionResponse> {
  const response = await axios.post<ClientDocumentActionResponse>(
    `/api/v1/clients/${clientId}/documents`,
    data
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for creating a client document.
 * Automatically invalidates document list, client details, client lists, and global documents upon success.
 */
export function useCreateClientDocumentMutation(
  options?: UseMutationOptions<
    ClientDocumentActionResponse,
    Error,
    CreateClientDocumentVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createClientDocument,
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

export default useCreateClientDocumentMutation;
