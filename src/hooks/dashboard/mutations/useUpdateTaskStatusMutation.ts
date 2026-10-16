"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  TaskStatusUpdateDto,
  TaskUpdateApiResponse,
} from "@/types/dashboard.ui.type";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";

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

export function useUpdateTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskStatus,
    onSuccess: () => {
      // Invalidate dashboard queries to update task counts and lists
      queryClient.invalidateQueries({
        queryKey: DASHBOARD_QUERY_KEYS.all,
      });
    },
  });
}

export default useUpdateTaskStatusMutation;
