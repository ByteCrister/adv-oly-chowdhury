"use client";

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { CLIENT_PAYMENT_QUERY_KEYS } from "@/const/client-payment.const";
import { CLIENT_QUERY_KEYS } from "@/const/client.const";
import { FINANCIAL_QUERY_KEYS } from "@/const/financial.const";
import { CASE_QUERY_KEYS } from "@/const/case.const";
import type {
  UpdateClientPaymentInput,
  ClientPaymentActionResponse,
} from "@/types/client-payment.types";

export interface UpdateClientPaymentVariables {
  clientId: string;
  paymentId: string;
  data: UpdateClientPaymentInput;
}

/**
 * API call to update a client payment record.
 */
export async function updateClientPayment({
  clientId,
  paymentId,
  data,
}: UpdateClientPaymentVariables): Promise<ClientPaymentActionResponse> {
  const response = await axios.patch<ClientPaymentActionResponse>(
    `/api/v1/clients/${clientId}/payments/${paymentId}`,
    data
  );
  return response.data;
}

/**
 * TanStack Query mutation hook for updating a client payment.
 * Automatically invalidates payment list, client details, client lists, overall stats, financials, and case details.
 */
export function useUpdateClientPaymentMutation(
  options?: UseMutationOptions<
    ClientPaymentActionResponse,
    Error,
    UpdateClientPaymentVariables
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateClientPayment,
    onSuccess: async (data, variables, context, mutation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CLIENT_PAYMENT_QUERY_KEYS.all,
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
        queryClient.invalidateQueries({
          queryKey: CASE_QUERY_KEYS.all,
        }),
      ]);
      await options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export default useUpdateClientPaymentMutation;
