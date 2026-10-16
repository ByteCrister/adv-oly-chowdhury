"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { mediaKeys } from "../queries/useMediaList";

export interface DeleteMediaResponse {
  success: boolean;
  message: string;
  id: string;
  deletedAt: string;
}

export async function deleteMediaReference(id: string): Promise<DeleteMediaResponse> {
  const response = await axios.delete<DeleteMediaResponse>(`/api/media/${id}`);
  return response.data;
}

export function useDeleteMediaMutation(
  options?: UseMutationOptions<DeleteMediaResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteMediaReference,
    onSuccess: (data, id, context) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      if (options?.onSuccess) {
        (options.onSuccess as (data: DeleteMediaResponse, variables: string, context: unknown) => void)(
          data,
          id,
          context
        );
      }
    },
  });
}
