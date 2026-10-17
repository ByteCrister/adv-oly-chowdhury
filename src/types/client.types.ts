import {
  ClientType,
  ClientStatus,
  ClientPageLimit,
  ClientSortOption,
} from "@/const/client.const";
import { ClientDocumentType } from "@/const/client-document.const";
import { PaymentMethod, PaymentType } from "@/const/client-payment.const";

/**
 * Summary DTO of a Case linked to a Client.
 */
export interface ClientCaseSummaryDto {
  id: string;
  internalReference: string;
  caseNumber: string | null;
  title: string;
  caseType: string;
  caseStatus: string;
  courtName: string | null;
  filingDate: string | null;
  nextHearingDate: string | null;
}

/**
 * Summary DTO of a Document linked to a Client.
 */
export interface ClientDocumentSummaryDto {
  id: string;
  title: string;
  documentType: ClientDocumentType;
  documentTypeLabel: string;
  documentDate: string | null;
  expiryDate: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

/**
 * Summary DTO of a Payment linked to a Client.
 */
export interface ClientPaymentSummaryDto {
  id: string;
  paymentDate: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  paymentType: PaymentType;
  paymentTypeLabel: string;
  referenceNumber: string | null;
  moneyReceiptNumber: string | null;
  caseReference: string | null;
}

/**
 * Client-level statistical overview.
 */
export interface ClientStatsSummary {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  totalDocuments: number;
  totalPayments: number;
  totalPaidAmount: number;
  lastPaymentDate: string | null;
  pendingTasksCount: number;
}

/**
 * Essential client information formatted for listing and overview table.
 */
export interface ClientListItemDto {
  id: string;
  clientNumber: string;
  clientType: ClientType;
  clientTypeLabel: string;
  status: ClientStatus;
  statusLabel: string;
  name: string;
  organizationName: string | null;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  address: string | null;
  totalCases: number;
  activeCases: number;
  totalDocuments: number;
  totalPayments: number;
  totalPaidAmount: number;
  isDeletable: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Detailed profile view for a single client including all fields and relations.
 */
export interface ClientDetailDto {
  id: string;
  clientNumber: string;
  clientType: ClientType;
  clientTypeLabel: string;
  status: ClientStatus;
  statusLabel: string;
  name: string;
  organizationName: string | null;
  fatherOrSpouseName: string | null;
  motherName: string | null;
  dateOfBirth: string | null;
  nationalId: string | null;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  address: string | null;
  permanentAddress: string | null;
  notes: string | null;
  isDeletable: boolean;
  stats: ClientStatsSummary;
  recentCases: ClientCaseSummaryDto[];
  recentDocuments: ClientDocumentSummaryDto[];
  recentPayments: ClientPaymentSummaryDto[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Aggregate client metrics across the entire application for the clients dashboard.
 */
export interface ClientOverallStatsDto {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  archivedClients: number;
  individualClients: number;
  corporateClients: number;
  clientsWithActiveCases: number;
  totalRevenueCollected: number;
  thisMonthRevenue: number;
  newClientsThisMonth: number;
}

/**
 * Query filter parameters for the client listing API.
 */
export interface ClientFilterParams {
  search?: string;
  clientType?: ClientType | "ALL";
  status?: ClientStatus | "ALL";
  startDate?: string | null;
  endDate?: string | null;
  sort?: ClientSortOption;
  page?: number;
  limit?: ClientPageLimit;
}

/**
 * Paginated client response.
 */
export interface ClientPaginationResponse {
  items: ClientListItemDto[];
  total: number;
  page: number;
  limit: ClientPageLimit;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Input payload for creating a new client.
 */
export interface CreateClientInput {
  clientNumber?: string;
  clientType: ClientType;
  status?: ClientStatus;
  name: string;
  organizationName?: string | null;
  fatherOrSpouseName?: string | null;
  motherName?: string | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  address?: string | null;
  permanentAddress?: string | null;
  notes?: string | null;
}

/**
 * Input payload for updating an existing client.
 */
export type UpdateClientInput = Partial<CreateClientInput>;

/**
 * API response for create and update mutations.
 */
export interface ClientActionResponse {
  success: boolean;
  message: string;
  data: ClientDetailDto;
}

/**
 * API response for safe client deletion.
 */
export interface ClientDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}
