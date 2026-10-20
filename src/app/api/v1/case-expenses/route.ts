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
import { Client } from "@/db/models/Client.model";
import { CaseExpense } from "@/db/models/CaseExpense.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES, ASSET_PURPOSES } from "@/const/asset-reference.const";
import { AssetType } from "@/const/asset.const";
import { COLLECTIONS } from "@/const/collection.const";
import {
  CASE_EXPENSE_CATEGORIES,
  CASE_EXPENSE_CATEGORY_LABELS,
  CASE_EXPENSE_DEFAULT_PAGE_LIMIT,
  CASE_EXPENSE_SORT_OPTIONS,
  DEFAULT_CURRENCY,
  CaseExpenseCategory,
  CaseExpensePageLimit,
  CaseExpenseSortOption,
} from "@/const/case-expense.const";
import {
  createCaseExpenseSchema,
  caseExpenseQueryFilterSchema,
} from "@/utils/zod/case-expense.validation";
import type {
  CaseExpenseItemDto,
  CaseExpensePaginationResponse,
  CaseExpenseActionResponse,
  CaseExpenseSummaryStats,
  CaseExpenseDocInput,
  RawCaseExpenseCaseInput,
  RawCaseExpenseClientInput,
  RawCaseExpenseReceiptInput,
  RawCaseExpenseUserInput,
  CaseExpenseAggregateResult,
} from "@/types/case-expense.types";

/**
 * Format a raw, populated, or aggregated CaseExpense document into strongly-typed CaseExpenseItemDto.
 * Safely handles aggregation $lookup results, populated Mongoose documents, and lean records.
 */
