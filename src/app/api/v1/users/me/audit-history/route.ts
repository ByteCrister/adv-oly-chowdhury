import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { AuditLog } from "@/db/models/AuditLog.model";
import {
  AUDIT_SORT_OPTIONS,
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  AuditPageLimit,
} from "@/const/audit-log.const";
import { auditHistoryQuerySchema } from "@/utils/zod/audit.validation";
import type {
  AuditLogItemDto,
  AuditHistoryPaginationResponse,
} from "@/types/audit-history.types";

/**
 * GET /api/v1/users/me/audit-history
 *
 * Retrieves the authenticated user's audit log history.
 * Strictly scopes queries to the authenticated user ID.
 * Supports action-type filtering, single-date and date-range filtering,
 * timestamp sorting (newest first by default), and pagination (10, 20, 50, 100).
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

  const { searchParams } = new URL(req.url);

  const rawParams = {
    action: searchParams.get("action") || undefined,
    date: searchParams.get("date") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || AUDIT_SORT_OPTIONS.NEWEST,
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
  };

  const parsed = auditHistoryQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors
    );
  }

  const { action, date, startDate, endDate, sort, page, limit } = parsed.data;

  // Enforce strict user scoping: users can ONLY retrieve their own audit records
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const filter: Record<string, unknown> = {
    userId: userObjectId,
  };

  // Action type filter
  if (action && action !== "ALL") {
    filter.action = action;
  }

  // Date filtering: supports both single date and date range
  if (date && !startDate && !endDate) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  } else if (startDate || endDate) {
    const dateQuery: Record<string, Date> = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      dateQuery.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    filter.createdAt = dateQuery;
  }

  // Sorting: timestamp sorting, defaulting to newest first
  const sortStage: Record<string, 1 | -1> =
    sort === AUDIT_SORT_OPTIONS.OLDEST ? { createdAt: 1 } : { createdAt: -1 };

  const skip = (page - 1) * limit;

  // Execute count and paginated query concurrently
  const [total, records] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort(sortStage)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const items: AuditLogItemDto[] = records.map((doc) => ({
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    userId: doc.userId ? (doc.userId as mongoose.Types.ObjectId).toString() : null,
    action: doc.action,
    actionLabel: AUDIT_ACTION_LABELS[doc.action] || doc.action,
    entityType: doc.entityType,
    entityTypeLabel: AUDIT_ENTITY_LABELS[doc.entityType] || doc.entityType,
    entityId: (doc.entityId as mongoose.Types.ObjectId).toString(),
    oldValues: doc.oldValues ?? null,
    newValues: doc.newValues ?? null,
    description: doc.description ?? null,
    ipAddress: doc.ipAddress ?? null,
    userAgent: doc.userAgent ?? null,
    createdAt: (doc.createdAt as Date).toISOString(),
  }));

  const response: AuditHistoryPaginationResponse = {
    success: true,
    items,
    total,
    page,
    limit: limit as AuditPageLimit,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: page * limit < total,
  };

  return NextResponse.json(response, { status: 200 });
});
