import type { DropdownType } from "@/const/dropdown.const";

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
