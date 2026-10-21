import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import { Case } from "@/db/models/Case.model";
import { CaseEvent } from "@/db/models/CaseEvent.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  CASE_EVENT_DEFAULT_PAGE_LIMIT,
  CASE_EVENT_PAGE_LIMITS,
  CASE_EVENT_SORT_OPTIONS,
  CASE_EVENT_TYPE_LABELS,
  CASE_EVENT_TYPES,
  CaseEventPageLimit,
  CaseEventSortOption,
  CaseEventType,
} from "@/const/case-event.const";
import {
  createCaseEventSchema,
  caseEventQueryFilterSchema,
} from "@/utils/zod/case-event.validation";
import { formatSafeIsoDate } from "@/app/api/v1/cases/route";
import type {
  CaseEventItemDto,
  CaseEventPaginationResponse,
  CaseEventStatsDto,
  CaseEventActionResponse,
} from "@/types/case-event.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Format a lean CaseEvent record into a type-safe CaseEventItemDto.
 */
export function formatCaseEventItem(
  doc: Record<string, unknown>,
  assetRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null
): CaseEventItemDto {
  const asset = assetRef?.assetId;
  const eventType = (doc.eventType as CaseEventType) || CASE_EVENT_TYPES.OTHER;

  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    caseId: (doc.caseId as mongoose.Types.ObjectId).toString(),
    eventType,
    eventTypeLabel: CASE_EVENT_TYPE_LABELS[eventType] || eventType,
    title: doc.title as string,
    description: (doc.description as string) || null,
    eventDate: formatSafeIsoDate(doc.eventDate) || new Date().toISOString(),
    assetReferenceId: assetRef?._id
      ? assetRef._id.toString()
      : doc.assetReferenceId
      ? String(doc.assetReferenceId)
      : null,
    attachment:
      assetRef && asset
        ? {
            id: (assetRef._id as mongoose.Types.ObjectId).toString(),
            assetId: String(asset._id),
            originalFileName:
              assetRef.originalFileName || asset.originalFilename || "Attachment",
            fileUrl: asset.secureUrl || "",
            publicId: asset.publicId || "",
            mimeType: asset.mimeType || "application/octet-stream",
            sizeBytes: asset.bytes || 0,
          }
        : null,
    createdAt: formatSafeIsoDate(doc.createdAt) || new Date().toISOString(),
    updatedAt: formatSafeIsoDate(doc.updatedAt) || new Date().toISOString(),
  };
}

