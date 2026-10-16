"use client";

import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { PasswordUpdateDto } from "@/types/profile.ui.type";

interface PasswordUpdateResponse {
  success: boolean;
  message: string;
  data: unknown;
}

export async function updatePassword(
  payload: PasswordUpdateDto
): Promise<PasswordUpdateResponse> {
  const response = await axios.patch<PasswordUpdateResponse>(
    "/api/v1/users/me/password",
    payload
  );
  return response.data;
}

export function useUpdatePasswordMutation(
  options?: UseMutationOptions<PasswordUpdateResponse, Error, PasswordUpdateDto>
) {
  return useMutation({
    ...options,
    mutationFn: updatePassword,
  });
}

export default useUpdatePasswordMutation;