export function formatCaseExpenseItem(doc: CaseExpenseDocInput): CaseExpenseItemDto {
  const cat = (doc.category as CaseExpenseCategory) || CASE_EXPENSE_CATEGORIES.COURT_FEES;

  // Resolve case object: check aggregation $lookup (caseDetails) or populated caseId object
  const rawCase: RawCaseExpenseCaseInput | null =
    doc.caseDetails && typeof doc.caseDetails === "object" && "_id" in doc.caseDetails
      ? doc.caseDetails
      : doc.caseId && typeof doc.caseId === "object" && "_id" in (doc.caseId as Record<string, unknown>)
      ? (doc.caseId as RawCaseExpenseCaseInput)
      : null;

  // Resolve client object: check aggregation $lookup (clientDetails) or populated caseDoc.clientId
  const rawClient: RawCaseExpenseClientInput | null =
    doc.clientDetails && typeof doc.clientDetails === "object" && "_id" in doc.clientDetails
      ? doc.clientDetails
      : rawCase?.clientId && typeof rawCase.clientId === "object" && "_id" in (rawCase.clientId as Record<string, unknown>)
      ? (rawCase.clientId as RawCaseExpenseClientInput)
      : null;

  // Resolve receipt reference: check aggregation $lookup (receiptDetails) or populated receiptAssetReferenceId
  const rawReceipt: RawCaseExpenseReceiptInput | null =
    doc.receiptDetails && typeof doc.receiptDetails === "object" && "_id" in doc.receiptDetails
      ? doc.receiptDetails
      : doc.receiptAssetReferenceId &&
        typeof doc.receiptAssetReferenceId === "object" &&
        "_id" in (doc.receiptAssetReferenceId as Record<string, unknown>)
      ? (doc.receiptAssetReferenceId as RawCaseExpenseReceiptInput)
      : null;

  // Resolve recordedBy user: check aggregation $lookup (userDetails) or populated recordedBy object
  const rawUser: RawCaseExpenseUserInput | null =
    doc.userDetails && typeof doc.userDetails === "object" && "_id" in doc.userDetails
      ? doc.userDetails
      : doc.recordedBy &&
        typeof doc.recordedBy === "object" &&
        "_id" in (doc.recordedBy as Record<string, unknown>)
      ? (doc.recordedBy as RawCaseExpenseUserInput)
      : null;

  // Determine scalar caseId string
  const caseIdStr: string = rawCase?._id
    ? String(rawCase._id)
    : doc.caseId && typeof doc.caseId !== "object"
    ? String(doc.caseId)
    : doc.caseId instanceof mongoose.Types.ObjectId
    ? doc.caseId.toString()
    : "";

  // Determine scalar clientId string
  const clientIdStr: string | null = rawClient?._id
    ? String(rawClient._id)
    : rawCase?.clientId && typeof rawCase.clientId !== "object"
    ? String(rawCase.clientId)
    : null;

  // Determine scalar receiptAssetReferenceId string
  const receiptRefIdStr: string | null = rawReceipt?._id
    ? String(rawReceipt._id)
    : doc.receiptAssetReferenceId && typeof doc.receiptAssetReferenceId !== "object"
    ? String(doc.receiptAssetReferenceId)
    : doc.receiptAssetReferenceId instanceof mongoose.Types.ObjectId
    ? doc.receiptAssetReferenceId.toString()
    : null;

  const asset = rawReceipt?.assetId;
  const idStr = doc._id ? String(doc._id) : (doc.id || "");

  const expenseDateObj = doc.expenseDate ? new Date(doc.expenseDate) : new Date();
  const validExpenseDate = !isNaN(expenseDateObj.getTime())
    ? expenseDateObj.toISOString()
    : new Date().toISOString();

  return {
    id: idStr,
    caseId: caseIdStr,
    caseReference: rawCase?.caseNumber || rawCase?.internalReference || null,
    caseTitle: rawCase?.title || null,
    clientId: clientIdStr,
    clientName: rawClient?.name || null,
    clientNumber: rawClient?.clientNumber || null,
    expenseDate: validExpenseDate,
    category: cat,
    categoryLabel: CASE_EXPENSE_CATEGORY_LABELS[cat] || String(cat),
    description: doc.description || null,
    amount: typeof doc.amount === "number" ? doc.amount : Number(doc.amount) || 0,
    currency: doc.currency || DEFAULT_CURRENCY,
    receiptAssetReferenceId: receiptRefIdStr,
    receiptAssetreferenceId: receiptRefIdStr,
    receiptUrl: asset?.secureUrl || null,
    receiptFileName: rawReceipt?.originalFileName || asset?.originalFilename || null,
    receiptAssetType: (asset?.assetType as AssetType) || null,
    receiptMimeType: asset?.mimeType || null,
    receiptSizeBytes: asset?.bytes || null,
    recordedBy: rawUser?._id
      ? {
          id: String(rawUser._id),
          name: rawUser.name || "Unknown User",
          email: rawUser.email || "",
        }
      : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

/**
 * GET /api/v1/case-expenses
 *
 * List case expenses with pagination, server-side search, multi-field filtering,
 * and unified aggregate statistics in a single database aggregation pipeline.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const { searchParams } = new URL(req.url);

  const rawParams = {
    search: sanitizeSearchParam(searchParams.get("search")),
    caseId: searchParams.get("caseId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    category: searchParams.get("category") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || CASE_EXPENSE_SORT_OPTIONS.NEWEST_EXPENSE,
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || CASE_EXPENSE_DEFAULT_PAGE_LIMIT,
  };

  const parsed = caseExpenseQueryFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
  }

  const { search, caseId, clientId, category, startDate, endDate, sort, page, limit } = parsed.data;

  const filter: Record<string, unknown> = {};

  // Case ID Filter
  if (caseId && caseId !== "ALL") {
    filter.caseId = new mongoose.Types.ObjectId(caseId);
  }

  // Client ID Filter: look up cases belonging to this client
  if (clientId && clientId !== "ALL") {
    const clientCases = await Case.find({
      clientId: new mongoose.Types.ObjectId(clientId),
      deletedAt: null,
    })
      .select("_id")
      .lean();
    const caseIds = clientCases.map((c) => c._id as mongoose.Types.ObjectId);

    if (filter.caseId) {
      // If both caseId and clientId provided, verify caseId belongs to this client
      const matches = caseIds.some((id) => id.equals(filter.caseId as mongoose.Types.ObjectId));
      if (!matches) {
        // Disjoint filter results in empty match set
        filter.caseId = { $in: [] };
      }
    } else {
      filter.caseId = { $in: caseIds };
    }
  }

  // Expense Category Filter
  if (category && category !== "ALL") {
    filter.category = category;
  }

  // Expense Date Range Filter
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
    filter.expenseDate = dateQuery;
  }

  // Search Filter: contextual search across case title, case number, internal reference,
  // client name/number, and expense description
  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      const [matchingCases, matchingClients] = await Promise.all([
        Case.find(
          {
            deletedAt: null,
            $or: [
              { title: searchRegex },
              { caseNumber: searchRegex },
              { internalReference: searchRegex },
            ],
          },
          { _id: 1 }
        )
          .limit(100)
          .lean(),
        Client.find(
          {
            deletedAt: null,
            $or: [
              { name: searchRegex },
              { clientNumber: searchRegex },
              { organizationName: searchRegex },
            ],
          },
          { _id: 1 }
        )
          .limit(100)
          .lean(),
      ]);

      const caseIds = matchingCases.map((c) => c._id);
      const clientIds = matchingClients.map((c) => c._id);

      // Find cases associated with matching clients
      let clientCaseIds: mongoose.Types.ObjectId[] = [];
      if (clientIds.length > 0) {
        const clientCases = await Case.find(
          {
            clientId: { $in: clientIds },
            deletedAt: null,
          },
          { _id: 1 }
        )
          .limit(100)
          .lean();
        clientCaseIds = clientCases.map((c) => c._id as mongoose.Types.ObjectId);
      }

      const allMatchingCaseIds = Array.from(
        new Set([...caseIds.map(String), ...clientCaseIds.map(String)])
      ).map((id) => new mongoose.Types.ObjectId(id));

      filter.$or = [
        { description: searchRegex },
        ...(allMatchingCaseIds.length > 0 ? [{ caseId: { $in: allMatchingCaseIds } }] : []),
      ];
    }
  }

  // Deterministic sorting with tie-breaker
  const sortMap: Record<CaseExpenseSortOption, Record<string, 1 | -1>> = {
    [CASE_EXPENSE_SORT_OPTIONS.NEWEST_EXPENSE]: { expenseDate: -1, _id: -1 },
    [CASE_EXPENSE_SORT_OPTIONS.OLDEST_EXPENSE]: { expenseDate: 1, _id: 1 },
    [CASE_EXPENSE_SORT_OPTIONS.AMOUNT_DESC]: { amount: -1, expenseDate: -1, _id: -1 },
    [CASE_EXPENSE_SORT_OPTIONS.AMOUNT_ASC]: { amount: 1, expenseDate: 1, _id: 1 },
    [CASE_EXPENSE_SORT_OPTIONS.NEWEST_CREATED]: { createdAt: -1, _id: -1 },
  };

  const sortOption = sortMap[sort as CaseExpenseSortOption] || { expenseDate: -1, _id: -1 };
  const skip = (page - 1) * limit;

  // Single consolidated MongoDB aggregation pipeline executing pagination and summary statistics
  const [aggResult] = await CaseExpense.aggregate<CaseExpenseAggregateResult>([
    { $match: filter },
    {
      $facet: {
        items: [
          { $sort: sortOption },
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
                    internalReference: 1,
                    caseNumber: 1,
                    title: 1,
                    clientId: 1,
                  },
                },
              ],
              as: "caseDetails",
            },
          },
          {
            $unwind: {
              path: "$caseDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: COLLECTIONS.CLIENTS,
              localField: "caseDetails.clientId",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    clientNumber: 1,
                  },
                },
              ],
              as: "clientDetails",
            },
          },
          {
            $unwind: {
              path: "$clientDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: COLLECTIONS.ASSET_REFERENCES,
              localField: "receiptAssetReferenceId",
              foreignField: "_id",
              pipeline: [
                {
                  $lookup: {
                    from: COLLECTIONS.ASSETS,
                    localField: "assetId",
                    foreignField: "_id",
                    pipeline: [
                      {
                        $project: {
                          _id: 1,
                          secureUrl: 1,
                          originalFilename: 1,
                          assetType: 1,
                          mimeType: 1,
                          bytes: 1,
                        },
                      },
                    ],
                    as: "assetDocs",
                  },
                },
                {
                  $unwind: {
                    path: "$assetDocs",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    _id: 1,
                    originalFileName: 1,
                    assetId: "$assetDocs",
                  },
                },
              ],
              as: "receiptDetails",
            },
          },
          {
            $unwind: {
              path: "$receiptDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: COLLECTIONS.USERS,
              localField: "recordedBy",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                  },
                },
              ],
              as: "userDetails",
            },
          },
          {
            $unwind: {
              path: "$userDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 1,
              caseId: 1,
              caseDetails: 1,
              clientDetails: 1,
              expenseDate: 1,
              category: 1,
              description: 1,
              amount: 1,
              currency: 1,
              receiptAssetReferenceId: 1,
              receiptDetails: 1,
              recordedBy: 1,
              userDetails: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
        summaryStats: [
          {
            $group: {
              _id: null,
              totalCount: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
            },
          },
        ],
        categoryBreakdown: [
          {
            $group: {
              _id: "$category",
              amount: { $sum: "$amount" },
            },
          },
        ],
      },
    },
  ]);

  const items = (aggResult?.items || []).map(formatCaseExpenseItem);
  const total = aggResult?.summaryStats?.[0]?.totalCount ?? 0;
  const totalAmount = aggResult?.summaryStats?.[0]?.totalAmount ?? 0;

  const categoryBreakdown: Partial<Record<CaseExpenseCategory, number>> = {};
  if (aggResult?.categoryBreakdown) {
    for (const item of aggResult.categoryBreakdown) {
      if (item._id) {
        categoryBreakdown[item._id] = item.amount;
      }
    }
  }

  const summary: CaseExpenseSummaryStats = {
    totalCount: total,
    totalAmount,
    categoryBreakdown,
  };

  const response: CaseExpensePaginationResponse = {
    items,
    summary,
    total,
    page,
    limit: limit as CaseExpensePageLimit,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: page * limit < total,
  };

  return NextResponse.json(response);
});

/**
 * POST /api/v1/case-expenses
 *
 * Record a new case expense with transaction consistency, receipt asset linking,
 * and compliance audit logging.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const currentUserId = await getUserId();

  const body = await req.json();
  const validated = createCaseExpenseSchema.parse(body);

  const caseObjectId = new mongoose.Types.ObjectId(validated.caseId);
  const targetCase = await Case.findOne({ _id: caseObjectId, deletedAt: null })
    .select("_id title caseNumber internalReference clientId")
    .lean();
  if (!targetCase) {
    throw ApiError.notFound("The specified legal case was not found or has been deleted.");
  }

  const receiptRefId = validated.receiptAssetReferenceId ?? validated.receiptAssetreferenceId;
  let receiptObjectId: mongoose.Types.ObjectId | null = null;
  if (receiptRefId) {
    receiptObjectId = new mongoose.Types.ObjectId(receiptRefId);
    const receiptRef = await AssetReference.findOne({
      _id: receiptObjectId,
      deletedAt: null,
    })
      .select("_id ownerType ownerId")
      .lean();
    if (!receiptRef) {
      throw ApiError.badRequest("The referenced receipt voucher file does not exist or was deleted.");
    }

    // Security guard: Ensure the asset reference is not owned by a different case
    if (
      receiptRef.ownerId &&
      (receiptRef.ownerType === ASSET_OWNER_TYPES.CASE_EXPENSE ||
        receiptRef.ownerType === ASSET_OWNER_TYPES.CASE) &&
      !receiptRef.ownerId.equals(caseObjectId)
    ) {
      throw ApiError.badRequest("The referenced receipt file belongs to another legal case.");
    }
  }

  const userId = new mongoose.Types.ObjectId(currentUserId);

  // Create expense, link receipt, and record audit log inside a single database transaction
  const createdExpense = await withTransaction(async (dbSession) => {
    if (receiptObjectId) {
      await AssetReference.findByIdAndUpdate(
        receiptObjectId,
        {
          ownerType: ASSET_OWNER_TYPES.CASE_EXPENSE,
          ownerId: caseObjectId,
          purpose: ASSET_PURPOSES.EXPENSE_RECEIPT,
        },
        { session: dbSession }
      );
    }

    const [expense] = await CaseExpense.create(
      [
        {
          caseId: caseObjectId,
          expenseDate: new Date(validated.expenseDate),
          category: validated.category,
          description: validated.description?.trim() || null,
          amount: validated.amount,
          currency: validated.currency || DEFAULT_CURRENCY,
          receiptAssetReferenceId: receiptObjectId,
          recordedBy: userId,
        },
      ],
      { session: dbSession }
    );

    // Record audit log for case expense creation
    await recordAuditLog({
      req,
      userId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.CASE_EXPENSE,
      entityId: expense._id,
      newValues: expense.toObject(),
      description: `Recorded case expense of ${expense.amount} ${expense.currency} for case ${targetCase.caseNumber || targetCase.internalReference || targetCase.title}`,
      session: dbSession,
    });

    return expense;
  });

  const populated = await CaseExpense.findById(createdExpense._id)
    .populate({
      path: "caseId",
      select: "internalReference caseNumber title clientId",
      populate: {
        path: "clientId",
        select: "name clientNumber",
      },
    })
    .populate({
      path: "receiptAssetReferenceId",
      select: "originalFileName assetId",
      populate: {
        path: "assetId",
        select: "secureUrl originalFilename assetType mimeType bytes",
      },
    })
    .populate("recordedBy", "name email")
    .lean<CaseExpenseDocInput>();

  const itemDto = formatCaseExpenseItem(populated!);

  const response: CaseExpenseActionResponse = {
    success: true,
    message: `Case expense of ${itemDto.amount} ${itemDto.currency} recorded successfully.`,
    data: itemDto,
  };

  return NextResponse.json(response, { status: 201 });
});