/**
 * GET /api/v1/cases/[id]/events
 *
 * Case-scoped retrieval of chronological events, support search, sorting,
 * pagination, and aggregate statistics strictly matching the filter.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const caseExists = await Case.exists({ _id: caseObjectId, deletedAt: null });
    if (!caseExists) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    const { searchParams } = new URL(req.url);

    // Validate limit parameter if provided
    const rawLimit = searchParams.get("limit");
    if (rawLimit !== null) {
      const parsedLimit = parseInt(rawLimit, 10);
      if (!CASE_EVENT_PAGE_LIMITS.includes(parsedLimit as CaseEventPageLimit)) {
        throw ApiError.badRequest(
          `Invalid page limit "${rawLimit}". Allowed page limits are: ${CASE_EVENT_PAGE_LIMITS.join(", ")}`
        );
      }
    }

    const rawParams = {
      search: sanitizeSearchParam(searchParams.get("search")),
      eventType: searchParams.get("eventType") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sort: searchParams.get("sort") || CASE_EVENT_SORT_OPTIONS.DATE_DESC,
      page: searchParams.get("page") || 1,
      limit: rawLimit ? parseInt(rawLimit, 10) : CASE_EVENT_DEFAULT_PAGE_LIMIT,
    };

    const parsed = caseEventQueryFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }

    const { search, eventType, startDate, endDate, sort, page, limit } = parsed.data;

    // Strict case-scoped filter
    const filter: Record<string, unknown> = {
      caseId: caseObjectId,
    };

    if (eventType && eventType !== "ALL") {
      filter.eventType = eventType;
    }

    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
      filter.eventDate = dateQuery;
    }

    if (search) {
      const searchRegex = buildSearchRegex(search);
      if (searchRegex) {
        filter.$or = [{ title: searchRegex }, { description: searchRegex }];
      }
    }

    const sortMap: Record<CaseEventSortOption, Record<string, 1 | -1>> = {
      [CASE_EVENT_SORT_OPTIONS.DATE_DESC]: { eventDate: -1 },
      [CASE_EVENT_SORT_OPTIONS.DATE_ASC]: { eventDate: 1 },
      [CASE_EVENT_SORT_OPTIONS.NEWEST]: { createdAt: -1 },
      [CASE_EVENT_SORT_OPTIONS.OLDEST]: { createdAt: 1 },
    };

    const sortOption = sortMap[sort as CaseEventSortOption] || { eventDate: -1 };
    const skip = (page - 1) * limit;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Parallel aggregation strictly within parent case scope
    const [statsAggResult, events] = await Promise.all([
      CaseEvent.aggregate<{
        total: number;
        upcoming: number;
        past: number;
        today: number;
        withAttachment: number;
      }>([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            upcoming: {
              $sum: { $cond: [{ $gt: ["$eventDate", endOfToday] }, 1, 0] },
            },
            past: {
              $sum: { $cond: [{ $lt: ["$eventDate", startOfToday] }, 1, 0] },
            },
            today: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$eventDate", startOfToday] },
                      { $lte: ["$eventDate", endOfToday] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            withAttachment: {
              $sum: {
                $cond: [{ $ne: ["$assetReferenceId", null] }, 1, 0],
              },
            },
          },
        },
      ]),
      CaseEvent.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          populate: { path: "assetId" },
        })
        .lean(),
    ]);

    const rawStats = statsAggResult[0];
    const total = rawStats?.total ?? 0;

    const stats: CaseEventStatsDto = {
      total,
      upcoming: rawStats?.upcoming ?? 0,
      past: rawStats?.past ?? 0,
      today: rawStats?.today ?? 0,
      withAttachment: rawStats?.withAttachment ?? 0,
    };

    const items: CaseEventItemDto[] = events.map((ev) => {
      const assetRef = ev.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }) | null;
      return formatCaseEventItem(ev, assetRef);
    });

    const response: CaseEventPaginationResponse = {
      items,
      total,
      page,
      limit: limit as CaseEventPageLimit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
      stats,
    };

    return NextResponse.json(response);
  }
);

/**
 * POST /api/v1/cases/[id]/events
 *
 * Create a new CaseEvent record associated with the specified case.
 */
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const caseExists = await Case.exists({ _id: caseObjectId, deletedAt: null });
    if (!caseExists) {
      throw ApiError.notFound("Case not found or has been archived.");
    }

    const body = await req.json();
    const payload = {
      ...body,
      caseId: id,
    };

    const validated = createCaseEventSchema.parse(payload);
    const assetRefObjectId = validated.assetReferenceId
      ? new mongoose.Types.ObjectId(validated.assetReferenceId)
      : null;

    const createdEvent = await withTransaction(async (dbSession) => {
      // 1. If attachment reference provided, verify and assign ownership inside session
      if (assetRefObjectId) {
        const existingRef = await AssetReference.findOne({
          _id: assetRefObjectId,
          deletedAt: null,
        }).session(dbSession);

        if (!existingRef) {
          throw ApiError.badRequest(
            "Referenced attachment does not exist or has been deleted."
          );
        }

        existingRef.ownerType = ASSET_OWNER_TYPES.CASE_EVENT;
        existingRef.ownerId = caseObjectId;
        await existingRef.save({ session: dbSession });
      }

      // 2. Create CaseEvent
      const [eventDoc] = await CaseEvent.create(
        [
          {
            caseId: caseObjectId,
            eventType: validated.eventType,
            title: validated.title.trim(),
            description: validated.description?.trim() || null,
            eventDate: new Date(validated.eventDate),
            assetReferenceId: assetRefObjectId,
          },
        ],
        { session: dbSession }
      );

      // 3. Record audit log for case event creation
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        entityType: AUDIT_ENTITY_TYPES.CASE_EVENT,
        entityId: eventDoc._id,
        oldValues: null,
        newValues: eventDoc.toObject(),
        description: `Added event "${eventDoc.title}" to case`,
        session: dbSession,
      });

      return eventDoc;
    });

    const populated = await CaseEvent.findById(createdEvent._id)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean();

    const itemDto = formatCaseEventItem(
      populated!,
      populated!.assetReferenceId as unknown as (IAssetReferenceDocument & {
        assetId: IAsset;
      }) | null
    );

    const response: CaseEventActionResponse = {
      success: true,
      message: `Event "${itemDto.title}" recorded successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response, { status: 201 });
  }
);
