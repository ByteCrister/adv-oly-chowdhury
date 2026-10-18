import type {
  CaseEventType,
  CaseEventPageLimit,
  CaseEventSortOption,
} from "@/const/case-event.const";

/**
 * Optional attachment metadata attached to a CaseEvent
 */
export interface CaseEventAttachmentDto {
  id: string; // AssetReference._id
  assetId: string;
  originalFileName: string;
  fileUrl: string;
  publicId: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Case event item DTO returned in queries
 */
export interface CaseEventItemDto {
  id: string;
  caseId: string;
  eventType: CaseEventType;
  eventTypeLabel: string;
  title: string;
  description: string | null;
  eventDate: string; // ISO 8601
  assetReferenceId: string | null;
  attachment?: CaseEventAttachmentDto | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Aggregate stats for case events
 */
export interface CaseEventStatsDto {
  total: number;
  upcoming: number;
  past: number;
  today: number;
  withAttachment: number;
}

/**
 * Filter parameters for querying events in a case
 */
export interface CaseEventFilterParams {
  search?: string;
  eventType?: CaseEventType | "ALL";
  startDate?: string | null;
  endDate?: string | null;
  sort?: CaseEventSortOption;
  page?: number;
  limit?: CaseEventPageLimit;
}

/**
 * Paginated API response for Case Events
 */
export interface CaseEventPaginationResponse {
  items: CaseEventItemDto[];
  total: number;
  page: number;
  limit: CaseEventPageLimit;
  totalPages: number;
  hasMore: boolean;
  stats: CaseEventStatsDto;
}

/**
 * Input payload for creating a new Case Event
 */
export interface CreateCaseEventInput {
  caseId?: string;
  eventType: CaseEventType;
  title: string;
  description?: string | null;
  eventDate: string; // YYYY-MM-DD or ISO
  assetReferenceId?: string | null;
}

/**
 * Input payload for updating an existing Case Event
 */
export interface UpdateCaseEventInput {
  eventType?: CaseEventType;
  title?: string;
  description?: string | null;
  eventDate?: string;
  assetReferenceId?: string | null;
}

/**
 * Action response for POST and PATCH operations
 */
export interface CaseEventActionResponse {
  success: boolean;
  message: string;
  data: CaseEventItemDto;
}

/**
 * Response for DELETE operation
 */
export interface CaseEventDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}
