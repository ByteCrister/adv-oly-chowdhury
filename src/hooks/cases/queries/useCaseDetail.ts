"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import type { CaseActionResponse, CaseDetailDto } from "@/types/case.types";

/**
 * Fetch a single case by its unique ID.
 */
export async function fetchCaseDetail(id: string): Promise<CaseDetailDto> {
  const response = await axios.get<CaseActionResponse>(`/api/v1/cases/${id}`);
  return response.data.data;
}

/**
 * TanStack Query hook for fetching details of a single case.
 */
export function useCaseDetail(
  id: string,
  options?: Omit<
    UseQueryOptions<
      CaseDetailDto,
      Error,
      CaseDetailDto,
      ReturnType<typeof CASE_QUERY_KEYS.detail>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.detail(id),
    queryFn: () => fetchCaseDetail(id),
    enabled: Boolean(id && /^[0-9a-fA-F]{24}$/.test(id)),
    ...options,
  });
}

export default useCaseDetail;
