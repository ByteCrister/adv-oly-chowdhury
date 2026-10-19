import {
  CourtType,
  CourtPageLimit,
  CourtSortOption,
  BangladeshDivision,
} from "@/const/court.const";

/**
 * Raw document or lean query representation for formatting into CourtListItemDto.
 */
export interface CourtDocInput {
  _id?: unknown;
  id?: string;
  name?: string | null;
  courtType?: string | null;
  district?: string | null;
  division?: string | null;
  roomOrHall?: string | null;
  address?: string | null;
  presidingJudgeTitle?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

/**
 * Full Court Data Transfer Object returned in list and detail responses.
 * Contains all court properties and computed relation metadata.
 */
export interface CourtListItemDto {
  id: string;
  name: string;
  courtType: CourtType;
  courtTypeLabel: string;
  district: string;
  division: string | null;
  roomOrHall: string | null;
  address: string | null;
  presidingJudgeTitle: string | null;
  isActive: boolean;
  totalCases: number;
  totalHearings: number;
  totalAssets: number;
  isDeletable: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
  * Query parameters for filtering, searching, sorting, and paginating courts.
  */
export interface CourtFilterParams {
  search?: string;
  courtType?: CourtType | "ALL";
  district?: string | "ALL";
  division?: string | "ALL";
  isActive?: boolean | "ALL";
  startDate?: string | null;
  endDate?: string | null;
  sort?: CourtSortOption;
  page?: number;
  limit?: CourtPageLimit;
}

/**
  * Paginated API response structure for court listing.
  */
export interface CourtPaginationResponse {
  items: CourtListItemDto[];
  total: number;
  page: number;
  limit: CourtPageLimit;
  totalPages: number;
  hasMore: boolean;
}


/**
  * Payload required to create a new court.
  */
export interface CreateCourtInput {
  name: string;
  courtType: CourtType;
  district: string;
  division?: BangladeshDivision | string | null;
  roomOrHall?: string | null;
  address?: string | null;
  presidingJudgeTitle?: string | null;
  isActive?: boolean;
}

/**
  * Payload for updating an existing court.
  */
export interface UpdateCourtInput {
  name?: string;
  courtType?: CourtType;
  district?: string;
  division?: BangladeshDivision | string | null;
  roomOrHall?: string | null;
  address?: string | null;
  presidingJudgeTitle?: string | null;
  isActive?: boolean;
}

/**
  * Mutation response for Create and Update actions.
  */
export interface CourtActionResponse {
  success: boolean;
  message: string;
  data: CourtListItemDto;
}

/**
  * Response returned upon successful hard deletion of a court.
  */
export interface CourtDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}
