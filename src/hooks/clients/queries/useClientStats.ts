"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import type { ClientOverallStatsDto } from "@/types/client.types";

interface ClientStatsApiResponse {
  success: boolean;
  data: ClientOverallStatsDto;
}

/**
 * Fetch client management aggregate statistics.
 */
export async function fetchClientStats(): Promise<ClientOverallStatsDto> {
  const response = await axios.get<ClientStatsApiResponse>("/api/v1/clients/stats");
  return response.data.data;
}

/**
 * TanStack Query hook for fetching aggregate client metrics.
 */
export function useClientStats(
  options?: Omit<
    UseQueryOptions<
      ClientOverallStatsDto,
      Error,
      ClientOverallStatsDto,
      ReturnType<typeof CLIENT_QUERY_KEYS.stats>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: CLIENT_QUERY_KEYS.stats(),
    queryFn: fetchClientStats,
    ...options,
  });
}

export default useClientStats;
