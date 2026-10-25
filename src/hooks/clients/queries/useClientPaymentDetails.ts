"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_PAYMENT_QUERY_KEYS } from "@/const/client-payment.const";
import type {
  ClientPaymentItemDto,
  SingleClientPaymentApiResponse,
} from "@/types/client-payment.types";

/**
 * Fetch a single client payment by client ID and payment ID.
 */
export async function fetchClientPaymentDetails(
  clientId: string,
  paymentId: string
): Promise<ClientPaymentItemDto> {
  const response = await axios.get<SingleClientPaymentApiResponse>(
    `/api/v1/clients/${clientId}/payments/${paymentId}`
  );
  return response.data.data;
}

/**
 * TanStack Query hook for fetching details of a specific client payment.
 */
export function useClientPaymentDetails(
  clientId: string,
  paymentId: string,
  options?: Omit<
    UseQueryOptions<
      ClientPaymentItemDto,
      Error,
      ClientPaymentItemDto,
      ReturnType<typeof CLIENT_PAYMENT_QUERY_KEYS.detail>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: CLIENT_PAYMENT_QUERY_KEYS.detail(clientId, paymentId),
    queryFn: () => fetchClientPaymentDetails(clientId, paymentId),
    enabled: Boolean(clientId && paymentId),
    ...options,
  });
}

export default useClientPaymentDetails;
