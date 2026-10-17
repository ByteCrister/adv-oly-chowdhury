"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CleanupApiResponse } from "@/types/media.types";
import { mediaKeys } from "../queries/useMediaList";

export async function triggerMediaCleanup(): Promise<CleanupApiResponse> {
  const response = await axios.post<CleanupApiResponse>("/api/v1/media/cleanup");
  return response.data;
}

export function useCleanupMediaMutation(
  options?: UseMutationOptions<CleanupApiResponse, Error, void>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: triggerMediaCleanup,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      if (options?.onSuccess) {
        (options.onSuccess as (data: CleanupApiResponse, variables: void, context: unknown) => void)(
          data,
          variables,
          context
        );
      }
    },
  });
}
