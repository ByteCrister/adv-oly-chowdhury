import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { sanitizeSearchParam } from "@/lib/helpers/search.helper";
import {
  buildFuzzySearchPatterns,
  buildFinancialRelevanceStages,
  matchFinancialMetadata,
} from "@/lib/helpers/fuzzy-searching";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { COLLECTIONS } from "@/const/collection.const";
import {
  FINANCIAL_DEFAULT_PAGE_LIMIT,
  FINANCIAL_RECORD_TYPES,
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
import { AssetType } from "@/const/asset.const";
import { financialQueryFilterSchema } from "@/utils/zod/financial.validation";
import type {
  UnifiedFinancialRecordDto,
  FinancialPaginationResponse,
  FinancialSummaryStats,
} from "@/types/financial.types";

/**
 * Safely converts any date representation into an ISO string or empty string.
 * Protects against RangeError: Invalid time value exceptions.
 */
function toIsoDateString(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string | number | Date);
  return !isNaN(d.getTime()) ? d.toISOString() : "";
}

interface RawAggregatedRecord {
  _id: mongoose.Types.ObjectId;
  recordType: typeof FINANCIAL_RECORD_TYPES.PAYMENT | typeof FINANCIAL_RECORD_TYPES.EXPENSE;
  transactionDate: Date | string;
  amount: number;
  currency: string;
  clientId?: mongoose.Types.ObjectId | string | null;
  clientName?: string | null;
  clientNumber?: string | null;
  caseId?: mongoose.Types.ObjectId | string | null;
  caseTitle?: string | null;
  caseReference?: string | null;
  paymentMethod?: PaymentMethod | null;
  paymentType?: PaymentType | null;
  expenseCategory?: CaseExpenseCategory | null;
  referenceNumber?: string | null;
  moneyReceiptNumber?: string | null;
  description?: string | null;
  receiptAssetId?: mongoose.Types.ObjectId | string | null;
  receiptDoc?: {
    originalFileName?: string;
    assetDoc?: {
      secureUrl?: string;
      originalFilename?: string;
      assetType?: AssetType | string;
      mimeType?: string;
      bytes?: number;
    };
  } | null;
  recordedByUser?: { _id: mongoose.Types.ObjectId | string; name: string; email: string } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * GET /api/v1/financials
 *
 * Unified financial ledger endpoint combining Client Payments and Case Expenses.
 * Uses high-performance MongoDB aggregation with index-backed early filtering,
 * projected lookups, $unionWith, $facet, server-side search, sorting, and pagination.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const { searchParams } = new URL(req.url);

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
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : FINANCIAL_DEFAULT_PAGE_LIMIT,
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

  // Build index-backed early match filters for each union branch
  const paymentEarlyMatch: Record<string, unknown> = {};
  const expenseEarlyMatch: Record<string, unknown> = {};

  // 1. Record Type early exclusion
  if (recordType === FINANCIAL_RECORD_TYPES.PAYMENT) {
    expenseEarlyMatch._id = null; // Exclude all expenses at source
  } else if (recordType === FINANCIAL_RECORD_TYPES.EXPENSE) {
    paymentEarlyMatch._id = null; // Exclude all payments at source
  }

