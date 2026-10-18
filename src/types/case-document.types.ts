import {
  CaseDocumentType,
  CaseDocumentPageLimit,
  CaseDocumentSortOption,
} from "@/const/case-document.const";

/**
 * Full Case Document Data Transfer Object including populated Case, Asset, and AssetReference details.
 */
export interface CaseDocumentItemDto {
  id: string; // CaseDocument._id
  caseId: string;
  caseDetails?: {
    id: string;
    title: string;
    caseNumber: string;
    internalReference: string;
    caseStatus?: string;
  } | null;
  assetReferenceId: string; // AssetReference._id
  assetId: string; // Physical Asset._id
  documentType: CaseDocumentType;
  documentTypeLabel: string;
  title: string;
  documentDate: string | null;
  description: string | null;
  exhibitNumber: string | null;
  isConfidential: boolean;
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
 * Filter parameters for querying documents belonging to a legal case.
 */
export interface CaseDocumentFilterParams {
  search?: string;
  caseId?: string;
  documentType?: CaseDocumentType | "ALL";
  isConfidential?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  sort?: CaseDocumentSortOption;
  page?: number;
  limit?: CaseDocumentPageLimit;
}

/**
 * Paginated case documents response.
 */
export interface CaseDocumentPaginationResponse {
  items: CaseDocumentItemDto[];
  total: number;
  page: number;
  limit: CaseDocumentPageLimit;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Input payload to create a new case document.
 * Requires an existing AssetReference created via the media upload workflow.
 */
export interface CreateCaseDocumentInput {
  caseId: string;
  assetReferenceId: string;
  documentType: CaseDocumentType;
  title: string;
  documentDate?: string | null;
  description?: string | null;
  exhibitNumber?: string | null;
  isConfidential?: boolean;
}

/**
 * Input payload to update an existing case document.
 * If assetReferenceId is provided, the document file is replaced safely.
 */
export interface UpdateCaseDocumentInput {
  title?: string;
  documentType?: CaseDocumentType;
  documentDate?: string | null;
  description?: string | null;
  exhibitNumber?: string | null;
  isConfidential?: boolean;
  assetReferenceId?: string;
}

/**
 * Response for document creation and update mutations.
 */
export interface CaseDocumentActionResponse {
  success: boolean;
  message: string;
  data: CaseDocumentItemDto;
}

/**
 * Response for document deletion.
 */
export interface CaseDocumentDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}
