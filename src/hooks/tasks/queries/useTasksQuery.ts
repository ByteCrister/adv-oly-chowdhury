"use client";

import { useQuery, keepPreviousData, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { TASK_QUERY_KEYS } from "@/const/task.const";
import type { TaskFilterParams, TaskPaginationResponse } from "@/types/task.types";

/**
 * Fetch tasks with filters, sorting, and pagination from /api/v1/tasks
 */
export async function fetchTasks(
  params: TaskFilterParams = {}
): Promise<TaskPaginationResponse> {
  const response = await axios.get<TaskPaginationResponse>("/api/v1/tasks", {
    params,
  });
  return response.data;
}

/**
 * TanStack Query hook for fetching chamber tasks with integrated filter-aware statistics
 */
export function useTasksQuery(
  params: TaskFilterParams = {},
  options?: Partial<UseQueryOptions<TaskPaginationResponse, Error>>
) {
  return useQuery({
    queryKey: TASK_QUERY_KEYS.list(params as Record<string, unknown>),
    queryFn: () => fetchTasks(params),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
    ...options,
  });
}

export default useTasksQuery;
