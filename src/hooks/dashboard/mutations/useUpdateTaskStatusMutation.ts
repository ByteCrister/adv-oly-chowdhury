"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import {
  TaskStatusUpdateDto,
  TaskUpdateApiResponse,
} from "@/types/dashboard.ui.type";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { TASK_QUERY_KEYS } from "@/const/task.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";

export async function updateTaskStatus(
  dto: TaskStatusUpdateDto
): Promise<TaskUpdateApiResponse> {
  const { taskId, status } = dto;
  const response = await axios.patch<TaskUpdateApiResponse>(
    `/api/v1/dashboard/tasks/${taskId}`,
    { status }
  );
  return response.data;
}

export function useUpdateTaskStatusMutation(
  options?: UseMutationOptions<TaskUpdateApiResponse, Error, TaskStatusUpdateDto>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateTaskStatus,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: DASHBOARD_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: TASK_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: TASK_QUERY_KEYS.detail(variables.taskId),
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: CASE_QUERY_KEYS.all,
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateTaskStatusMutation;
