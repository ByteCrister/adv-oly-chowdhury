"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CASE_PARTY_QUERY_KEYS } from "@/const/case-party.const";
import type { CasePartyDeleteResponse } from "@/types/case-party.types";

interface DeleteCasePartyVariables {
  caseId: string;
  partyId: string;
}

/**
 * API call to remove a party from a case.
 */
export async function deleteCaseParty({
  caseId,
  partyId,
}: DeleteCasePartyVariables): Promise<CasePartyDeleteResponse> {
  const response = await axios.delete<CasePartyDeleteResponse>(
    `/api/v1/cases/${caseId}/parties/${partyId}`
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for deleting a case party.
 * Automatically invalidates case parties list, case detail & counts, and case lists upon success.
 */
export function useDeleteCasePartyMutation(
  options?: UseMutationOptions<
    CasePartyDeleteResponse,
    Error,
    DeleteCasePartyVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteCaseParty,
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

export default useDeleteCasePartyMutation;
