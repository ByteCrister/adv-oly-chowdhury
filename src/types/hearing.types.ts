import type {
  HearingStatus,
  HearingPageLimit,
  HearingSortOption,
} from "@/const/hearing.const";

/**
 * Case details attached to a hearing DTO
 */
export interface HearingCaseDto {
  id: string;
  internalReference: string;
  caseNumber: string | null;
  title: string;
  caseType: string;
  caseStatus: string;
  priority: string;
  filingDate: string | null;
  nextHearingDate: string | null;
}

/**
 * Client details attached to a hearing DTO (derived via case)
 */
export interface HearingClientDto {
  id: string;
  name: string;
  clientNumber: string;
  organizationName: string | null;
  clientType: string;
  phone: string | null;
  email: string | null;
}

/**
 * Court details attached to a hearing DTO
 */
export interface HearingCourtDto {
  id: string;
  name: string;
  courtType: string;
  courtTypeLabel: string;
  district: string;
  roomOrHall: string | null;
  address: string | null;
  presidingJudgeTitle: string | null;
}

/**
 * Hearing summary item returned in paginated list responses
 */
export interface HearingListItemDto {
  id: string;
  caseId: string;
  case: HearingCaseDto;
  client: HearingClientDto | null;
  courtId: string | null;
  court: HearingCourtDto | null;
  hearingDate: string; // ISO 8601
  startTime: string | null;
  hearingType: string | null;
  purpose: string | null;
  outcome: string | null;
  nextDate: string | null;
  status: HearingStatus;
  statusLabel: string;
  adjournmentReason: string | null;
  notes: string | null;
  isDeletable: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full Hearing details DTO returned by GET /api/v1/hearings/[id]
 */
export interface HearingDetailDto extends HearingListItemDto {
  documentsCount: number;
}

/**
 * Aggregated statistics for hearings matching the active search and filter conditions
 */
export interface HearingStatsDto {
  total: number;
  upcoming: number;
  past: number;
  today: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  adjourned: number;
  cancelled: number;
}

/**
 * Paginated API response for GET /api/v1/hearings
 */
export interface HearingPaginationResponse {
  items: HearingListItemDto[];
  total: number;
  page: number;
  limit: HearingPageLimit;
  totalPages: number;
  hasMore: boolean;
  stats: HearingStatsDto;
}

/**
 * Filter and query parameters accepted by GET /api/v1/hearings
 */
export interface HearingFilterParams {
  search?: string;
  status?: HearingStatus | "ALL";
  courtId?: string | "ALL";
  caseId?: string;
  clientId?: string;
  hearingType?: string | "ALL";
  startDate?: string | null;
  endDate?: string | null;
  sort?: HearingSortOption;
  page?: number;
  limit?: HearingPageLimit;
}

/**
 * Payload required to create a new Hearing record
 */
export interface CreateHearingInput {
  caseId: string;
  courtId?: string | null;
  hearingDate: string; // YYYY-MM-DD or ISO
  startTime?: string | null;
  hearingType?: string | null;
  purpose?: string | null;
  outcome?: string | null;
  nextDate?: string | null;
  status?: HearingStatus;
  adjournmentReason?: string | null;
  notes?: string | null;
}

/**
 * Payload for updating an existing Hearing record
 */
export interface UpdateHearingInput {
  caseId?: string;
  courtId?: string | null;
  hearingDate?: string;
  startTime?: string | null;
  hearingType?: string | null;
  purpose?: string | null;
  outcome?: string | null;
  nextDate?: string | null;
  status?: HearingStatus;
  adjournmentReason?: string | null;
  notes?: string | null;
}

/**
 * Action response for POST and PATCH operations
 */
export interface HearingActionResponse {
  success: boolean;
  message: string;
  data: HearingDetailDto;
}

/**
 * Response for DELETE operation
 */
export interface HearingDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}
