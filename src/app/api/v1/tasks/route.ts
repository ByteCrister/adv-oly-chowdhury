import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { sanitizeSearchParam } from "@/lib/helpers/search.helper";
import {
  buildFuzzySearchPatterns,
  bucketScoredEntityIds,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  calculateTaskCaseMatchScore,
  calculateTaskClientMatchScore,
  matchTaskStatusAndPriority,
  buildTaskRelevanceStages,
  TaskCaseCandidate,
  TaskClientCandidate,
} from "@/lib/helpers/fuzzy-searching/task-fuzzy-search.helper";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import Task from "@/db/models/Task.model";
import Case from "@/db/models/Case.model";
import Client from "@/db/models/Client.model";
import { COLLECTIONS } from "@/const/collection.const";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_SORT_OPTIONS,
  TASK_DUE_FILTERS,
  TaskPriority,
  TaskStatus,
} from "@/const/task.const";
import {
  taskQueryFilterSchema,
  createTaskSchema,
} from "@/utils/zod/task.validation";
import type {
  TaskItemDto,
  TaskPaginationResponse,
  TaskActionResponse,
  TaskDocInput,
  RawTaskCaseInput,
  RawTaskClientInput,
} from "@/types/task.types";

/**
 * Format raw or populated task document into strongly-typed TaskItemDto.
 * Handles aggregation lookups, populated Mongoose documents, and lean objects.
 */
