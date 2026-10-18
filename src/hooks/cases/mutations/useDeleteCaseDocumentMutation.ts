"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CASE_DOCUMENT_QUERY_KEYS } from "@/const/case-document.const";
import { DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import type { CaseDocumentDeleteResponse } from "@/types/case-document.types";

interface DeleteCaseDocumentVariables {
  caseId: string;
  docId: string;
}

/**
 * API call to safely soft-delete a case document.
 */
export async function deleteCaseDocument({
  caseId,
  docId,
}: DeleteCaseDocumentVariables): Promise<CaseDocumentDeleteResponse> {
  const response = await axios.delete<CaseDocumentDeleteResponse>(
    `/api/v1/cases/${caseId}/documents/${docId}`
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for soft-deleting a case document.
 * Automatically invalidates case documents, case detail & counts, cases list, global documents, and client summaries.
 */
export function useDeleteCaseDocumentMutation(
  options?: UseMutationOptions<
    CaseDocumentDeleteResponse,
    Error,
    DeleteCaseDocumentVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteCaseDocument,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CASE_QUERY_KEYS.documentsPrefix(variables.caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: CASE_DOCUMENT_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: CASE_QUERY_KEYS.detail(variables.caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: CASE_QUERY_KEYS.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: DOCUMENT_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.all,
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useDeleteCaseDocumentMutation;
