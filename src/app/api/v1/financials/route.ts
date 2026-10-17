import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import {
  FINANCIAL_DEFAULT_PAGE_LIMIT,
  FINANCIAL_PAGE_LIMITS,
  FINANCIAL_SORT_OPTIONS,
  FinancialPageLimit,
  FinancialSortOption,
} from "@/const/financial.const";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import {
  CASE_EXPENSE_CATEGORY_LABELS,
  CaseExpenseCategory,
} from "@/const/case-expense.const";
import { financialQueryFilterSchema } from "@/utils/zod/financial.validation";
import type {
  UnifiedFinancialRecordDto,
  FinancialPaginationResponse,
  FinancialSummaryStats,
} from "@/types/financial.types";
import ConnectDB from "@/db";

interface RawAggregatedRecord {
  _id: mongoose.Types.ObjectId;
  recordType: "PAYMENT" | "EXPENSE";
  transactionDate: Date;
  amount: number;
  currency: string;
  clientId?: mongoose.Types.ObjectId | null;
  clientName?: string | null;
  clientNumber?: string | null;
  caseId?: mongoose.Types.ObjectId | null;
  caseTitle?: string | null;
  caseReference?: string | null;
  paymentMethod?: PaymentMethod | null;
  paymentType?: PaymentType | null;
  expenseCategory?: CaseExpenseCategory | null;
  referenceNumber?: string | null;
  moneyReceiptNumber?: string | null;
  description?: string | null;
  receiptAssetId?: mongoose.Types.ObjectId | null;
  receiptDoc?: { originalFileName?: string; assetDoc?: { secureUrl?: string; originalFilename?: string } }[];
  userDoc?: { _id: mongoose.Types.ObjectId; name: string; email: string }[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/v1/financials
 *
 * Unified financial ledger endpoint combining Client Payments and Case Expenses.
 * Uses high-performance MongoDB aggregation with $unionWith, $facet, filtering,
 * server-side search, sorting, and pagination.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Authentication required");
  }

  await ConnectDB();

  const { searchParams } = new URL(req.url);

