import {
  PaymentMethod,
  PaymentType,
  ClientPaymentPageLimit,
  ClientPaymentSortOption,
} from "@/const/client-payment.const";
import { AssetType } from "@/const/asset.const";

/**
 * Full Client Payment Data Transfer Object including case and receipt asset details.
 */
export interface ClientPaymentItemDto {
  id: string; // ClientPayment._id
  clientId: string;
  caseId: string | null;
  caseReference: string | null;
  caseTitle: string | null;
  paymentDate: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  paymentType: PaymentType;
  paymentTypeLabel: string;
  referenceNumber: string | null;
  moneyReceiptNumber: string | null;
  receiptAssetreferenceId: string | null;
  receiptAssetReferenceId?: string | null; // camelCase alias for reference
  receiptUrl: string | null;
  receiptFileName: string | null;
  receiptAssetType?: AssetType | null;
  receiptMimeType?: string | null;
  receiptSizeBytes?: number | null;
  notes: string | null;
  receivedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Breakdown of financial payments collected for a client.
 */
export interface ClientPaymentSummaryStats {
  totalCount: number;
  totalAmount: number;
  methodBreakdown: Partial<Record<PaymentMethod, number>>;
  typeBreakdown: Partial<Record<PaymentType, number>>;
}

/**
 * Query filter parameters for client payment listing.
 */
export interface ClientPaymentFilterParams {
  search?: string;
  paymentMethod?: PaymentMethod | "ALL";
  paymentType?: PaymentType | "ALL";
  caseId?: string | "ALL";
  startDate?: string | null;
  endDate?: string | null;
  sort?: ClientPaymentSortOption;
  page?: number;
  limit?: ClientPaymentPageLimit;
}

/**
 * Paginated client payments response with summary aggregation.
 */
export interface ClientPaymentPaginationResponse {
  items: ClientPaymentItemDto[];
  summary: ClientPaymentSummaryStats;
  total: number;
  page: number;
  limit: ClientPaymentPageLimit;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Input payload to record a client payment.
 */
export interface CreateClientPaymentInput {
  caseId?: string | null;
  paymentDate: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  referenceNumber?: string | null;
  receiptAssetreferenceId?: string | null;
  receiptAssetReferenceId?: string | null;
  moneyReceiptNumber?: string | null;
  notes?: string | null;
}

/**
 * Input payload to update an existing payment record.
 */
export type UpdateClientPaymentInput = Partial<CreateClientPaymentInput>;

/**
 * Response for payment creation and update mutations.
 */
export interface ClientPaymentActionResponse {
  success: boolean;
  message: string;
  data: ClientPaymentItemDto;
}

/**
 * Response for payment deletion.
 */
export interface ClientPaymentDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}

/**
 * API response for single client payment detail query.
 */
export interface SingleClientPaymentApiResponse {
  success: boolean;
  data: ClientPaymentItemDto;
}

