"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { ProfileUpdateDto, ProfileApiResponse } from "@/types/profile.ui.type";
import { profileKeys } from "../queries/useProfile";

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
      // Invalidate current user query to refresh cache everywhere
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateProfileMutation;
