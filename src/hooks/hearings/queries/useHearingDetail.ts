"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { HEARING_QUERY_KEYS } from "@/const/hearing.const";
import type { HearingActionResponse } from "@/types/hearing.types";

/**
 * Fetch a single hearing record with full details by ID.
 */
export async function fetchHearingDetail(id: string): Promise<HearingActionResponse> {
  const response = await axios.get<HearingActionResponse>(`/api/v1/hearings/${id}`);
  return response.data;
}

/**
 * TanStack Query hook for fetching hearing details.
 */
export function useHearingDetail(
  id?: string,
  options?: Omit<
    UseQueryOptions<
      HearingActionResponse,
      Error,
      HearingActionResponse,
      ReturnType<typeof HEARING_QUERY_KEYS.detail>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: HEARING_QUERY_KEYS.detail(id || ""),
    queryFn: () => fetchHearingDetail(id!),
    enabled: Boolean(id),
    ...options,
  });
}

export default useHearingDetail;
