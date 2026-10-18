import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { sanitizeSearchParam, escapeRegex } from "@/lib/helpers/search.helper";
import Task from "@/db/models/Task.model";
import Case from "@/db/models/Case.model";
import Client from "@/db/models/Client.model";
import { COLLECTIONS } from "@/const/collection.const";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_SORT_OPTIONS,
  TASK_DEFAULT_PAGE_LIMIT,
  TASK_DUE_FILTERS,
  TaskPageLimit,
} from "@/const/task.const";
import {
  taskQueryFilterSchema,
  createTaskSchema,
} from "@/utils/zod/task.validation";
import type {
  TaskItemDto,
  TaskPaginationResponse,
  TaskActionResponse,
} from "@/types/task.types";
import ConnectDB from "@/db";

/**
 * Format raw populated task document into TaskItemDto
 */
function formatTaskItem(doc: Record<string, unknown>): TaskItemDto {
  const now = new Date();
  const dueAtDate = doc.dueAt ? new Date(doc.dueAt as Date) : null;
  const isCompleted = doc.status === TASK_STATUSES.COMPLETED;
  const isCancelled = doc.status === TASK_STATUSES.CANCELLED;
  const isOverdue = Boolean(dueAtDate && dueAtDate < now && !isCompleted && !isCancelled);

  const rawCase = doc.caseDetails as Record<string, unknown> | null | undefined;
  const rawClient = doc.clientDetails as Record<string, unknown> | null | undefined;

  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    title: (doc.title as string) || "Untitled Task",
    description: (doc.description as string) || null,
    status: (doc.status as TaskItemDto["status"]) || TASK_STATUSES.TODO,
    priority: (doc.priority as TaskItemDto["priority"]) || TASK_PRIORITIES.NORMAL,
    dueAt: dueAtDate ? dueAtDate.toISOString() : null,
    completedAt: doc.completedAt ? new Date(doc.completedAt as Date).toISOString() : null,
    isOverdue,
    caseId: doc.caseId ? (doc.caseId as mongoose.Types.ObjectId).toString() : null,
    caseDetails: rawCase?._id
      ? {
          id: (rawCase._id as mongoose.Types.ObjectId).toString(),
          title: (rawCase.title as string) || "Untitled Case",
          caseNumber: (rawCase.caseNumber as string) || null,
          internalReference: (rawCase.internalReference as string) || "",
          caseStatus: (rawCase.caseStatus as string) || undefined,
        }
      : null,
    clientId: doc.clientId ? (doc.clientId as mongoose.Types.ObjectId).toString() : null,
    clientDetails: rawClient?._id
      ? {
          id: (rawClient._id as mongoose.Types.ObjectId).toString(),
          name: (rawClient.name as string) || "Unknown Client",
          clientNumber: (rawClient.clientNumber as string) || "",
          organizationName: (rawClient.organizationName as string) || null,
          phone: (rawClient.phone as string) || null,
        }
      : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt as Date).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as Date).toISOString() : "",
  };
}

