"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CASE_DOCUMENT_QUERY_KEYS } from "@/const/case-document.const";
import { DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import type {
  CreateCaseDocumentInput,
  CaseDocumentActionResponse,
} from "@/types/case-document.types";

export interface CreateCaseScopedDocumentVariables {
  caseId: string;
  payload: Omit<CreateCaseDocumentInput, "caseId">;
}

/**
 * API call to add a legal document to a case.
 */
export async function createCaseDocument({
  caseId,
  payload,
}: CreateCaseScopedDocumentVariables): Promise<CaseDocumentActionResponse> {

  const response = await axios.post<CaseDocumentActionResponse>(
    `/api/v1/cases/${caseId}/documents`,
    payload
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for adding a document to a case.
 * Automatically invalidates case documents, case detail & counts, cases list, global documents, and client summaries.
 */
export function useCreateCaseDocumentMutation(
  options?: UseMutationOptions<
    CaseDocumentActionResponse,
    Error,
    CreateCaseScopedDocumentVariables
  >
) {

  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createCaseDocument,
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

export const createCaseScopedDocument = createCaseDocument;
export const useCreateCaseScopedDocumentMutation = useCreateCaseDocumentMutation;

export default useCreateCaseDocumentMutation;


