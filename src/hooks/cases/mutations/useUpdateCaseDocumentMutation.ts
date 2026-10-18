"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CASE_DOCUMENT_QUERY_KEYS } from "@/const/case-document.const";
import { DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import type {
  UpdateCaseDocumentInput,
  CaseDocumentActionResponse,
} from "@/types/case-document.types";

interface UpdateCaseDocumentVariables {
  caseId: string;
  docId: string;
  payload: UpdateCaseDocumentInput;
}

/**
 * API call to update a case document's metadata or replacement file.
 */
export async function updateCaseDocument({
  caseId,
  docId,
  payload,
}: UpdateCaseDocumentVariables): Promise<CaseDocumentActionResponse> {
  const response = await axios.patch<CaseDocumentActionResponse>(
    `/api/v1/cases/${caseId}/documents/${docId}`,
    payload
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for updating a case document.
 * Automatically invalidates case documents, case detail, global documents, and client summaries upon success.
 */
export function useUpdateCaseDocumentMutation(
  options?: UseMutationOptions<
    CaseDocumentActionResponse,
    Error,
    UpdateCaseDocumentVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateCaseDocument,
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

export default useUpdateCaseDocumentMutation;
