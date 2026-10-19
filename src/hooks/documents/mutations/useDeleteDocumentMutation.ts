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
  DocumentDeleteResponse,
  DocumentEntityType,
} from "@/types/document.types";

export interface DeleteDocumentVariables {
  id: string;
  entityType?: DocumentEntityType;
}

export async function deleteDocument({
  id,
  entityType,
}: DeleteDocumentVariables): Promise<DocumentDeleteResponse> {
  const response = await axios.delete<DocumentDeleteResponse>(
    `/api/v1/documents/${id}`,
    {
      params: entityType ? { entityType } : undefined,
    }
  );
  return response.data;
}

export function useDeleteDocumentMutation(
  options?: UseMutationOptions<DocumentDeleteResponse, Error, DeleteDocumentVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteDocument,
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

export default useDeleteDocumentMutation;
