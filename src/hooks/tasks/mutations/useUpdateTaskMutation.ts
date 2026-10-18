"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { TASK_QUERY_KEYS } from "@/const/task.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import type { UpdateTaskInputDto, TaskActionResponse } from "@/types/task.types";

export interface UpdateTaskVariables {
  id: string;
  payload: UpdateTaskInputDto;
}

export async function updateTask({
  id,
  payload,
}: UpdateTaskVariables): Promise<TaskActionResponse> {
  const response = await axios.patch<TaskActionResponse>(`/api/v1/tasks/${id}`, payload);
  return response.data;
}

export function useUpdateTaskMutation(
  options?: UseMutationOptions<TaskActionResponse, Error, UpdateTaskVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateTask,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateTaskMutation;
