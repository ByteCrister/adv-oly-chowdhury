"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
import type {
  AuditHistoryFilterParams,
  AuditHistoryPaginationResponse,
} from "@/types/audit-history.types";

import type { QueryClient } from "@tanstack/react-query";

export const auditHistoryKeys = AUDIT_QUERY_KEYS;

/**
 * Invalidation helper to invalidate all audit history queries in TanStack Query cache.
 */
export async function invalidateAuditHistory(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: auditHistoryKeys.all });
}

export async function fetchAuditHistory(
  filters: AuditHistoryFilterParams = {}
): Promise<AuditHistoryPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.action && filters.action !== "ALL") {
    params.append("action", filters.action);
  }

  if (filters.date) {
    params.append("date", filters.date);
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
  const url = queryString
    ? `/api/v1/users/me/audit-history?${queryString}`
    : `/api/v1/users/me/audit-history`;

  const response = await axios.get<AuditHistoryPaginationResponse>(url);
  return response.data;
}

export function useAuditHistory(
  filters: AuditHistoryFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      AuditHistoryPaginationResponse,
      Error,
      AuditHistoryPaginationResponse,
      ReturnType<typeof auditHistoryKeys.myHistory>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: auditHistoryKeys.myHistory(filters as Record<string, unknown>),
    queryFn: () => fetchAuditHistory(filters),
    staleTime: 30 * 1000, // 30 seconds fresh cache
    refetchOnWindowFocus: true,
    ...options,
  });
}

export default useAuditHistory;
