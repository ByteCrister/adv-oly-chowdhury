"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_DOCUMENT_QUERY_KEYS } from "@/const/client-document.const";
import type {
  ClientDocumentItemDto,
  SingleClientDocumentApiResponse,
} from "@/types/client-document.types";

/**
 * Fetch a single client document by client ID and document ID.
 */
export async function fetchClientDocumentDetails(
  clientId: string,
  docId: string
): Promise<ClientDocumentItemDto> {
  const response = await axios.get<SingleClientDocumentApiResponse>(
    `/api/v1/clients/${clientId}/documents/${docId}`
  );
  return response.data.data;
}

/**
 * TanStack Query hook for fetching details of a specific client document.
 */
export function useClientDocumentDetails(
  clientId: string,
  docId: string,
  options?: Omit<
    UseQueryOptions<
      ClientDocumentItemDto,
      Error,
      ClientDocumentItemDto,
      ReturnType<typeof CLIENT_DOCUMENT_QUERY_KEYS.detail>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: CLIENT_DOCUMENT_QUERY_KEYS.detail(clientId, docId),
    queryFn: () => fetchClientDocumentDetails(clientId, docId),
    enabled: Boolean(clientId && docId),
    ...options,
  });
}

export default useClientDocumentDetails;