  const rawLimit = searchParams.get("limit");
  if (rawLimit !== null) {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!FINANCIAL_PAGE_LIMITS.includes(parsedLimit as FinancialPageLimit)) {
      throw ApiError.badRequest(
        `Invalid page limit "${rawLimit}". Allowed limits are: ${FINANCIAL_PAGE_LIMITS.join(", ")}`
      );
    }
  }

  const rawParams = {
    search: sanitizeSearchParam(searchParams.get("search")),
    recordType: searchParams.get("recordType") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    caseId: searchParams.get("caseId") || undefined,
    paymentMethod: searchParams.get("paymentMethod") || undefined,
    expenseCategory: searchParams.get("expenseCategory") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    sort: searchParams.get("sort") || FINANCIAL_SORT_OPTIONS.NEWEST_DATE,
    page: searchParams.get("page") || 1,
    limit: rawLimit ? parseInt(rawLimit, 10) : FINANCIAL_DEFAULT_PAGE_LIMIT,
  };

  const parsed = financialQueryFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
  }

  const {
    search,
    recordType,
    clientId,
    caseId,
    paymentMethod,
    expenseCategory,
    startDate,
    endDate,
    sort,
    page,
    limit,
  } = parsed.data;

  // Build the ClientPayment branch of the union pipeline
  const paymentProjectStage = {
    $project: {
      _id: 1,
      recordType: { $literal: "PAYMENT" },
      transactionDate: "$paymentDate",
      amount: "$amount",
      currency: "$currency",
      clientId: "$clientId",
      caseId: "$caseId",
      paymentMethod: "$paymentMethod",
      paymentType: "$paymentType",
      expenseCategory: { $literal: null },
      referenceNumber: "$referenceNumber",
      moneyReceiptNumber: "$moneyReceiptNumber",
      description: "$notes",
      receiptAssetId: "$receiptAssetreferenceId",
      recordedBy: "$receivedBy",
      createdAt: "$createdAt",
      updatedAt: "$updatedAt",
    },
  };

  // Build the CaseExpense branch of the union pipeline
  const expenseProjectStage = {
    $project: {
      _id: 1,
      recordType: { $literal: "EXPENSE" },
      transactionDate: "$expenseDate",
      amount: "$amount",
      currency: "$currency",
      clientId: { $literal: null }, // Will be resolved from case
      caseId: "$caseId",
      paymentMethod: { $literal: null },
      paymentType: { $literal: null },
      expenseCategory: "$category",
      referenceNumber: { $literal: null },
      moneyReceiptNumber: { $literal: null },
      description: "$description",
      receiptAssetId: "$receiptAssetReferenceId",
      recordedBy: "$recordedBy",
      createdAt: "$createdAt",
      updatedAt: "$updatedAt",
    },
  };

  // Master aggregation pipeline starting from ClientPayment
  const pipeline: mongoose.PipelineStage[] = [
    paymentProjectStage,
    {
      $unionWith: {
        coll: "case_expenses",
        pipeline: [expenseProjectStage],
      },
    },
    // Populate case details
    {
      $lookup: {
        from: "cases",
        localField: "caseId",
        foreignField: "_id",
        as: "caseDocs",
      },
    },
    // Determine the effective clientId: for payments it's already on the record;
    // for expenses it comes from the linked case!
    {
      $addFields: {
        caseDoc: { $arrayElemAt: ["$caseDocs", 0] },
      },
    },
    {
      $addFields: {
        effectiveClientId: {
          $ifNull: ["$clientId", "$caseDoc.clientId"],
        },
        caseReference: {
          $ifNull: ["$caseDoc.caseNumber", "$caseDoc.internalReference"],
        },
        caseTitle: "$caseDoc.title",
        isCaseDeleted: { $gt: ["$caseDoc.deletedAt", null] },
      },
    },
    // Lookup client details based on effectiveClientId
    {
      $lookup: {
        from: "clients",
        localField: "effectiveClientId",
        foreignField: "_id",
        as: "clientDocs",
      },
    },
    {
      $addFields: {
        clientDoc: { $arrayElemAt: ["$clientDocs", 0] },
      },
    },
    {
      $addFields: {
        clientName: "$clientDoc.name",
        clientNumber: "$clientDoc.clientNumber",
        isClientDeleted: { $gt: ["$clientDoc.deletedAt", null] },
      },
    },
    // Exclude records where case or client was soft-deleted
    {
      $match: {
        isCaseDeleted: { $ne: true },
        isClientDeleted: { $ne: true },
      },
    },
  ];

  // Post-union unified match filters
  const matchConditions: Record<string, unknown> = {};

  if (recordType && recordType !== "ALL") {
    matchConditions.recordType = recordType;
  }

  if (clientId && clientId !== "ALL" && mongoose.Types.ObjectId.isValid(clientId)) {
    matchConditions.effectiveClientId = new mongoose.Types.ObjectId(clientId);
  }

  if (caseId && caseId !== "ALL" && mongoose.Types.ObjectId.isValid(caseId)) {
    matchConditions.caseId = new mongoose.Types.ObjectId(caseId);
  }

  if (paymentMethod && paymentMethod !== "ALL") {
    matchConditions.paymentMethod = paymentMethod;
  }

  if (expenseCategory && expenseCategory !== "ALL") {
    matchConditions.expenseCategory = expenseCategory;
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
    matchConditions.transactionDate = dateQuery;
  }

  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      matchConditions.$or = [
        { clientName: searchRegex },
        { clientNumber: searchRegex },
        { caseTitle: searchRegex },
        { caseReference: searchRegex },
        { description: searchRegex },
        { referenceNumber: searchRegex },
        { moneyReceiptNumber: searchRegex },
      ];
    }
  }

  if (Object.keys(matchConditions).length > 0) {
    pipeline.push({ $match: matchConditions });
  }

  // Sorting
  const sortMap: Record<FinancialSortOption, Record<string, 1 | -1>> = {
    [FINANCIAL_SORT_OPTIONS.NEWEST_DATE]: { transactionDate: -1, _id: -1 },
    [FINANCIAL_SORT_OPTIONS.OLDEST_DATE]: { transactionDate: 1, _id: 1 },
    [FINANCIAL_SORT_OPTIONS.AMOUNT_DESC]: { amount: -1, transactionDate: -1 },
    [FINANCIAL_SORT_OPTIONS.AMOUNT_ASC]: { amount: 1, transactionDate: -1 },
    [FINANCIAL_SORT_OPTIONS.NEWEST_CREATED]: { createdAt: -1 },
  };

  const sortOption = sortMap[sort as FinancialSortOption] || { transactionDate: -1, _id: -1 };
  const skip = (page - 1) * limit;

  // Facet pipeline for items, totalCount, and financial statistics
  pipeline.push({
    $facet: {
      items: [
        { $sort: sortOption },
        { $skip: skip },
        { $limit: limit },
        // Lookup receipt asset reference
        {
          $lookup: {
            from: "asset_references",
            localField: "receiptAssetId",
            foreignField: "_id",
            as: "receiptRef",
          },
        },
        {
          $addFields: {
            receiptDoc: { $arrayElemAt: ["$receiptRef", 0] },
          },
        },
        // Lookup asset file
        {
          $lookup: {
            from: "assets",
            localField: "receiptDoc.assetId",
            foreignField: "_id",
            as: "assetDocs",
          },
        },
        {
          $addFields: {
            "receiptDoc.assetDoc": { $arrayElemAt: ["$assetDocs", 0] },
          },
        },
        // Lookup recording user
        {
          $lookup: {
            from: "users",
            localField: "recordedBy",
            foreignField: "_id",
            pipeline: [{ $project: { name: 1, email: 1 } }],
            as: "userDoc",
          },
        },
      ],
      totalCount: [{ $count: "count" }],
      stats: [
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: {
                $cond: [{ $eq: ["$recordType", "PAYMENT"] }, "$amount", 0],
              },
            },
            totalExpense: {
              $sum: {
                $cond: [{ $eq: ["$recordType", "EXPENSE"] }, "$amount", 0],
              },
            },
            paymentCount: {
              $sum: {
                $cond: [{ $eq: ["$recordType", "PAYMENT"] }, 1, 0],
              },
            },
            expenseCount: {
              $sum: {
                $cond: [{ $eq: ["$recordType", "EXPENSE"] }, 1, 0],
              },
            },
          },
        },
      ],
      methodBreakdown: [
        {
          $match: {
            recordType: "PAYMENT",
            paymentMethod: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$paymentMethod",
            amount: { $sum: "$amount" },
          },
        },
      ],
      categoryBreakdown: [
        {
          $match: {
            recordType: "EXPENSE",
            expenseCategory: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$expenseCategory",
            amount: { $sum: "$amount" },
          },
        },
      ],
    },
  });

  const [aggregationResult] = await ClientPayment.aggregate<{
    items: RawAggregatedRecord[];
    totalCount: { count: number }[];
    stats: {
      totalIncome: number;
      totalExpense: number;
      paymentCount: number;
      expenseCount: number;
    }[];
    methodBreakdown: { _id: PaymentMethod; amount: number }[];
    categoryBreakdown: { _id: CaseExpenseCategory; amount: number }[];
  }>(pipeline);

  const rawItems = aggregationResult?.items || [];
  const total = aggregationResult?.totalCount?.[0]?.count ?? 0;
  const rawStats = aggregationResult?.stats?.[0];

  const totalIncome = Math.round((rawStats?.totalIncome ?? 0) * 100) / 100;
  const totalExpense = Math.round((rawStats?.totalExpense ?? 0) * 100) / 100;
  const netBalance = Math.round((totalIncome - totalExpense) * 100) / 100;

  const methodBreakdown: Partial<Record<PaymentMethod, number>> = {};
  for (const item of aggregationResult?.methodBreakdown || []) {
    methodBreakdown[item._id] = item.amount;
  }

  const categoryBreakdown: Partial<Record<CaseExpenseCategory, number>> = {};
  for (const item of aggregationResult?.categoryBreakdown || []) {
    categoryBreakdown[item._id] = item.amount;
  }

  const summary: FinancialSummaryStats = {
    totalIncome,
    totalExpense,
    netBalance,
    paymentCount: rawStats?.paymentCount ?? 0,
    expenseCount: rawStats?.expenseCount ?? 0,
    totalCount: total,
    methodBreakdown,
    categoryBreakdown,
  };

  const items: UnifiedFinancialRecordDto[] = rawItems.map((record) => {
    const receiptRef = record.receiptDoc && Array.isArray(record.receiptDoc) ? record.receiptDoc[0] : (record.receiptDoc as unknown as { originalFileName?: string; assetDoc?: { secureUrl?: string; originalFilename?: string } });
    const user = record.userDoc && Array.isArray(record.userDoc) ? record.userDoc[0] : null;

    const pMethod = record.paymentMethod as PaymentMethod | null;
    const pType = record.paymentType as PaymentType | null;
    const expCat = record.expenseCategory as CaseExpenseCategory | null;

    return {
      id: record._id.toString(),
      recordType: record.recordType,
      transactionDate: new Date(record.transactionDate).toISOString(),
      amount: record.amount,
      currency: record.currency || "BDT",
      clientId: record.clientId ? record.clientId.toString() : null,
      clientName: record.clientName || null,
      clientNumber: record.clientNumber || null,
      caseId: record.caseId ? record.caseId.toString() : null,
      caseTitle: record.caseTitle || null,
      caseReference: record.caseReference || null,
      paymentMethod: pMethod,
      paymentMethodLabel: pMethod ? PAYMENT_METHOD_LABELS[pMethod] || pMethod : null,
      paymentType: pType,
      paymentTypeLabel: pType ? PAYMENT_TYPE_LABELS[pType] || pType : null,
      expenseCategory: expCat,
      expenseCategoryLabel: expCat ? CASE_EXPENSE_CATEGORY_LABELS[expCat] || expCat : null,
      referenceNumber: record.referenceNumber || null,
      moneyReceiptNumber: record.moneyReceiptNumber || null,
      description: record.description || null,
      receiptAssetId: record.receiptAssetId ? record.receiptAssetId.toString() : null,
      receiptUrl: receiptRef?.assetDoc?.secureUrl || null,
      receiptFileName: receiptRef?.originalFileName || receiptRef?.assetDoc?.originalFilename || null,
      recordedBy: user
        ? {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          }
        : null,
      createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : "",
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : "",
    };
  });

  const response: FinancialPaginationResponse = {
    items,
    summary,
    total,
    page,
    limit: limit as FinancialPageLimit,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: page * limit < total,
  };

  return NextResponse.json(response);
});
