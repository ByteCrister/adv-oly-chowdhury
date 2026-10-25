import {
  ClientDocumentType,
  ClientDocumentPageLimit,
  ClientDocumentSortOption,
} from "@/const/client-document.const";

/**
 * Full Client Document Data Transfer Object including populated Asset and AssetReference details.
 */
export interface ClientDocumentItemDto {
  id: string; // ClientDocument._id
  clientId: string;
  assetReferenceId: string; // AssetReference._id
  assetId: string; // Physical Asset._id
  documentType: ClientDocumentType;
  documentTypeLabel: string;
  title: string;
  documentDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  originalFileName: string;
  fileUrl: string;
  publicId: string;
  mimeType: string;
  sizeBytes: number;
  format: string | null;
  width: number | null;
  height: number | null;
  pages: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Filter parameters for querying documents belonging to a client.
 */
export interface ClientDocumentFilterParams {
  search?: string;
  documentType?: ClientDocumentType | "ALL";
  startDate?: string | null;
  endDate?: string | null;
  sort?: ClientDocumentSortOption;
  page?: number;
  limit?: ClientDocumentPageLimit;
}

/**
 * Paginated client documents response.
 */
export interface ClientDocumentPaginationResponse {
  items: ClientDocumentItemDto[];
  total: number;
  page: number;
  limit: ClientDocumentPageLimit;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Input payload to create a new client document.
 * Requires an existing AssetReference created via the media upload workflow.
 */
export interface CreateClientDocumentInput {
  assetReferenceId: string;
  documentType: ClientDocumentType;
  title: string;
  documentDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

/**
 * Input payload to update an existing client document.
 * If assetReferenceId is provided, the document file is replaced safely.
 */
export interface UpdateClientDocumentInput {
  title?: string;
  documentType?: ClientDocumentType;
  documentDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  assetReferenceId?: string;
}

/**
 * Response for document creation and update mutations.
 */
export interface ClientDocumentActionResponse {
  success: boolean;
  message: string;
  data: ClientDocumentItemDto;
}

/**
 * Response for document deletion.
 */
export interface ClientDocumentDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}

/**
 * API response for single client document detail query.
 */
export interface SingleClientDocumentApiResponse {
  success: boolean;
  data: ClientDocumentItemDto;
}

