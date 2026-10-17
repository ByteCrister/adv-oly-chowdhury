"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_PAYMENT_QUERY_KEYS } from "@/const/client-payment.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { FINANCIAL_QUERY_KEYS } from "@/const/financial.const";
import type {
  CreateClientPaymentInput,
  ClientPaymentActionResponse,
} from "@/types/client-payment.types";

export interface CreateClientPaymentVariables {
  clientId: string;
  data: CreateClientPaymentInput;
}

/**
 * API call to record a client payment.
 */
export async function createClientPayment({
  clientId,
  data,
}: CreateClientPaymentVariables): Promise<ClientPaymentActionResponse> {
  const response = await axios.post<ClientPaymentActionResponse>(
    `/api/v1/clients/${clientId}/payments`,
    data
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for recording a client payment.
 * Automatically invalidates payment list, client details, client lists, overall stats, and financials.
 */
export function useCreateClientPaymentMutation(
  options?: UseMutationOptions<
    ClientPaymentActionResponse,
    Error,
    CreateClientPaymentVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createClientPayment,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CLIENT_PAYMENT_QUERY_KEYS.byClient(variables.clientId),
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.detail(variables.clientId),
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_QUERY_KEYS.stats(),
        }),
        queryClient.invalidateQueries({
          queryKey: FINANCIAL_QUERY_KEYS.all,
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useCreateClientPaymentMutation;
