"use client";

import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import {
  PrepareBatchRequest,
  PrepareApiResponse,
} from "@/types/media.types";

export async function prepareMediaUpload(
  payload: PrepareBatchRequest
): Promise<PrepareApiResponse> {
  const response = await axios.post<PrepareApiResponse>(
    "/api/media/prepare",
    payload
  );
  return response.data;
}

export function usePrepareUploadMutation(
  options?: UseMutationOptions<PrepareApiResponse, Error, PrepareBatchRequest>
) {
  return useMutation({
    mutationFn: prepareMediaUpload,
    ...options,
  });
}