/**
 * GET /api/v1/tasks
 *
 * Query tasks with search, status, priority, case, client, due date filters,
 * sorting, server-side pagination, and filter-aware aggregate statistics.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Authentication required");
  }

  await ConnectDB();

  const { searchParams } = new URL(req.url);

  const rawParams = {
    search: sanitizeSearchParam(searchParams.get("search")),
    status: searchParams.get("status") || undefined,
    priority: searchParams.get("priority") || undefined,
    caseId: searchParams.get("caseId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    dueFilter: searchParams.get("dueFilter") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || TASK_SORT_OPTIONS.DUE_DATE_ASC,
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || TASK_DEFAULT_PAGE_LIMIT,
  };

  const parsed = taskQueryFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
  }

  const {
    search,
    status,
    priority,
    caseId,
    clientId,
    dueFilter,
    startDate,
    endDate,
    sort,
    page,
    limit,
  } = parsed.data;

  // Active records filter: strictly exclude soft-deleted tasks
  const filter: Record<string, unknown> = {
    deletedAt: null,
  };

  // Status Filter
  if (status && status !== "ALL") {
    filter.status = status;
  }

  // Priority Filter
  if (priority && priority !== "ALL") {
    filter.priority = priority;
  }

  // Relationship Filters
  if (caseId) {
    filter.caseId = new mongoose.Types.ObjectId(caseId);
  }

  if (clientId) {
    filter.clientId = new mongoose.Types.ObjectId(clientId);
  }

  // Due Date & Deadline Filters
  const now = new Date();
  if (dueFilter && dueFilter !== TASK_DUE_FILTERS.ALL) {
    switch (dueFilter) {
      case TASK_DUE_FILTERS.OVERDUE:
        filter.dueAt = { $ne: null, $lt: now };
        filter.status = { $nin: [TASK_STATUSES.COMPLETED, TASK_STATUSES.CANCELLED] };
        break;
      case TASK_DUE_FILTERS.TODAY: {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        filter.dueAt = { $gte: startOfToday, $lte: endOfToday };
        break;
      }
      case TASK_DUE_FILTERS.THIS_WEEK: {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        filter.dueAt = { $gte: startOfToday, $lte: endOfWeek };
        break;
      }
      case TASK_DUE_FILTERS.NEXT_7_DAYS: {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const next7Days = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        filter.dueAt = { $gte: startOfToday, $lte: next7Days };
        break;
      }
      case TASK_DUE_FILTERS.NO_DUE_DATE:
        filter.dueAt = null;
        break;
    }
  } else if (startDate || endDate) {
    const dateQuery: Record<string, Date> = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    filter.dueAt = dateQuery;
  }

  // Intelligent Contextual Search across Task title, description, and related Case & Client
  if (search?.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");

    const [matchingCases, matchingClients] = await Promise.all([
      Case.find({
        deletedAt: null,
        $or: [
          { title: regex },
          { caseNumber: regex },
          { internalReference: regex },
        ],
      })
        .select("_id")
        .limit(25)
        .lean(),
      Client.find({
        deletedAt: null,
        $or: [
          { name: regex },
          { clientNumber: regex },
          { organizationName: regex },
        ],
      })
        .select("_id")
        .limit(25)
        .lean(),
    ]);

    const caseIds = matchingCases.map((c) => c._id);
    const clientIds = matchingClients.map((c) => c._id);

    filter.$or = [
      { title: regex },
      { description: regex },
      ...(caseIds.length > 0 ? [{ caseId: { $in: caseIds } }] : []),
      ...(clientIds.length > 0 ? [{ clientId: { $in: clientIds } }] : []),
    ];
  }

  // Sorting definition
  let sortStage: Record<string, 1 | -1> = { hasDueAt: 1, dueAt: 1, createdAt: -1 };

  switch (sort) {
    case TASK_SORT_OPTIONS.DUE_DATE_ASC:
      // Due soonest first, tasks with no due date placed at the end
      sortStage = { hasDueAt: 1, dueAt: 1, createdAt: -1 };
      break;
    case TASK_SORT_OPTIONS.DUE_DATE_DESC:
      sortStage = { dueAt: -1, createdAt: -1 };
      break;
    case TASK_SORT_OPTIONS.NEWEST:
      sortStage = { createdAt: -1 };
      break;
    case TASK_SORT_OPTIONS.OLDEST:
      sortStage = { createdAt: 1 };
      break;
    case TASK_SORT_OPTIONS.PRIORITY_DESC:
      sortStage = { priorityOrder: -1, hasDueAt: 1, dueAt: 1 };
      break;
    case TASK_SORT_OPTIONS.PRIORITY_ASC:
      sortStage = { priorityOrder: 1, hasDueAt: 1, dueAt: 1 };
      break;
    case TASK_SORT_OPTIONS.TITLE_ASC:
      sortStage = { title: 1 };
      break;
    case TASK_SORT_OPTIONS.TITLE_DESC:
      sortStage = { title: -1 };
      break;
  }

  const skip = (page - 1) * limit;

  // Single MongoDB aggregation pipeline: executes paginated list query
  // and filter-aware aggregate statistics simultaneously on the filtered dataset.
  const [result] = await Task.aggregate<{
    items: Array<Record<string, unknown>>;
    stats: Array<{
      total: number;
      todo: number;
      inProgress: number;
      completed: number;
      overdue: number;
      urgent: number;
      high: number;
    }>;
  }>([
    { $match: filter },
    {
      $addFields: {
        priorityOrder: {
          $switch: {
            branches: [
              { case: { $eq: ["$priority", TASK_PRIORITIES.URGENT] }, then: 4 },
              { case: { $eq: ["$priority", TASK_PRIORITIES.HIGH] }, then: 3 },
              { case: { $eq: ["$priority", TASK_PRIORITIES.NORMAL] }, then: 2 },
              { case: { $eq: ["$priority", TASK_PRIORITIES.LOW] }, then: 1 },
            ],
            default: 0,
          },
        },
        hasDueAt: {
          $cond: [{ $eq: ["$dueAt", null] }, 1, 0],
        },
      },
    },
    {
      $facet: {
        items: [
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: COLLECTIONS.CASES,
              localField: "caseId",
              foreignField: "_id",
              as: "caseDetails",
            },
          },
          {
            $lookup: {
              from: COLLECTIONS.CLIENTS,
              localField: "clientId",
              foreignField: "_id",
              as: "clientDetails",
            },
          },
          {
            $unwind: {
              path: "$caseDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$clientDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        stats: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              todo: {
                $sum: {
                  $cond: [{ $eq: ["$status", TASK_STATUSES.TODO] }, 1, 0],
                },
              },
              inProgress: {
                $sum: {
                  $cond: [{ $eq: ["$status", TASK_STATUSES.IN_PROGRESS] }, 1, 0],
                },
              },
              completed: {
                $sum: {
                  $cond: [{ $eq: ["$status", TASK_STATUSES.COMPLETED] }, 1, 0],
                },
              },
              overdue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$dueAt", null] },
                        { $lt: ["$dueAt", now] },
                        { $ne: ["$status", TASK_STATUSES.COMPLETED] },
                        { $ne: ["$status", TASK_STATUSES.CANCELLED] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              urgent: {
                $sum: {
                  $cond: [{ $eq: ["$priority", TASK_PRIORITIES.URGENT] }, 1, 0],
                },
              },
              high: {
                $sum: {
                  $cond: [{ $eq: ["$priority", TASK_PRIORITIES.HIGH] }, 1, 0],
                },
              },
            },
          },
        ],
      },
    },
  ]);

  const rawStats = result?.stats?.[0] || {
    total: 0,
    todo: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    urgent: 0,
    high: 0,
  };

  const total = rawStats.total ?? 0;
  const items: TaskItemDto[] = (result?.items ?? []).map(formatTaskItem);

  const response: TaskPaginationResponse = {
    items,
    total,
    page,
    limit: limit as TaskPageLimit,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: page * limit < total,
    stats: {
      total,
      todo: rawStats.todo ?? 0,
      inProgress: rawStats.inProgress ?? 0,
      completed: rawStats.completed ?? 0,
      overdue: rawStats.overdue ?? 0,
      urgent: rawStats.urgent ?? 0,
      high: rawStats.high ?? 0,
    },
  };

  return NextResponse.json(response, { status: 200 });
});

/**
 * POST /api/v1/tasks
 *
 * Create a new task with relationship validation and auto-linking
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Authentication required");
  }

  await ConnectDB();

  const body = await req.json().catch(() => ({}));
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid task input", parsed.error.flatten().fieldErrors);
  }

  const {
    title,
    description,
    status,
    priority,
    dueAt,
    caseId,
    clientId,
  } = parsed.data;

  let resolvedClientId = clientId ? new mongoose.Types.ObjectId(clientId) : null;
  const resolvedCaseId = caseId ? new mongoose.Types.ObjectId(caseId) : null;

  // Validate Case Relationship
  if (resolvedCaseId) {
    const caseDoc = await Case.findOne({
      _id: resolvedCaseId,
      deletedAt: null,
    }).select("_id clientId title caseNumber internalReference caseStatus");

    if (!caseDoc) {
      throw ApiError.badRequest("Selected case does not exist or has been deleted");
    }

    // Auto-link or verify Client Relationship
    if (!resolvedClientId && caseDoc.clientId) {
      resolvedClientId = caseDoc.clientId as mongoose.Types.ObjectId;
    }
  }

  // Validate Client Relationship
  if (resolvedClientId) {
    const clientDoc = await Client.findOne({
      _id: resolvedClientId,
      deletedAt: null,
    }).select("_id name clientNumber organizationName phone");

    if (!clientDoc) {
      throw ApiError.badRequest("Selected client does not exist or has been deleted");
    }
  }

  const completedAt = status === TASK_STATUSES.COMPLETED ? new Date() : null;

  const newTask = await Task.create({
    title,
    description: description?.trim() || null,
    status,
    priority,
    dueAt: dueAt ? new Date(dueAt) : null,
    caseId: resolvedCaseId,
    clientId: resolvedClientId,
    completedAt,
    deletedAt: null,
  });

  // Populate related fields for immediate return
  const populatedTask = await Task.findById(newTask._id)
    .populate("caseId", "title caseNumber internalReference caseStatus")
    .populate("clientId", "name clientNumber organizationName phone")
    .lean();

  if (!populatedTask) {
    throw ApiError.internal("Failed to retrieve created task");
  }

  const formattedDoc = {
    ...populatedTask,
    caseDetails: populatedTask.caseId,
    clientDetails: populatedTask.clientId,
    caseId: populatedTask.caseId
      ? ((populatedTask.caseId as unknown as Record<string, unknown>)._id as mongoose.Types.ObjectId)
      : null,
    clientId: populatedTask.clientId
      ? ((populatedTask.clientId as unknown as Record<string, unknown>)._id as mongoose.Types.ObjectId)
      : null,
  };

  const response: TaskActionResponse = {
    success: true,
    message: "Task created successfully",
    data: formatTaskItem(formattedDoc as unknown as Record<string, unknown>),
  };

  return NextResponse.json(response, { status: 201 });
});
