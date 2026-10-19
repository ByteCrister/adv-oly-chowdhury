"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { TASK_QUERY_KEYS } from "@/const/task.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
import type { TaskDeleteResponse } from "@/types/task.types";

export async function deleteTask(id: string): Promise<TaskDeleteResponse> {
  const response = await axios.delete<TaskDeleteResponse>(`/api/v1/tasks/${id}`);
  return response.data;
}

export function useDeleteTaskMutation(
  options?: UseMutationOptions<TaskDeleteResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteTask,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useDeleteTaskMutation;
