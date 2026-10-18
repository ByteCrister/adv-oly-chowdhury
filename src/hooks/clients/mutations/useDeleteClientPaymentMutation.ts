"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_PAYMENT_QUERY_KEYS } from "@/const/client-payment.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { FINANCIAL_QUERY_KEYS } from "@/const/financial.const";
import type { ClientPaymentDeleteResponse } from "@/types/client-payment.types";

export interface DeleteClientPaymentVariables {
  clientId: string;
  paymentId: string;
}

/**
 * API call to delete a client payment record.
 */
export async function deleteClientPayment({
  clientId,
  paymentId,
}: DeleteClientPaymentVariables): Promise<ClientPaymentDeleteResponse> {
  const response = await axios.delete<ClientPaymentDeleteResponse>(
    `/api/v1/clients/${clientId}/payments/${paymentId}`
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for deleting a client payment.
 * Automatically invalidates payment list, client details, client lists, overall stats, and financials.
 */
export function useDeleteClientPaymentMutation(
  options?: UseMutationOptions<
    ClientPaymentDeleteResponse,
    Error,
    DeleteClientPaymentVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: deleteClientPayment,
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
          queryKey: FINANCIAL_QUERY_KEYS.all,
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useDeleteClientPaymentMutation;
