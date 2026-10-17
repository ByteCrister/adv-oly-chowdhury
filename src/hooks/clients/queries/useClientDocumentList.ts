"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_DOCUMENT_QUERY_KEYS } from "@/const/client-document.const";
import type {
  ClientDocumentFilterParams,
  ClientDocumentPaginationResponse,
} from "@/types/client-document.types";

export const clientDocumentKeys = CLIENT_DOCUMENT_QUERY_KEYS;

/**
 * Fetch paginated list of documents for a client.
 */
export async function fetchClientDocumentList(
  clientId: string,
  filters: ClientDocumentFilterParams = {}
): Promise<ClientDocumentPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.documentType && filters.documentType !== "ALL") {
    params.append("documentType", filters.documentType);
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
    ? `/api/v1/clients/${clientId}/documents?${queryString}`
    : `/api/v1/clients/${clientId}/documents`;

  const response = await axios.get<ClientDocumentPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching client documents.
 */
export function useClientDocumentList(
  clientId: string,
  filters: ClientDocumentFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      ClientDocumentPaginationResponse,
      Error,
      ClientDocumentPaginationResponse,
      ReturnType<typeof clientDocumentKeys.list>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: clientDocumentKeys.list(clientId, filters as Record<string, unknown>),
    queryFn: () => fetchClientDocumentList(clientId, filters),
    enabled: Boolean(clientId),
    ...options,
  });
}

export default useClientDocumentList;