export function formatTaskItem(doc: TaskDocInput): TaskItemDto {
  const now = new Date();
  const dueAtDate = doc.dueAt ? new Date(doc.dueAt) : null;
  const isCompleted = doc.status === TASK_STATUSES.COMPLETED;
  const isCancelled = doc.status === TASK_STATUSES.CANCELLED;
  const isOverdue = Boolean(
    dueAtDate &&
      !isNaN(dueAtDate.getTime()) &&
      dueAtDate < now &&
      !isCompleted &&
      !isCancelled
  );

  // Extract raw case: check if caseDetails exists (from $lookup) or if caseId is populated object
  const rawCase: RawTaskCaseInput | null =
    doc.caseDetails && typeof doc.caseDetails === "object" && "_id" in doc.caseDetails
      ? doc.caseDetails
      : doc.caseId && typeof doc.caseId === "object" && "_id" in doc.caseId
      ? (doc.caseId as RawTaskCaseInput)
      : null;

  // Extract raw client: check if clientDetails exists (from $lookup) or if clientId is populated object
  const rawClient: RawTaskClientInput | null =
    doc.clientDetails && typeof doc.clientDetails === "object" && "_id" in doc.clientDetails
      ? doc.clientDetails
      : doc.clientId && typeof doc.clientId === "object" && "_id" in doc.clientId
      ? (doc.clientId as RawTaskClientInput)
      : null;

  // Determine scalar caseId string
  const caseIdStr: string | null = rawCase?._id
    ? String(rawCase._id)
    : doc.caseId && typeof doc.caseId !== "object"
    ? String(doc.caseId)
    : doc.caseId instanceof mongoose.Types.ObjectId
    ? doc.caseId.toString()
    : null;

  // Determine scalar clientId string
  const clientIdStr: string | null = rawClient?._id
    ? String(rawClient._id)
    : doc.clientId && typeof doc.clientId !== "object"
    ? String(doc.clientId)
    : doc.clientId instanceof mongoose.Types.ObjectId
    ? doc.clientId.toString()
    : null;

  const idStr = doc._id ? String(doc._id) : (doc.id || "");

  return {
    id: idStr,
    title: doc.title || "Untitled Task",
    description: doc.description || null,
    status: (doc.status as TaskStatus) || TASK_STATUSES.TODO,
    priority: (doc.priority as TaskPriority) || TASK_PRIORITIES.NORMAL,
    dueAt: dueAtDate && !isNaN(dueAtDate.getTime()) ? dueAtDate.toISOString() : null,
    completedAt: doc.completedAt ? new Date(doc.completedAt).toISOString() : null,
    isOverdue,
    caseId: caseIdStr,
    caseDetails: rawCase?._id
      ? {
          id: String(rawCase._id),
          title: rawCase.title || "Untitled Case",
          caseNumber: rawCase.caseNumber || null,
          internalReference: rawCase.internalReference || "",
          caseStatus: rawCase.caseStatus || undefined,
        }
      : null,
    clientId: clientIdStr,
    clientDetails: rawClient?._id
      ? {
          id: String(rawClient._id),
          name: rawClient.name || "Unknown Client",
          clientNumber: rawClient.clientNumber || "",
          organizationName: rawClient.organizationName || null,
          phone: rawClient.phone || null,
        }
      : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

/**
 * GET /api/v1/tasks
 *
 * Query tasks with search, status, priority, case, client, due date filters,
 * sorting, server-side pagination, and filter-aware aggregate statistics.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

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
    sort: searchParams.get("sort") || undefined,
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
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
        // Ensure overdue filter doesn't override an existing valid status or mismatch completed/cancelled
        if (filter.status) {
          if (filter.status === TASK_STATUSES.COMPLETED || filter.status === TASK_STATUSES.CANCELLED) {
            filter.status = "__UNMATCHABLE__";
          }
        } else {
          filter.status = { $nin: [TASK_STATUSES.COMPLETED, TASK_STATUSES.CANCELLED] };
        }
        break;
      case TASK_DUE_FILTERS.TODAY: {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        filter.dueAt = { $gte: startOfToday, $lte: endOfToday };
        break;
      }
      case TASK_DUE_FILTERS.THIS_WEEK: {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
        const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
        const endOfWeek = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + daysUntilSaturday,
          23,
          59,
          59,
          999
        );
        filter.dueAt = { $gte: startOfToday, $lte: endOfWeek };
        break;
      }
      case TASK_DUE_FILTERS.NEXT_7_DAYS: {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const next7Days = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 7,
          23,
          59,
          59,
          999
        );
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

  // Search Filter: typo-tolerant fuzzy search across task fields,
  // case numbers/titles/categories, client names/numbers/contacts, and priority/status
  // with relevance-based ranking
  let relevanceStages: mongoose.PipelineStage[] = [];
  let isSearching = false;

  const searchPatterns = buildFuzzySearchPatterns(search);
  if (searchPatterns) {
    isSearching = true;

    // 1. Evaluate whether query matches task status or priority values / labels
    const { matchedStatuses, matchedPriorities } = matchTaskStatusAndPriority(
      searchPatterns.sanitizedQuery
    );

    // 2. Find matching clients with bounded candidate limits
    const clientSearchFilter: Record<string, unknown> = {
      deletedAt: null,
      $or: [
        { name: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { clientNumber: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { organizationName: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { phone: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { alternatePhone: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
        { email: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      ],
    };

    if (clientId && clientId !== "ALL") {
      clientSearchFilter._id = new mongoose.Types.ObjectId(clientId);
    }

    const matchingClients = await Client.find(clientSearchFilter, {
      _id: 1,
      name: 1,
      clientNumber: 1,
      organizationName: 1,
      phone: 1,
      alternatePhone: 1,
      email: 1,
    })
      .limit(500)
      .lean<TaskClientCandidate[]>();

    // Score client candidates
    const clientScores = new Map<string, number>();
    const matchingClientIds: mongoose.Types.ObjectId[] = [];
    for (const cl of matchingClients) {
      const score = calculateTaskClientMatchScore(cl, searchPatterns.sanitizedQuery);
      if (score > 0) {
        clientScores.set(String(cl._id), score);
        matchingClientIds.push(cl._id);
      }
    }

    const clientBuckets = bucketScoredEntityIds(clientScores);

    // 3. Find matching cases (directly or via matched clients)
    const caseSearchConditions: Record<string, unknown>[] = [
      { title: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { caseNumber: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { internalReference: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { description: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { legalIssues: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { opposingCounsel: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { opposingParties: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { caseCategory: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
    ];

    if (matchingClientIds.length > 0) {
      caseSearchConditions.push({ clientId: { $in: matchingClientIds } });
    }

    const caseSearchFilter: Record<string, unknown> = {
      deletedAt: null,
      $or: caseSearchConditions,
    };

    if (caseId && caseId !== "ALL") {
      caseSearchFilter._id = new mongoose.Types.ObjectId(caseId);
    } else if (clientId && clientId !== "ALL") {
      caseSearchFilter.clientId = new mongoose.Types.ObjectId(clientId);
    }

    const matchingCases = await Case.find(caseSearchFilter, {
      _id: 1,
      title: 1,
      caseNumber: 1,
      internalReference: 1,
      caseCategory: 1,
      opposingCounsel: 1,
      opposingParties: 1,
      description: 1,
      legalIssues: 1,
      clientId: 1,
    })
      .limit(1000)
      .lean<TaskCaseCandidate[]>();

    // Score case candidates separating direct case matches and client-inherited matches
    const caseDirectScoreMap = new Map<string, number>();
    const caseClientScoreMap = new Map<string, number>();

    for (const c of matchingCases) {
      const scores = calculateTaskCaseMatchScore(
        c,
        searchPatterns.sanitizedQuery,
        clientScores
      );
      if (scores.directScore > 0) {
        caseDirectScoreMap.set(String(c._id), scores.directScore);
      }
      if (scores.clientScore > 0) {
        caseClientScoreMap.set(String(c._id), scores.clientScore);
      }
    }

    const caseBuckets = bucketScoredEntityIds(caseDirectScoreMap);
    const inheritedClientCaseBuckets = bucketScoredEntityIds(caseClientScoreMap);

    // 4. Construct task-level search conditions
    const directConditions: Record<string, unknown>[] = [
      { title: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
      { description: { $regex: searchPatterns.fuzzyPattern, $options: "i" } },
    ];

    if (matchedStatuses.length > 0) {
      directConditions.push({ status: { $in: matchedStatuses.map((s) => s.status) } });
    }

    if (matchedPriorities.length > 0) {
      directConditions.push({ priority: { $in: matchedPriorities.map((p) => p.priority) } });
    }

    // Combine direct case IDs and inherited case IDs for task filtering
    const allRelevantCaseIds = [
      ...caseBuckets.allMatchingIds,
      ...inheritedClientCaseBuckets.allMatchingIds,
    ];
    if (allRelevantCaseIds.length > 0) {
      directConditions.push({ caseId: { $in: allRelevantCaseIds } });
    }

    if (clientBuckets.allMatchingIds.length > 0) {
      directConditions.push({ clientId: { $in: clientBuckets.allMatchingIds } });
    }

    filter.$or = directConditions;

    relevanceStages = buildTaskRelevanceStages(
      caseBuckets,
      clientBuckets,
      inheritedClientCaseBuckets,
      searchPatterns,
      matchedStatuses,
      matchedPriorities
    );
  }

  // Determine sorting strategy and whether computed fields are required
  let sortStage: Record<string, 1 | -1> = { hasDueAt: 1, dueAt: 1, createdAt: -1 };
  let needsPriorityOrder = false;
  let needsHasDueAt = false;

  switch (sort) {
    case TASK_SORT_OPTIONS.DUE_DATE_ASC:
      // Due soonest first, tasks with no due date placed at the end
      sortStage = { hasDueAt: 1, dueAt: 1, createdAt: -1 };
      needsHasDueAt = true;
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
      needsPriorityOrder = true;
      needsHasDueAt = true;
      break;
    case TASK_SORT_OPTIONS.PRIORITY_ASC:
      sortStage = { priorityOrder: 1, hasDueAt: 1, dueAt: 1 };
      needsPriorityOrder = true;
      needsHasDueAt = true;
      break;
    case TASK_SORT_OPTIONS.TITLE_ASC:
      sortStage = { title: 1 };
      break;
    case TASK_SORT_OPTIONS.TITLE_DESC:
      sortStage = { title: -1 };
      break;
  }

  const skip = (page - 1) * limit;

  // Build items pipeline: computed fields are only injected when required by sorting,
  // preventing unneeded work on documents and avoiding pre-facet computation overhead.
  const itemsPipeline: mongoose.PipelineStage.FacetPipelineStage[] = [];

  if (needsPriorityOrder || needsHasDueAt) {
    const addFieldsStage: Record<string, unknown> = {};
    if (needsPriorityOrder) {
      addFieldsStage.priorityOrder = {
        $switch: {
          branches: [
            { case: { $eq: ["$priority", TASK_PRIORITIES.URGENT] }, then: 4 },
            { case: { $eq: ["$priority", TASK_PRIORITIES.HIGH] }, then: 3 },
            { case: { $eq: ["$priority", TASK_PRIORITIES.NORMAL] }, then: 2 },
            { case: { $eq: ["$priority", TASK_PRIORITIES.LOW] }, then: 1 },
          ],
          default: 0,
        },
      };
    }
    if (needsHasDueAt) {
      addFieldsStage.hasDueAt = {
        $cond: [{ $eq: ["$dueAt", null] }, 1, 0],
      };
    }
    itemsPipeline.push({ $addFields: addFieldsStage });
  }

  const itemsSort: Record<string, 1 | -1> = isSearching
    ? { relevanceScore: -1, ...sortStage, _id: -1 }
    : { ...sortStage, _id: -1 };

  itemsPipeline.push(
    { $sort: itemsSort },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: COLLECTIONS.CASES,
        localField: "caseId",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              title: 1,
              caseNumber: 1,
              internalReference: 1,
              caseStatus: 1,
            },
          },
        ],
        as: "caseDetails",
      },
    },
    {
      $lookup: {
        from: COLLECTIONS.CLIENTS,
        localField: "clientId",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              clientNumber: 1,
              organizationName: 1,
              phone: 1,
            },
          },
        ],
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
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        status: 1,
        priority: 1,
        dueAt: 1,
        completedAt: 1,
        caseId: 1,
        clientId: 1,
        caseDetails: 1,
        clientDetails: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    }
  );

  // Single MongoDB aggregation pipeline: executes paginated items query
  // and filter-aware aggregate statistics simultaneously on the filtered dataset.
  const pipeline: mongoose.PipelineStage[] = [{ $match: filter }];

  if (relevanceStages.length > 0) {
    pipeline.push(...relevanceStages);
  }

  pipeline.push({
    $facet: {
        items: itemsPipeline,
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
    });

  const [result] = await Task.aggregate<{
    items: TaskDocInput[];
    stats: Array<{
      total: number;
      todo: number;
      inProgress: number;
      completed: number;
      overdue: number;
      urgent: number;
      high: number;
    }>;
  }>(pipeline);

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
    limit,
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
 * Create a new task with relationship validation, auto-linking, audit logging,
 * and zero redundant database queries.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

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

  let caseDoc: RawTaskCaseInput | null = null;
  let clientDoc: RawTaskClientInput | null = null;

  // Validate Case Relationship
  if (resolvedCaseId) {
    const fetchedCase = await Case.findOne({
      _id: resolvedCaseId,
      deletedAt: null,
    })
      .select("_id clientId title caseNumber internalReference caseStatus")
      .lean();

    if (!fetchedCase) {
      throw ApiError.badRequest("Selected case does not exist or has been deleted");
    }

    caseDoc = fetchedCase;

    // Auto-link Client Relationship if not explicitly specified
    if (!resolvedClientId && fetchedCase.clientId) {
      resolvedClientId = fetchedCase.clientId as mongoose.Types.ObjectId;
    }
  }

  // Validate Client Relationship
  if (resolvedClientId) {
    const fetchedClient = await Client.findOne({
      _id: resolvedClientId,
      deletedAt: null,
    })
      .select("_id name clientNumber organizationName phone")
      .lean();

    if (!fetchedClient) {
      throw ApiError.badRequest("Selected client does not exist or has been deleted");
    }

    clientDoc = fetchedClient;
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

  // Record audit log for task creation
  await recordAuditLog({
    req,
    userId,
    action: AUDIT_ACTIONS.CREATE,
    entityType: AUDIT_ENTITY_TYPES.TASK,
    entityId: newTask._id,
    newValues: newTask.toObject(),
    description: `Created task "${newTask.title}"`,
  });

  // Construct response directly without redundant database queries
  const taskDto = formatTaskItem({
    ...newTask.toObject(),
    caseDetails: caseDoc,
    clientDetails: clientDoc,
  });

  const response: TaskActionResponse = {
    success: true,
    message: "Task created successfully",
    data: taskDto,
  };

  return NextResponse.json(response, { status: 201 });
});
