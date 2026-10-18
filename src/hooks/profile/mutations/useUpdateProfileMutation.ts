"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { ProfileUpdateDto, ProfileApiResponse } from "@/types/profile.ui.type";
import { profileKeys } from "../queries/useProfile";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";

export async function updateProfile(
  payload: ProfileUpdateDto
): Promise<ProfileApiResponse> {
  const response = await axios.patch<ProfileApiResponse>(
    "/api/v1/users/me",
    payload
  );
  return response.data;
}

export function useUpdateProfileMutation(
  options?: UseMutationOptions<ProfileApiResponse, Error, ProfileUpdateDto>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateProfile,
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate current user query and dashboard advocate info
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateProfileMutation;
