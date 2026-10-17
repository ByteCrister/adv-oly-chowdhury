"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import {
  FinalizeBatchRequest,
  FinalizeApiResponse,
} from "@/types/media.types";
import { mediaKeys } from "../queries/useMediaList";

export async function finalizeMediaUpload(
  payload: FinalizeBatchRequest
): Promise<FinalizeApiResponse> {
  const response = await axios.post<FinalizeApiResponse>(
    "/api/v1/media/finalize",
    payload
  );
  return response.data;
}

export function useFinalizeUploadMutation(
  options?: UseMutationOptions<FinalizeApiResponse, Error, FinalizeBatchRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: finalizeMediaUpload,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      if (options?.onSuccess) {
        (options.onSuccess as (data: FinalizeApiResponse, variables: FinalizeBatchRequest, context: unknown) => void)(
          data,
          variables,
          context
        );
      }
    },
  });
}
