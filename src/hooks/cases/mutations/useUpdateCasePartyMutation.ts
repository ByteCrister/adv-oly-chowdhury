"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CASE_PARTY_QUERY_KEYS } from "@/const/case-party.const";
import type {
  UpdateCasePartyInput,
  CasePartyActionResponse,
} from "@/types/case-party.types";

interface UpdateCasePartyVariables {
  caseId: string;
  partyId: string;
  payload: UpdateCasePartyInput;
}

/**
 * API call to update an existing case party.
 */
export async function updateCaseParty({
  caseId,
  partyId,
  payload,
}: UpdateCasePartyVariables): Promise<CasePartyActionResponse> {
  const response = await axios.patch<CasePartyActionResponse>(
    `/api/v1/cases/${caseId}/parties/${partyId}`,
    payload
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for updating a case party.
 * Automatically invalidates case parties list, case details, and case lists upon success.
 */
export function useUpdateCasePartyMutation(
  options?: UseMutationOptions<
    CasePartyActionResponse,
    Error,
    UpdateCasePartyVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateCaseParty,
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

export default useUpdateCasePartyMutation;
