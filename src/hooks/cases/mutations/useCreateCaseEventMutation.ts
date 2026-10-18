"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CASE_EVENT_QUERY_KEYS } from "@/const/case-event.const";
import type {
  CreateCaseEventInput,
  CaseEventActionResponse,
} from "@/types/case-event.types";

interface CreateCaseEventVariables {
  caseId: string;
  payload: Omit<CreateCaseEventInput, "caseId">;
}

/**
 * API call to record a new event for a case.
 */
export async function createCaseEvent({
  caseId,
  payload,
}: CreateCaseEventVariables): Promise<CaseEventActionResponse> {
  const response = await axios.post<CaseEventActionResponse>(
    `/api/v1/cases/${caseId}/events`,
    payload
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for creating a case event.
 * Automatically invalidates case events timeline, case detail & counts, and case lists upon success.
 */
export function useCreateCaseEventMutation(
  options?: UseMutationOptions<
    CaseEventActionResponse,
    Error,
    CreateCaseEventVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createCaseEvent,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CASE_QUERY_KEYS.eventsPrefix(variables.caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: CASE_EVENT_QUERY_KEYS.all,
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

export default useCreateCaseEventMutation;
