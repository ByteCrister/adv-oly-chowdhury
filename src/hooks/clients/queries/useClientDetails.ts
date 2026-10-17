"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import type { ClientDetailDto } from "@/types/client.types";

interface SingleClientApiResponse {
  success: boolean;
  data: ClientDetailDto;
}

/**
 * Fetch detailed client profile by ID.
 */
export async function fetchClientDetails(id: string): Promise<ClientDetailDto> {
  const response = await axios.get<SingleClientApiResponse>(`/api/v1/clients/${id}`);
  return response.data.data;
}

/**
 * TanStack Query hook for fetching full details and statistics for a single client.
 */
export function useClientDetails(
  id: string,
  options?: Omit<
    UseQueryOptions<
      ClientDetailDto,
      Error,
      ClientDetailDto,
      ReturnType<typeof CLIENT_QUERY_KEYS.detail>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: CLIENT_QUERY_KEYS.detail(id),
    queryFn: () => fetchClientDetails(id),
    enabled: Boolean(id),
    ...options,
  });
}

export default useClientDetails;
