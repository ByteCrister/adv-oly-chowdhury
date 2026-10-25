import type {
  CaseType,
  CaseStatus,
  CasePriority,
  CasePageLimit,
  CaseSortOption,
} from "@/const/case.const";

/**
 * Client summary attached to a Case DTO
 */
export interface CaseClientDto {
  id: string;
  clientNumber: string;
  name: string;
  organizationName: string | null;
  clientType: string;
  phone: string | null;
  email: string | null;
}

/**
 * Court summary attached to a Case DTO
 */
export interface CaseCourtDto {
  id: string;
  name: string;
  courtType: string;
  courtTypeLabel: string;
  district: string;
  roomOrHall: string | null;
  presidingJudgeTitle: string | null;
}

/**
 * Case item returned in paginated list responses
 */
export interface CaseListItemDto {
  id: string;
  internalReference: string;
  caseNumber: string | null;
  filingYear: number | null;
  title: string;
  caseType: CaseType;
  caseTypeLabel: string;
  caseCategory: string | null;
  courtId: string;
  court: CaseCourtDto | null;
  clientId: string;
  client: CaseClientDto | null;
  filingDate: string | null; // ISO 8601
  caseStatus: CaseStatus;
  caseStatusLabel: string;
  priority: CasePriority;
  priorityLabel: string;
  description: string | null;
  legalIssues: string | null;
  opposingCounsel: string | null;
  opposingParties: string[];
  nextHearingDate: string | null; // ISO 8601
  closedAt: string | null; // ISO 8601
  closureReason: string | null;
  hearingsCount: number;
  documentsCount: number;
  eventsCount: number;
  partiesCount: number;
  isDeletable: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full Case details DTO returned by GET /api/v1/cases/[id]
 */
export interface CaseDetailDto extends CaseListItemDto {
  counts: {
    hearings: number;
    documents: number;
    events: number;
    parties: number;
  };
}

/**
 * Live calculated aggregate statistics over the full filtered case dataset
 */
export interface CaseStatsDto {
  total: number;
  active: number;
  hearingStaged: number;
  argumentsPending: number;
  judgmentReserved: number;
  onHold: number;
  disposed: number;
  closed: number;
  draft: number;
  urgentPriority: number;
  highPriority: number;
}

/**
 * Paginated API response for GET /api/v1/cases
 */
export interface CasePaginationResponse {
  items: CaseListItemDto[];
  total: number;
  page: number;
  limit: CasePageLimit;
  totalPages: number;
  hasMore: boolean;
  stats: CaseStatsDto;
}

/**
 * Filter and query parameters accepted by GET /api/v1/cases
 */
export interface CaseFilterParams {
  search?: string;
  caseStatus?: CaseStatus | "ALL";
  caseType?: CaseType | "ALL";
  priority?: CasePriority | "ALL";
  courtId?: string | "ALL";
  clientId?: string | "ALL";
  filingYear?: number | string;
  startDate?: string | null;
  endDate?: string | null;
  sort?: CaseSortOption;
  page?: number;
  limit?: CasePageLimit;
}

/**
 * Payload required to create a new Case record
 */
export interface CreateCaseInput {
  internalReference?: string; // If omitted, sequentially generated (CASE-YYYY-XXXX)
  caseNumber?: string | null;
  filingYear?: number | null;
  title: string;
  caseType: CaseType;
  caseCategory?: string | null;
  courtId: string;
  clientId: string;
  filingDate?: string | null;
  caseStatus?: CaseStatus;
  priority?: CasePriority;
  description?: string | null;
  legalIssues?: string | null;
  opposingCounsel?: string | null;
  opposingParties?: string[];
}

/**
 * Payload for updating an existing Case record
 */
export interface UpdateCaseInput {
  internalReference?: string;
  caseNumber?: string | null;
  filingYear?: number | null;
  title?: string;
  caseType?: CaseType;
  caseCategory?: string | null;
  courtId?: string;
  clientId?: string;
  filingDate?: string | null;
  caseStatus?: CaseStatus;
  priority?: CasePriority;
  description?: string | null;
  legalIssues?: string | null;
  opposingCounsel?: string | null;
  opposingParties?: string[];
  closedAt?: string | null;
  closureReason?: string | null;
}

/**
 * Action response for POST and PATCH operations
 */
export interface CaseActionResponse {
  success: boolean;
  message: string;
  data: CaseDetailDto;
}

/**
 * Response for GET single case operation
 */
export interface CaseDetailResponse {
  success: boolean;
  message: string;
  data: CaseDetailDto;
}

/**
 * Response for DELETE operation
 */
export interface CaseDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}

