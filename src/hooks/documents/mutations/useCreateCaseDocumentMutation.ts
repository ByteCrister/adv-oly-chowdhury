"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { DOCUMENT_ENTITY_TYPES, DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import { CASE_DOCUMENT_QUERY_KEYS } from "@/const/case-document.const";
import type { CreateCaseDocumentInput } from "@/types/case-document.types";
import type { DocumentActionResponse } from "@/types/document.types";

export interface CreateCaseDocumentVariables {
  data: CreateCaseDocumentInput;
}

export async function createCaseDocument({
  data,
}: CreateCaseDocumentVariables): Promise<DocumentActionResponse> {
  const response = await axios.post<DocumentActionResponse>("/api/v1/documents", {
    entityType: DOCUMENT_ENTITY_TYPES.CASE,
    ...data,
  });
  return response.data;
}

export function useCreateCaseDocumentMutation(
  options?: UseMutationOptions<DocumentActionResponse, Error, CreateCaseDocumentVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createCaseDocument,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CASE_DOCUMENT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useCreateCaseDocumentMutation;
