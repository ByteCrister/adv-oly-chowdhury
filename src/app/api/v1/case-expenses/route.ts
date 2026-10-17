import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import { Case } from "@/db/models/Case.model";
import { CaseExpense } from "@/db/models/CaseExpense.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  CASE_EXPENSE_CATEGORY_LABELS,
  CASE_EXPENSE_DEFAULT_PAGE_LIMIT,
  CASE_EXPENSE_PAGE_LIMITS,
  CASE_EXPENSE_SORT_OPTIONS,
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
} from "@/types/case-expense.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";
import ConnectDB from "@/db";

/**
 * Format a CaseExpense document into CaseExpenseItemDto.
 */
function formatCaseExpenseItem(
  expense: Record<string, unknown>,
  caseDoc?: {
    _id?: mongoose.Types.ObjectId;
    internalReference?: string;
    caseNumber?: string;
    title?: string;
    clientId?: mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId; name?: string; clientNumber?: string };
  } | null,
  clientDoc?: { name?: string; clientNumber?: string } | null,
  receiptRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null,
  recordedByUser?: { _id: mongoose.Types.ObjectId; name: string; email: string } | null
): CaseExpenseItemDto {
  const cat = expense.category as CaseExpenseCategory;
  const caseRef = caseDoc
    ? caseDoc.caseNumber || caseDoc.internalReference || null
    : null;

  // Resolve client info: could be directly from clientDoc or populated inside caseDoc.clientId
  let cId: string | null = null;
  let cName: string | null = null;
  let cNumber: string | null = null;

  if (clientDoc) {
    cName = clientDoc.name || null;
    cNumber = clientDoc.clientNumber || null;
  }

  if (caseDoc?.clientId) {
    if (typeof caseDoc.clientId === "object" && "_id" in caseDoc.clientId) {
      const popClient = caseDoc.clientId as { _id?: mongoose.Types.ObjectId; name?: string; clientNumber?: string };
      cId = popClient._id ? popClient._id.toString() : null;
      if (!cName && popClient.name) cName = popClient.name;
      if (!cNumber && popClient.clientNumber) cNumber = popClient.clientNumber;
    } else {
      cId = (caseDoc.clientId as mongoose.Types.ObjectId).toString();
    }
  }

  const asset = receiptRef?.assetId;

  return {
    id: (expense._id as mongoose.Types.ObjectId).toString(),
    caseId: (expense.caseId as mongoose.Types.ObjectId).toString(),
    caseReference: caseRef,
    caseTitle: caseDoc?.title || null,
    clientId: cId,
    clientName: cName,
    clientNumber: cNumber,
    expenseDate: new Date(expense.expenseDate as Date).toISOString(),
    category: cat,
    categoryLabel: CASE_EXPENSE_CATEGORY_LABELS[cat] || String(expense.category),
    description: (expense.description as string) || null,
    amount: expense.amount as number,
    currency: (expense.currency as string) || "BDT",
    receiptAssetReferenceId: expense.receiptAssetReferenceId
      ? (expense.receiptAssetReferenceId as mongoose.Types.ObjectId).toString()
      : null,
    receiptUrl: asset?.secureUrl || null,
    receiptFileName: receiptRef?.originalFileName || asset?.originalFilename || null,
    recordedBy: recordedByUser
      ? {
          id: recordedByUser._id.toString(),
          name: recordedByUser.name,
          email: recordedByUser.email,
        }
      : null,
    createdAt: expense.createdAt ? new Date(expense.createdAt as Date).toISOString() : "",
    updatedAt: expense.updatedAt ? new Date(expense.updatedAt as Date).toISOString() : "",
  };
}

