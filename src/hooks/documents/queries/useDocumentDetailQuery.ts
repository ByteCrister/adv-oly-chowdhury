"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import type { UnifiedDocumentItemDto } from "@/types/document.types";

/**
 * Fetch a single document by ID.
 */
export async function fetchDocumentDetail(
  id: string,
  entityType?: string
): Promise<{ success: boolean; data: UnifiedDocumentItemDto }> {
  const response = await axios.get<{ success: boolean; data: UnifiedDocumentItemDto }>(
    `/api/v1/documents/${id}`,
    {
      params: entityType ? { entityType } : undefined,
    }
  );
  return response.data;
}

/**
 * TanStack Query hook for fetching document details.
 */
export function useDocumentDetailQuery(
  id: string,
  entityType?: string,
  options?: Partial<UseQueryOptions<{ success: boolean; data: UnifiedDocumentItemDto }, Error>>
) {
  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.detail(id, entityType),
    queryFn: () => fetchDocumentDetail(id, entityType),
    enabled: Boolean(id),
    ...options,
  });
}

export default useDocumentDetailQuery;
