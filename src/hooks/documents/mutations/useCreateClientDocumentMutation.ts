"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { DOCUMENT_ENTITY_TYPES, DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import { CLIENT_DOCUMENT_QUERY_KEYS } from "@/const/client-document.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import type {
  CreateUnifiedClientDocInput,
  DocumentActionResponse,
} from "@/types/document.types";

export interface CreateUnifiedClientDocumentVariables {
  data: CreateUnifiedClientDocInput;
}

export async function createUnifiedClientDocument({
  data,
}: CreateUnifiedClientDocumentVariables): Promise<DocumentActionResponse> {
  const response = await axios.post<DocumentActionResponse>("/api/v1/documents", {
    entityType: DOCUMENT_ENTITY_TYPES.CLIENT,
    ...data,
  });
  return response.data;
}

export function useCreateUnifiedClientDocumentMutation(
  options?: UseMutationOptions<DocumentActionResponse, Error, CreateUnifiedClientDocumentVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createUnifiedClientDocument,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_DOCUMENT_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.all,
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export const useCreateClientDocMutation = useCreateUnifiedClientDocumentMutation;

export default useCreateUnifiedClientDocumentMutation;
