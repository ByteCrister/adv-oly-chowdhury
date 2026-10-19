"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import { CASE_DOCUMENT_QUERY_KEYS } from "@/const/case-document.const";
import { CLIENT_DOCUMENT_QUERY_KEYS } from "@/const/client-document.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
import type {
  UpdateUnifiedDocumentInput,
  DocumentActionResponse,
} from "@/types/document.types";

export interface UpdateDocumentVariables {
  id: string;
  data: UpdateUnifiedDocumentInput;
}

export async function updateDocument({
  id,
  data,
}: UpdateDocumentVariables): Promise<DocumentActionResponse> {
  const response = await axios.patch<DocumentActionResponse>(
    `/api/v1/documents/${id}`,
    data
  );
  return response.data;
}

export function useUpdateDocumentMutation(
  options?: UseMutationOptions<DocumentActionResponse, Error, UpdateDocumentVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateDocument,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CASE_DOCUMENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CLIENT_DOCUMENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateDocumentMutation;