/**
 * GET /api/v1/case-expenses
 *
 * List case expenses with pagination, search, filters, and summary aggregates.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Authentication required");
  }

  await ConnectDB();

  const { searchParams } = new URL(req.url);

  // Validate limit parameter if provided
  const rawLimit = searchParams.get("limit");
  if (rawLimit !== null) {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!CASE_EXPENSE_PAGE_LIMITS.includes(parsedLimit as CaseExpensePageLimit)) {
      throw ApiError.badRequest(
        `Invalid page limit "${rawLimit}". Allowed page limits are: ${CASE_EXPENSE_PAGE_LIMITS.join(", ")}`
      );
    }
  }

  const rawParams = {
    search: sanitizeSearchParam(searchParams.get("search")),
    caseId: searchParams.get("caseId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    category: searchParams.get("category") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || CASE_EXPENSE_SORT_OPTIONS.NEWEST_EXPENSE,
    page: searchParams.get("page") || 1,
    limit: rawLimit ? parseInt(rawLimit, 10) : CASE_EXPENSE_DEFAULT_PAGE_LIMIT,
  };

  const parsed = caseExpenseQueryFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
  }

  const { search, caseId, clientId, category, startDate, endDate, sort, page, limit } = parsed.data;

  const filter: Record<string, unknown> = {};

  if (caseId && caseId !== "ALL" && mongoose.Types.ObjectId.isValid(caseId)) {
    filter.caseId = new mongoose.Types.ObjectId(caseId);
  }

  // If clientId is provided, find cases for this client
  if (clientId && clientId !== "ALL" && mongoose.Types.ObjectId.isValid(clientId)) {
    const clientCases = await Case.find({
      clientId: new mongoose.Types.ObjectId(clientId),
      deletedAt: null,
    })
      .select("_id")
      .lean();
    const caseIds = clientCases.map((c) => c._id);
    if (filter.caseId) {
      // If both caseId and clientId provided, verify caseId is in client's cases
      const matches = caseIds.some((id) => (id as mongoose.Types.ObjectId).equals(filter.caseId as mongoose.Types.ObjectId));
      if (!matches) {
        filter.caseId = new mongoose.Types.ObjectId(); // Empty match
      }
    } else {
      filter.caseId = { $in: caseIds };
    }
  }

  if (category && category !== "ALL") {
    filter.category = category;
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
    filter.expenseDate = dateQuery;
  }

  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      // Search in description, or in cases matching title/caseNumber
      const matchingCases = await Case.find({
        $or: [
          { title: searchRegex },
          { caseNumber: searchRegex },
          { internalReference: searchRegex },
        ],
        deletedAt: null,
      })
        .select("_id")
        .lean();
      const matchingCaseIds = matchingCases.map((c) => c._id);

      filter.$or = [
        { description: searchRegex },
        { caseId: { $in: matchingCaseIds } },
      ];
    }
  }

  const sortMap: Record<CaseExpenseSortOption, Record<string, 1 | -1>> = {
    [CASE_EXPENSE_SORT_OPTIONS.NEWEST_EXPENSE]: { expenseDate: -1 },
    [CASE_EXPENSE_SORT_OPTIONS.OLDEST_EXPENSE]: { expenseDate: 1 },
    [CASE_EXPENSE_SORT_OPTIONS.AMOUNT_DESC]: { amount: -1 },
    [CASE_EXPENSE_SORT_OPTIONS.AMOUNT_ASC]: { amount: 1 },
    [CASE_EXPENSE_SORT_OPTIONS.NEWEST_CREATED]: { createdAt: -1 },
  };

  const sortOption = sortMap[sort as CaseExpenseSortOption] || { expenseDate: -1 };
  const skip = (page - 1) * limit;

  // Execute query, count, and summary aggregate in parallel
  const [total, expenses, summaryAgg, categoryAgg] = await Promise.all([
    CaseExpense.countDocuments(filter),
    CaseExpense.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate<{
        caseId: {
          _id: mongoose.Types.ObjectId;
          internalReference: string;
          caseNumber: string;
          title: string;
          clientId: { _id: mongoose.Types.ObjectId; name: string; clientNumber: string };
        };
      }>({
        path: "caseId",
        select: "internalReference caseNumber title clientId",
        populate: {
          path: "clientId",
          select: "name clientNumber",
        },
      })
      .populate<{
        receiptAssetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "receiptAssetReferenceId",
        populate: { path: "assetId" },
      })
      .populate<{
        recordedBy: { _id: mongoose.Types.ObjectId; name: string; email: string };
      }>("recordedBy", "name email")
      .lean(),
    CaseExpense.aggregate<{
      _id: null;
      totalAmount: number;
      totalCount: number;
    }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalCount: { $sum: 1 },
        },
      },
    ]),
    CaseExpense.aggregate<{ _id: CaseExpenseCategory; amount: number }>([
      { $match: filter },
      { $group: { _id: "$category", amount: { $sum: "$amount" } } },
    ]),
  ]);

  const categoryBreakdown: Partial<Record<CaseExpenseCategory, number>> = {};
  for (const item of categoryAgg) {
    categoryBreakdown[item._id] = item.amount;
  }

  const summary: CaseExpenseSummaryStats = {
    totalCount: summaryAgg[0]?.totalCount ?? 0,
    totalAmount: summaryAgg[0]?.totalAmount ?? 0,
    categoryBreakdown,
  };

  const items: CaseExpenseItemDto[] = expenses.map((e) =>
    formatCaseExpenseItem(
      e,
      e.caseId as unknown as {
        _id?: mongoose.Types.ObjectId;
        internalReference?: string;
        caseNumber?: string;
        title?: string;
        clientId?: { _id?: mongoose.Types.ObjectId; name?: string; clientNumber?: string };
      },
      null,
      e.receiptAssetReferenceId as unknown as (IAssetReferenceDocument & { assetId?: IAsset }),
      e.recordedBy as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string }
    )
  );

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
 * Record a new case expense.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Authentication required");
  }

  await ConnectDB();

  const body = await req.json();
  const validated = createCaseExpenseSchema.parse(body);

  const caseObjectId = new mongoose.Types.ObjectId(validated.caseId);
  const targetCase = await Case.findOne({ _id: caseObjectId, deletedAt: null });
  if (!targetCase) {
    throw ApiError.notFound("The specified legal case was not found or has been deleted.");
  }

  let receiptObjectId: mongoose.Types.ObjectId | null = null;
  if (validated.receiptAssetReferenceId) {
    receiptObjectId = new mongoose.Types.ObjectId(validated.receiptAssetReferenceId);
    const receiptRef = await AssetReference.findOne({
      _id: receiptObjectId,
      deletedAt: null,
    });
    if (!receiptRef) {
      throw ApiError.badRequest("The referenced receipt voucher file does not exist or was deleted.");
    }
  }

  const userId = new mongoose.Types.ObjectId(session.user.id);

  // Create expense inside transaction
  const createdExpense = await withTransaction(async (dbSession) => {
    if (receiptObjectId) {
      await AssetReference.findByIdAndUpdate(
        receiptObjectId,
        {
          ownerType: ASSET_OWNER_TYPES.CASE_EXPENSE,
          ownerId: caseObjectId,
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
          currency: validated.currency || "BDT",
          receiptAssetReferenceId: receiptObjectId,
          recordedBy: userId,
        },
      ],
      { session: dbSession }
    );

    return expense;
  });

  const populated = await CaseExpense.findById(createdExpense._id)
    .populate<{
      caseId: {
        _id: mongoose.Types.ObjectId;
        internalReference: string;
        caseNumber: string;
        title: string;
        clientId: { _id: mongoose.Types.ObjectId; name: string; clientNumber: string };
      };
    }>({
      path: "caseId",
      select: "internalReference caseNumber title clientId",
      populate: {
        path: "clientId",
        select: "name clientNumber",
      },
    })
    .populate<{
      receiptAssetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
    }>({
      path: "receiptAssetReferenceId",
      populate: { path: "assetId" },
    })
    .populate<{
      recordedBy: { _id: mongoose.Types.ObjectId; name: string; email: string };
    }>("recordedBy", "name email")
    .lean();

  const itemDto = formatCaseExpenseItem(
    populated!,
    populated!.caseId as unknown as {
      _id?: mongoose.Types.ObjectId;
      internalReference?: string;
      caseNumber?: string;
      title?: string;
      clientId?: { _id?: mongoose.Types.ObjectId; name?: string; clientNumber?: string };
    },
    null,
    populated!.receiptAssetReferenceId as unknown as (IAssetReferenceDocument & { assetId?: IAsset }),
    populated!.recordedBy as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string }
  );

  const response: CaseExpenseActionResponse = {
    success: true,
    message: `Case expense of ${itemDto.amount} ${itemDto.currency} recorded successfully.`,
    data: itemDto,
  };

  return NextResponse.json(response, { status: 201 });
});
