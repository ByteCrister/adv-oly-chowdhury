"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { PasswordUpdateDto } from "@/types/profile.ui.type";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
import { profileKeys } from "../queries/useProfile";

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
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updatePassword,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.all }),
        queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdatePasswordMutation;
