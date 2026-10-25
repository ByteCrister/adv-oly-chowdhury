import type {
  PartyType,
  PartyRole,
  CasePartyPageLimit,
  CasePartySortOption,
} from "@/const/case-party.const";
import type { CaseClientDto } from "./case.types";

/**
 * Case party item DTO returned in queries
 */
export interface CasePartyItemDto {
  id: string;
  caseId: string;
  clientId: string | null;
  client?: CaseClientDto | null;
  name: string;
  partyType: PartyType;
  partyTypeLabel: string;
  role: PartyRole;
  roleLabel: string;
  address: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Aggregate stats for case parties
 */
export interface CasePartyStatsDto {
  total: number;
  plaintiff: number;
  defendant: number;
  petitioner: number;
  respondent: number;
  oppositeParty: number;
  witness: number;
  other: number;
}

/**
 * Filter parameters for querying parties in a case
 */
export interface CasePartyFilterParams {
  search?: string;
  role?: PartyRole | "ALL";
  partyType?: PartyType | "ALL";
  sort?: CasePartySortOption;
  page?: number;
  limit?: CasePartyPageLimit;
}

/**
 * Paginated API response for Case Parties
 */
export interface CasePartyPaginationResponse {
  items: CasePartyItemDto[];
  total: number;
  page: number;
  limit: CasePartyPageLimit;
  totalPages: number;
  hasMore: boolean;
  stats: CasePartyStatsDto;
}

/**
 * Input payload for creating a new Case Party
 */
export interface CreateCasePartyInput {
  caseId?: string;
  clientId?: string | null;
  name: string;
  partyType: PartyType;
  role: PartyRole;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
}

/**
 * Input payload for updating an existing Case Party
 */
export interface UpdateCasePartyInput {
  clientId?: string | null;
  name?: string;
  partyType?: PartyType;
  role?: PartyRole;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
}

/**
 * Action response for POST and PATCH operations
 */
export interface CasePartyActionResponse {
  success: boolean;
  message: string;
  data: CasePartyItemDto;
}

/**
 * Response for GET single party operation
 */
export interface CasePartyDetailResponse {
  success: boolean;
  data: CasePartyItemDto;
}

/**
 * Response for DELETE operation
 */
export interface CasePartyDeleteResponse {
  success: boolean;
  message: string;
  id: string;
}
