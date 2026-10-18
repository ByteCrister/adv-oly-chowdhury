"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CASE_PARTY_QUERY_KEYS } from "@/const/case-party.const";
import type {
  CreateCasePartyInput,
  CasePartyActionResponse,
} from "@/types/case-party.types";

interface CreateCasePartyVariables {
  caseId: string;
  payload: Omit<CreateCasePartyInput, "caseId">;
}

/**
 * API call to add a party to a case.
 */
export async function createCaseParty({
  caseId,
  payload,
}: CreateCasePartyVariables): Promise<CasePartyActionResponse> {
  const response = await axios.post<CasePartyActionResponse>(
    `/api/v1/cases/${caseId}/parties`,
    payload
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for creating a case party.
 * Automatically invalidates case parties list, case detail & counts, and case lists upon success.
 */
export function useCreateCasePartyMutation(
  options?: UseMutationOptions<
    CasePartyActionResponse,
    Error,
    CreateCasePartyVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createCaseParty,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CASE_QUERY_KEYS.partiesPrefix(variables.caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: CASE_PARTY_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: CASE_QUERY_KEYS.detail(variables.caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: CASE_QUERY_KEYS.lists(),
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useCreateCasePartyMutation;
