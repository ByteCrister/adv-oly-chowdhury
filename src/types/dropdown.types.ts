import type { DropdownType } from "@/const/dropdown.const";

/**
 * Entity-specific metadata structures returned by the unified dropdown endpoint.
 */
export interface ClientDropdownMetadata {
  clientNumber: string | null;
  clientType: string | null;
  status: string | null;
  phone: string | null;
  organizationName: string | null;
}

export interface CourtDropdownMetadata {
  courtType: string | null;
  district: string | null;
  division: string | null;
  roomOrHall: string | null;
}

export interface CaseDropdownMetadata {
  caseNumber: string | null;
  internalReference: string | null;
  caseStatus: string | null;
  clientId: string | null;
  courtId: string | null;
  nextHearingDate: string | null;
}

export interface UserDropdownMetadata {
  email: string | null;
  title: string | null;
}

/**
 * Universal Dropdown Item representation for Select and Combobox UI components.
 */
export interface DropdownItem {
  id: string;
  name: string;
  subText?: string | null;
  date?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Query filter parameters supported by the unified dropdown API endpoint.
 */
export interface DropdownFilterParams {
  type: DropdownType;
  search?: string;
  clientId?: string;
  courtId?: string;
  limit?: number;
}

/**
 * API response structure for dropdown endpoint.
 */
export interface DropdownApiResponse {
  success: boolean;
  type: DropdownType;
  items: DropdownItem[];
  total: number;
}
