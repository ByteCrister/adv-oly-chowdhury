"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import type { ClientFilterParams, ClientPaginationResponse } from "@/types/client.types";

export const clientKeys = CLIENT_QUERY_KEYS;

/**
 * Fetch paginated list of clients from backend API.
 */
export async function fetchClientList(
  filters: ClientFilterParams = {}
): Promise<ClientPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.clientType && filters.clientType !== "ALL") {
    params.append("clientType", filters.clientType);
  }

  if (filters.status && filters.status !== "ALL") {
    params.append("status", filters.status);
  }

  if (filters.startDate) {
    params.append("startDate", filters.startDate);
  }

  if (filters.endDate) {
    params.append("endDate", filters.endDate);
  }

  if (filters.sort) {
    params.append("sort", filters.sort);
  }

  if (filters.page) {
    params.append("page", String(filters.page));
  }

  if (filters.limit) {
    params.append("limit", String(filters.limit));
  }

  const queryString = params.toString();
  const url = queryString ? `/api/v1/clients?${queryString}` : "/api/v1/clients";

  const response = await axios.get<ClientPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching the client list.
 */
export function useClientList(
  filters: ClientFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      ClientPaginationResponse,
      Error,
      ClientPaginationResponse,
      ReturnType<typeof clientKeys.list>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: clientKeys.list(filters as Record<string, unknown>),
    queryFn: () => fetchClientList(filters),
    ...options,
  });
}

export default useClientList;
