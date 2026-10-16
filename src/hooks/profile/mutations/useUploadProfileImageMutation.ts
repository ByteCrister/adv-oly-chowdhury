"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { profileKeys } from "../queries/useProfile";

interface UploadAvatarResponse {
  success: boolean;
  message: string;
  data: unknown;
}

export async function uploadProfileImage(
  formData: FormData
): Promise<UploadAvatarResponse> {
  const response = await axios.post<UploadAvatarResponse>(
    "/api/v1/users/me/avatar",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

export function useUploadProfileImageMutation(
  options?: UseMutationOptions<UploadAvatarResponse, Error, FormData>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: uploadProfileImage,
    onSuccess: async (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUploadProfileImageMutation;
