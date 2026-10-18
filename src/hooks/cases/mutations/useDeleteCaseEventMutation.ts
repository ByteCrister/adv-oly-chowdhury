"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { CASE_EVENT_QUERY_KEYS } from "@/const/case-event.const";
import type { CaseEventDeleteResponse } from "@/types/case-event.types";

interface DeleteCaseEventVariables {
  caseId: string;
  eventId: string;
}

/**
 * API call to delete a case event and safely soft-delete its attachment.
 */
export async function deleteCaseEvent({
  caseId,
  eventId,
}: DeleteCaseEventVariables): Promise<CaseEventDeleteResponse> {
  const response = await axios.delete<CaseEventDeleteResponse>(
    `/api/v1/cases/${caseId}/events/${eventId}`
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for deleting a case event.
 * Automatically invalidates case events timeline, case detail & counts, and case lists upon success.
 */
export function useDeleteCaseEventMutation(
  options?: UseMutationOptions<
    CaseEventDeleteResponse,
    Error,
    DeleteCaseEventVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteCaseEvent,
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

export default useDeleteCaseEventMutation;