  // 2. Date Range early filter
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
    paymentEarlyMatch.paymentDate = dateQuery;
    expenseEarlyMatch.expenseDate = dateQuery;
  }

  // 3. Case ID early filter
  if (caseId && caseId !== "ALL" && mongoose.Types.ObjectId.isValid(caseId)) {
    const caseObjId = new mongoose.Types.ObjectId(caseId);
    paymentEarlyMatch.caseId = caseObjId;
    expenseEarlyMatch.caseId = caseObjId;
  }

  // 4. Payment Method early filter
  if (paymentMethod && paymentMethod !== "ALL") {
    paymentEarlyMatch.paymentMethod = paymentMethod;
    expenseEarlyMatch._id = null; // Expenses never have a payment method
  }

  // 5. Expense Category early filter
  if (expenseCategory && expenseCategory !== "ALL") {
    expenseEarlyMatch.category = expenseCategory;
    paymentEarlyMatch._id = null; // Payments never have an expense category
  }

  // 6. Client ID early filter for ClientPayment (which has direct indexed clientId)
  if (clientId && clientId !== "ALL" && mongoose.Types.ObjectId.isValid(clientId)) {
    paymentEarlyMatch.clientId = new mongoose.Types.ObjectId(clientId);
  }

  // Build the ClientPayment branch of the union pipeline
  const paymentProjectStage: mongoose.PipelineStage = {
    $project: {
      _id: 1,
      recordType: { $literal: FINANCIAL_RECORD_TYPES.PAYMENT },
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
  const expenseProjectStage: mongoose.PipelineStage = {
    $project: {
      _id: 1,
      recordType: { $literal: FINANCIAL_RECORD_TYPES.EXPENSE },
      transactionDate: "$expenseDate",
      amount: "$amount",
      currency: "$currency",
      clientId: { $literal: null }, // Will be resolved from linked case
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
  const pipeline: mongoose.PipelineStage[] = [];

  // Early filter on ClientPayment
  if (Object.keys(paymentEarlyMatch).length > 0) {
    pipeline.push({ $match: paymentEarlyMatch });
  }
  pipeline.push(paymentProjectStage);

  // Early filter and projection on CaseExpense
  const expensePipeline: mongoose.PipelineStage.UnionWithPipelineStage[] = [];
  if (Object.keys(expenseEarlyMatch).length > 0) {
    expensePipeline.push({ $match: expenseEarlyMatch });
  }
  expensePipeline.push(expenseProjectStage);

  // Union with CaseExpense
  pipeline.push({
    $unionWith: {
      coll: COLLECTIONS.CASE_EXPENSES,
      pipeline: expensePipeline,
    },
  });

  // Lookup case details with strict field projection
  pipeline.push(
    {
      $lookup: {
        from: COLLECTIONS.CASES,
        localField: "caseId",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              clientId: 1,
              caseNumber: 1,
              internalReference: 1,
              title: 1,
              caseCategory: 1,
              opposingCounsel: 1,
              description: 1,
              legalIssues: 1,
              deletedAt: 1,
            },
          },
        ],
        as: "caseDocs",
      },
    },
    {
      $addFields: {
        caseDoc: { $arrayElemAt: ["$caseDocs", 0] },
      },
    },
    {
      $project: {
        caseDocs: 0,
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
    // Lookup client details with strict field projection
    {
      $lookup: {
        from: COLLECTIONS.CLIENTS,
        localField: "effectiveClientId",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              clientNumber: 1,
              name: 1,
              organizationName: 1,
              phone: 1,
              alternatePhone: 1,
              email: 1,
              deletedAt: 1,
            },
          },
        ],
        as: "clientDocs",
      },
    },
    {
      $addFields: {
        clientDoc: { $arrayElemAt: ["$clientDocs", 0] },
      },
    },
    {
      $project: {
        clientDocs: 0,
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
    }
  );

  // Post-lookup match filter for effective client ID (applies to expenses resolved through case)
  if (clientId && clientId !== "ALL" && mongoose.Types.ObjectId.isValid(clientId)) {
    pipeline.push({
      $match: {
        effectiveClientId: new mongoose.Types.ObjectId(clientId),
      },
    });
  }

  // Typo-tolerant fuzzy search across financial identifiers, case numbers/titles/narrative,
  // client names/numbers/contacts, descriptions, payment methods, payment types, and expense categories
  let isSearching = false;
  let relevanceStages: mongoose.PipelineStage[] = [];

  const searchPatterns = buildFuzzySearchPatterns(search);
  if (searchPatterns) {
    isSearching = true;
    const metadataMatches = matchFinancialMetadata(searchPatterns.sanitizedQuery);
    relevanceStages = buildFinancialRelevanceStages(searchPatterns, metadataMatches);
  }

  // Apply dynamic relevance scoring and positive relevance match
  if (isSearching && relevanceStages.length > 0) {
    pipeline.push(...relevanceStages);
  }

  // Project away large intermediate lookup documents and flags before faceting to free memory
  pipeline.push({
    $project: {
      caseDoc: 0,
      clientDoc: 0,
      isCaseDeleted: 0,
      isClientDeleted: 0,
    },
  });

  // Deterministic sorting with stable tie-breaker
  const sortMap: Record<FinancialSortOption, Record<string, 1 | -1>> = {
    [FINANCIAL_SORT_OPTIONS.NEWEST_DATE]: { transactionDate: -1, _id: -1 },
    [FINANCIAL_SORT_OPTIONS.OLDEST_DATE]: { transactionDate: 1, _id: 1 },
    [FINANCIAL_SORT_OPTIONS.AMOUNT_DESC]: { amount: -1, transactionDate: -1, _id: -1 },
    [FINANCIAL_SORT_OPTIONS.AMOUNT_ASC]: { amount: 1, transactionDate: 1, _id: 1 },
    [FINANCIAL_SORT_OPTIONS.NEWEST_CREATED]: { createdAt: -1, _id: -1 },
  };

  const sortOption = sortMap[sort] || { transactionDate: -1, _id: -1 };
  const itemsSort: Record<string, 1 | -1> = isSearching
    ? { relevanceScore: -1, ...sortOption }
    : sortOption;

  const skip = (page - 1) * limit;

  // Facet pipeline for items, totalCount, and financial statistics
  pipeline.push({
    $facet: {
      items: [
        { $sort: itemsSort },
        { $skip: skip },
        { $limit: limit },
        // Lookup receipt asset reference with strict projection
        {
          $lookup: {
            from: COLLECTIONS.ASSET_REFERENCES,
            localField: "receiptAssetId",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  assetId: 1,
                  originalFileName: 1,
                },
              },
            ],
            as: "receiptRef",
          },
        },
        {
          $addFields: {
            receiptDoc: { $arrayElemAt: ["$receiptRef", 0] },
          },
        },
        // Lookup asset file with strict projection
        {
          $lookup: {
            from: COLLECTIONS.ASSETS,
            localField: "receiptDoc.assetId",
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
          $addFields: {
            "receiptDoc.assetDoc": { $arrayElemAt: ["$assetDocs", 0] },
          },
        },
        // Lookup recording user with strict projection
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
            as: "userDoc",
          },
        },
        // Strictly project only the required fields for DTO mapping
        {
          $project: {
            _id: 1,
            recordType: 1,
            transactionDate: 1,
            amount: 1,
            currency: 1,
            clientId: { $ifNull: ["$clientId", "$effectiveClientId"] },
            clientName: 1,
            clientNumber: 1,
            caseId: 1,
            caseTitle: 1,
            caseReference: 1,
            paymentMethod: 1,
            paymentType: 1,
            expenseCategory: 1,
            referenceNumber: 1,
            moneyReceiptNumber: 1,
            description: 1,
            receiptAssetId: 1,
            createdAt: 1,
            updatedAt: 1,
            receiptDoc: 1,
            recordedByUser: { $arrayElemAt: ["$userDoc", 0] },
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
                $cond: [{ $eq: ["$recordType", FINANCIAL_RECORD_TYPES.PAYMENT] }, "$amount", 0],
              },
            },
            totalExpense: {
              $sum: {
                $cond: [{ $eq: ["$recordType", FINANCIAL_RECORD_TYPES.EXPENSE] }, "$amount", 0],
              },
            },
            paymentCount: {
              $sum: {
                $cond: [{ $eq: ["$recordType", FINANCIAL_RECORD_TYPES.PAYMENT] }, 1, 0],
              },
            },
            expenseCount: {
              $sum: {
                $cond: [{ $eq: ["$recordType", FINANCIAL_RECORD_TYPES.EXPENSE] }, 1, 0],
              },
            },
          },
        },
      ],
      methodBreakdown: [
        {
          $match: {
            recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
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
            recordType: FINANCIAL_RECORD_TYPES.EXPENSE,
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
    methodBreakdown[item._id] = Math.round(item.amount * 100) / 100;
  }

  const categoryBreakdown: Partial<Record<CaseExpenseCategory, number>> = {};
  for (const item of aggregationResult?.categoryBreakdown || []) {
    categoryBreakdown[item._id] = Math.round(item.amount * 100) / 100;
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
    const receiptRef = record.receiptDoc;
    const user = record.recordedByUser;

    const pMethod = record.paymentMethod as PaymentMethod | null;
    const pType = record.paymentType as PaymentType | null;
    const expCat = record.expenseCategory as CaseExpenseCategory | null;

    return {
      id: record._id.toString(),
      recordType: record.recordType,
      transactionDate: toIsoDateString(record.transactionDate),
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
      receiptAssetType: (receiptRef?.assetDoc?.assetType as AssetType) || null,
      receiptMimeType: receiptRef?.assetDoc?.mimeType || null,
      receiptSizeBytes: receiptRef?.assetDoc?.bytes || null,
      recordedBy: user
        ? {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          }
        : null,
      createdAt: toIsoDateString(record.createdAt),
      updatedAt: toIsoDateString(record.updatedAt),
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
