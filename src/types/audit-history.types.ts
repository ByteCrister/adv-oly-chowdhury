import {
  AuditAction,
  AuditEntityType,
  AuditPageLimit,
  AuditSortOption,
} from "@/const/audit-log.const";

export interface AuditLogItemDto {
  id: string;
  userId?: string | null;
  action: AuditAction;
  actionLabel: string;
  entityType: AuditEntityType;
  entityTypeLabel: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuditHistoryFilterParams {
  action?: AuditAction | "ALL";
  date?: string;
  startDate?: string;
  endDate?: string;
  sort?: AuditSortOption;
  page?: number;
  limit?: AuditPageLimit;
}

export interface AuditHistoryPaginationResponse {
  success: boolean;
  items: AuditLogItemDto[];
  total: number;
  page: number;
  limit: AuditPageLimit;
  totalPages: number;
  hasMore: boolean;
}
