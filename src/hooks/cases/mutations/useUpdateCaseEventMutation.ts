"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CASE_EVENT_QUERY_KEYS } from "@/const/case-event.const";
import type {
  UpdateCaseEventInput,
  CaseEventActionResponse,
} from "@/types/case-event.types";

interface UpdateCaseEventVariables {
  caseId: string;
  eventId: string;
  payload: UpdateCaseEventInput;
}

/**
 * API call to update an existing case event.
 */
export async function updateCaseEvent({
  caseId,
  eventId,
  payload,
}: UpdateCaseEventVariables): Promise<CaseEventActionResponse> {
  const response = await axios.patch<CaseEventActionResponse>(
    `/api/v1/cases/${caseId}/events/${eventId}`,
    payload
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for updating a case event.
 * Automatically invalidates case events timeline and case details upon success.
 */
export function useUpdateCaseEventMutation(
  options?: UseMutationOptions<
    CaseEventActionResponse,
    Error,
    UpdateCaseEventVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateCaseEvent,
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
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateCaseEventMutation;
