"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { DROPDOWN_QUERY_KEYS, DROPDOWN_TYPES } from "@/const/dropdown.const";
import type {
  DropdownFilterParams,
  DropdownApiResponse,
} from "@/types/dropdown.types";

/**
 * Fetch dropdown options from the unified GET /api/v1/dropdowns endpoint.
 */
export async function fetchDropdownItems(
  params: DropdownFilterParams
): Promise<DropdownApiResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append("type", params.type);

  if (params.search?.trim()) {
    searchParams.append("search", params.search.trim());
  }

  if (params.clientId) {
    searchParams.append("clientId", params.clientId);
  }

  if (params.courtId) {
    searchParams.append("courtId", params.courtId);
  }

  if (params.limit) {
    searchParams.append("limit", String(params.limit));
  }

  const { data } = await axios.get<DropdownApiResponse>(
    `/api/v1/dropdowns?${searchParams.toString()}`
  );
  return data;
}

/**
 * Primary TanStack Query hook for fetching dropdown options.
 */
export function useDropdownQuery(
  params: DropdownFilterParams,
  options?: Omit<UseQueryOptions<DropdownApiResponse, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: DROPDOWN_QUERY_KEYS.BY_TYPE(params.type, {
      search: params.search,
      clientId: params.clientId,
      courtId: params.courtId,
      limit: params.limit,
    }),
    queryFn: () => fetchDropdownItems(params),
    staleTime: 1000 * 60 * 3, // 3 minutes cache
    ...options,
  });
}

/**
 * Convenience hook for Client dropdown options.
 */
export function useClientsDropdown(search?: string, limit?: number) {
  return useDropdownQuery({
    type: DROPDOWN_TYPES.CLIENT,
    search,
    limit,
  });
}

/**
 * Convenience hook for Court dropdown options.
 */
export function useCourtsDropdown(search?: string, limit?: number) {
  return useDropdownQuery({
    type: DROPDOWN_TYPES.COURT,
    search,
    limit,
  });
}

/**
 * Convenience hook for Case dropdown options (filterable by clientId and/or courtId).
 */
export function useCasesDropdown(params?: {
  clientId?: string;
  courtId?: string;
  search?: string;
  limit?: number;
}) {
  return useDropdownQuery({
    type: DROPDOWN_TYPES.CASE,
    clientId: params?.clientId,
    courtId: params?.courtId,
    search: params?.search,
    limit: params?.limit,
  });
}
