"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_PAYMENT_QUERY_KEYS } from "@/const/client-payment.const";
import type {
  ClientPaymentFilterParams,
  ClientPaymentPaginationResponse,
} from "@/types/client-payment.types";

export const clientPaymentKeys = CLIENT_PAYMENT_QUERY_KEYS;

/**
 * Fetch paginated list of payments for a client.
 */
export async function fetchClientPaymentList(
  clientId: string,
  filters: ClientPaymentFilterParams = {}
): Promise<ClientPaymentPaginationResponse> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
    params.append("paymentMethod", filters.paymentMethod);
  }

  if (filters.paymentType && filters.paymentType !== "ALL") {
    params.append("paymentType", filters.paymentType);
  }

  if (filters.caseId && filters.caseId !== "ALL") {
    params.append("caseId", filters.caseId);
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
    ? `/api/v1/clients/${clientId}/payments?${queryString}`
    : `/api/v1/clients/${clientId}/payments`;

  const response = await axios.get<ClientPaymentPaginationResponse>(url);
  return response.data;
}

/**
 * TanStack Query hook for fetching client payments.
 */
export function useClientPaymentList(
  clientId: string,
  filters: ClientPaymentFilterParams = {},
  options?: Omit<
    UseQueryOptions<
      ClientPaymentPaginationResponse,
      Error,
      ClientPaymentPaginationResponse,
      ReturnType<typeof clientPaymentKeys.list>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: clientPaymentKeys.list(clientId, filters as Record<string, unknown>),
    queryFn: () => fetchClientPaymentList(clientId, filters),
    enabled: Boolean(clientId),
    ...options,
  });
}

export default useClientPaymentList;
