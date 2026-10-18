import {
  DocumentEntityType,
  DocumentScope,
  DocumentPageLimit,
  DocumentSortOption,
  DOCUMENT_ENTITY_TYPES,
} from "@/const/document.const";

export type {
  DocumentEntityType,
  DocumentScope,
  DocumentPageLimit,
  DocumentSortOption,
};

/**
 * Unified Document Data Transfer Object
 * Represents either a CaseDocument or a ClientDocument in the unified management interface.
 */
export interface UnifiedDocumentItemDto {
  id: string; // Document _id
  entityType: DocumentEntityType; // "CASE" | "CLIENT"
  assetReferenceId: string;
  assetId: string;
  documentType: string;
  documentTypeLabel: string;
  title: string;
  documentDate: string | null;
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

  // Case-specific fields
  caseId?: string | null;
  caseDetails?: {
    id: string;
    title: string;
    caseNumber: string;
    internalReference: string;
    caseStatus?: string;
  } | null;
  description?: string | null;
  exhibitNumber?: string | null;
  isConfidential?: boolean;

  // Client-specific fields
  clientId?: string | null;
  clientDetails?: {
    id: string;
    name: string;
    clientNumber: string;
    organizationName?: string | null;
    phone?: string | null;
  } | null;
  expiryDate?: string | null;
  notes?: string | null;
}

/**
 * Chamber Document Vault Statistics DTO
 */
export interface DocumentStatsDto {
  totalActive: number;
  activeCaseDocs: number;
  activeClientDocs: number;
  recentCount: number;
  confidentialCount: number;
}

/**
 * Query filter parameters for the unified documents list.
 */
export interface DocumentFilterParams {
  scope?: DocumentScope;
  search?: string;
  documentType?: string;
  caseId?: string;
  clientId?: string;
  isConfidential?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  sort?: DocumentSortOption;
  page?: number;
  limit?: DocumentPageLimit;
}

/**
 * Paginated Unified Documents Response
 */
export interface DocumentPaginationResponse {
  items: UnifiedDocumentItemDto[];
  total: number;
  page: number;
  limit: DocumentPageLimit;
  totalPages: number;
  hasMore: boolean;
  stats: DocumentStatsDto;
}

/**
 * Input to create a Case Document via unified endpoints
 */
export interface CreateCaseDocumentUnifiedInput {
  entityType: typeof DOCUMENT_ENTITY_TYPES.CASE;
  caseId: string;
  assetReferenceId: string;
  documentType: string;
  title: string;
  documentDate?: string | null;
  description?: string | null;
  exhibitNumber?: string | null;
  isConfidential?: boolean;
}

/**
 * Input to create a Client Document via unified endpoints
 */
export interface CreateClientDocumentUnifiedInput {
  entityType: typeof DOCUMENT_ENTITY_TYPES.CLIENT;
  clientId: string;
  assetReferenceId: string;
  documentType: string;
  title: string;
  documentDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

export type CreateUnifiedCaseDocInput = Omit<CreateCaseDocumentUnifiedInput, "entityType">;
export type CreateUnifiedClientDocInput = Omit<CreateClientDocumentUnifiedInput, "entityType">;

export type CreateUnifiedDocumentInput =
  | CreateCaseDocumentUnifiedInput
  | CreateClientDocumentUnifiedInput;

/**
 * Unified metadata update payload
 */
export interface UpdateUnifiedDocumentInput {
  entityType: DocumentEntityType;
  title?: string;
  documentType?: string;
  documentDate?: string | null;
  assetReferenceId?: string;
  // Case fields
  description?: string | null;
  exhibitNumber?: string | null;
  isConfidential?: boolean;
  // Client fields
  expiryDate?: string | null;
  notes?: string | null;
}

/**
 * Unified mutation response
 */
export interface DocumentActionResponse {
  success: boolean;
  message: string;
  data: UnifiedDocumentItemDto;
}

/**
 * Unified delete response
 */
export interface DocumentDeleteResponse {
  success: boolean;
  message: string;
  id: string;
  entityType: DocumentEntityType;
}
