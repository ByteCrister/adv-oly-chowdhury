"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { profileKeys } from "../queries/useProfile";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUploadProfileImageMutation;
