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
// Ensure models are registered in Mongoose schema cache for nested populate
import "@/db/models/Asset.model";
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

export interface RawCaseEventInput {
  _id?: unknown;
  id?: string;
  caseId?: unknown;
  eventType?: CaseEventType | string | null;
  title?: string | null;
  description?: string | null;
  eventDate?: Date | string | null;
  assetReferenceId?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

/**
 * Format a lean CaseEvent record into a type-safe CaseEventItemDto.
 */
export function formatCaseEventItem(
  doc: RawCaseEventInput,
  assetRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null
): CaseEventItemDto {
  const resolvedAssetRef =
    assetRef !== undefined
      ? assetRef
      : doc.assetReferenceId && typeof doc.assetReferenceId === "object"
      ? (doc.assetReferenceId as unknown as IAssetReferenceDocument & { assetId?: IAsset })
      : null;

  const asset =
    resolvedAssetRef?.assetId && typeof resolvedAssetRef.assetId === "object"
      ? resolvedAssetRef.assetId
      : null;

  const eventType = (doc.eventType as CaseEventType) || CASE_EVENT_TYPES.OTHER;

  const idStr = doc._id ? String(doc._id) : (doc.id as string) || "";
  const caseIdStr = doc.caseId ? String(doc.caseId) : "";
  const assetRefIdStr = resolvedAssetRef?._id
    ? String(resolvedAssetRef._id)
    : doc.assetReferenceId && typeof doc.assetReferenceId !== "object"
    ? String(doc.assetReferenceId)
    : null;

  return {
    id: idStr,
    caseId: caseIdStr,
    eventType,
    eventTypeLabel: CASE_EVENT_TYPE_LABELS[eventType] || eventType,
    title: (doc.title as string) || "",
    description: (doc.description as string) || null,
    eventDate: formatSafeIsoDate(doc.eventDate) || new Date().toISOString(),
    assetReferenceId: assetRefIdStr,
    attachment:
      resolvedAssetRef && asset
        ? {
            id: String(resolvedAssetRef._id),
            assetId: String(asset._id),
            originalFileName:
              resolvedAssetRef.originalFileName || asset.originalFilename || "Attachment",
            fileUrl: asset.secureUrl || "",
            publicId: asset.publicId || "",
            mimeType: asset.mimeType || "application/octet-stream",
            sizeBytes: typeof asset.bytes === "number" ? asset.bytes : 0,
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
        {
          $project: {
            _id: 0,
            total: 1,
            upcoming: 1,
            past: 1,
            today: 1,
            withAttachment: 1,
          },
        },
      ]),
      CaseEvent.find(filter)
        .select(
          "_id caseId eventType title description eventDate assetReferenceId createdAt updatedAt"
        )
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate<{
          assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "assetReferenceId",
          select: "_id originalFileName assetId",
          match: { deletedAt: null },
          populate: {
            path: "assetId",
            select: "_id secureUrl publicId originalFilename mimeType bytes",
          },
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
        const updatedRef = await AssetReference.findOneAndUpdate(
          {
            _id: assetRefObjectId,
            deletedAt: null,
          },
          {
            $set: {
              ownerType: ASSET_OWNER_TYPES.CASE_EVENT,
              ownerId: caseObjectId,
            },
          },
          { session: dbSession, select: "_id" }
        );

        if (!updatedRef) {
          throw ApiError.badRequest(
            "Referenced attachment does not exist or has been deleted."
          );
        }
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
        newValues: {
          caseId: eventDoc.caseId,
          eventType: eventDoc.eventType,
          title: eventDoc.title,
          description: eventDoc.description,
          eventDate: eventDoc.eventDate,
          assetReferenceId: eventDoc.assetReferenceId,
        },
        description: `Added event "${eventDoc.title}" to case`,
        session: dbSession,
      });

      return eventDoc;
    });

    const populated = await CaseEvent.findById(createdEvent._id)
      .select(
        "_id caseId eventType title description eventDate assetReferenceId createdAt updatedAt"
      )
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        select: "_id originalFileName assetId",
        match: { deletedAt: null },
        populate: {
          path: "assetId",
          select: "_id secureUrl publicId originalFilename mimeType bytes",
        },
      })
      .lean();

    if (!populated) {
      throw ApiError.internal("Failed to retrieve created case event.");
    }

    const itemDto = formatCaseEventItem(
      populated,
      populated.assetReferenceId as unknown as (IAssetReferenceDocument & {
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
