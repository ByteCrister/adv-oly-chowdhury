"use client";

import { useQuery, keepPreviousData, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { DOCUMENT_QUERY_KEYS } from "@/const/document.const";
import type {
  DocumentFilterParams,
  DocumentPaginationResponse,
} from "@/types/document.types";

/**
 * Fetch unified documents from /api/v1/documents with filters, pagination, and sorting.
 */
export async function fetchDocuments(
  params: DocumentFilterParams = {}
): Promise<DocumentPaginationResponse> {
  const response = await axios.get<DocumentPaginationResponse>("/api/v1/documents", {
    params,
  });
  return response.data;
}

/**
 * TanStack Query hook for fetching paginated legal documents.
 */
export function useDocumentsQuery(
  params: DocumentFilterParams = {},
  options?: Partial<UseQueryOptions<DocumentPaginationResponse, Error>>
) {
  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.list(params as Record<string, unknown>),
    queryFn: () => fetchDocuments(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    ...options,
  });
}

export default useDocumentsQuery;
