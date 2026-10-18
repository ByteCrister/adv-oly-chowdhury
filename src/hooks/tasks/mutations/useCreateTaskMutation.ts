"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { TASK_QUERY_KEYS } from "@/const/task.const";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import type { CreateTaskInputDto, TaskActionResponse } from "@/types/task.types";

export async function createTask(
  payload: CreateTaskInputDto
): Promise<TaskActionResponse> {
  const response = await axios.post<TaskActionResponse>("/api/v1/tasks", payload);
  return response.data;
}

export function useCreateTaskMutation(
  options?: UseMutationOptions<TaskActionResponse, Error, CreateTaskInputDto>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createTask,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useCreateTaskMutation;
