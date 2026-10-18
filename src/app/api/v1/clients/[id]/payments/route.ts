import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import { Client } from "@/db/models/Client.model";
import { Case } from "@/db/models/Case.model";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT,
  CLIENT_PAYMENT_PAGE_LIMITS,
  CLIENT_PAYMENT_SORT_OPTIONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  ClientPaymentPageLimit,
  ClientPaymentSortOption,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import {
  createClientPaymentSchema,
  clientPaymentQueryFilterSchema,
} from "@/utils/zod/client-payment.validation";
import type {
  ClientPaymentItemDto,
  ClientPaymentPaginationResponse,
  ClientPaymentActionResponse,
  ClientPaymentSummaryStats,
} from "@/types/client-payment.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";
import ConnectDB from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Format a ClientPayment record into ClientPaymentItemDto.
 */
function formatClientPaymentItem(
  payment: Record<string, unknown>,
  caseDoc?: { internalReference?: string; caseNumber?: string; title?: string } | null,
  receiptRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null,
  receivedByUser?: { _id: mongoose.Types.ObjectId; name: string; email: string } | null
): ClientPaymentItemDto {
  const method = payment.paymentMethod as PaymentMethod;
  const pType = payment.paymentType as PaymentType;
  const caseRef = caseDoc
    ? caseDoc.caseNumber || caseDoc.internalReference || null
    : null;

  const asset = receiptRef?.assetId;

  return {
    id: (payment._id as mongoose.Types.ObjectId).toString(),
    clientId: (payment.clientId as mongoose.Types.ObjectId).toString(),
    caseId: payment.caseId ? (payment.caseId as mongoose.Types.ObjectId).toString() : null,
    caseReference: caseRef,
    caseTitle: caseDoc?.title || null,
    paymentDate: new Date(payment.paymentDate as Date).toISOString(),
    amount: payment.amount as number,
    currency: (payment.currency as string) || "BDT",
    paymentMethod: method,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[method] || String(payment.paymentMethod),
    paymentType: pType,
    paymentTypeLabel: PAYMENT_TYPE_LABELS[pType] || String(payment.paymentType),
    referenceNumber: (payment.referenceNumber as string) || null,
    moneyReceiptNumber: (payment.moneyReceiptNumber as string) || null,
    receiptAssetreferenceId: payment.receiptAssetreferenceId
      ? (payment.receiptAssetreferenceId as mongoose.Types.ObjectId).toString()
      : null,
    receiptUrl: asset?.secureUrl || null,
    receiptFileName: receiptRef?.originalFileName || asset?.originalFilename || null,
    notes: (payment.notes as string) || null,
    receivedBy: receivedByUser
      ? {
          id: receivedByUser._id.toString(),
          name: receivedByUser.name,
          email: receivedByUser.email,
        }
      : null,
    createdAt: payment.createdAt ? new Date(payment.createdAt as Date).toISOString() : "",
    updatedAt: payment.updatedAt ? new Date(payment.updatedAt as Date).toISOString() : "",
  };
}

/**
 * GET /api/v1/clients/[id]/payments
 *
 * List all payments for a specific client with pagination, filters, and financial summary.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid client ID format");
    }

    await ConnectDB();

    const objectId = new mongoose.Types.ObjectId(id);
    const clientExists = await Client.exists({ _id: objectId, deletedAt: null });
    if (!clientExists) {
      throw ApiError.notFound("Client not found");
    }

    const { searchParams } = new URL(req.url);

    // Validate limit parameter if provided
    const rawLimit = searchParams.get("limit");
    if (rawLimit !== null) {
      const parsedLimit = parseInt(rawLimit, 10);
      if (!CLIENT_PAYMENT_PAGE_LIMITS.includes(parsedLimit as ClientPaymentPageLimit)) {
        throw ApiError.badRequest(
          `Invalid page limit "${rawLimit}". Allowed page limits are: ${CLIENT_PAYMENT_PAGE_LIMITS.join(", ")}`
        );
      }
    }

    const rawParams = {
      search: sanitizeSearchParam(searchParams.get("search")),
      paymentMethod: searchParams.get("paymentMethod") || undefined,
      paymentType: searchParams.get("paymentType") || undefined,
      caseId: searchParams.get("caseId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sort: searchParams.get("sort") || CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_PAYMENT,
      page: searchParams.get("page") || 1,
      limit: rawLimit ? parseInt(rawLimit, 10) : CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT,
    };

    const parsed = clientPaymentQueryFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }

    const {
      search,
      paymentMethod,
      paymentType,
      caseId,
      startDate,
      endDate,
      sort,
      page,
      limit,
    } = parsed.data;

    const filter: Record<string, unknown> = {
      clientId: objectId,
    };

    if (paymentMethod && paymentMethod !== "ALL") {
      filter.paymentMethod = paymentMethod;
    }

    if (paymentType && paymentType !== "ALL") {
      filter.paymentType = paymentType;
    }

    if (caseId && caseId !== "ALL" && mongoose.Types.ObjectId.isValid(caseId)) {
      filter.caseId = new mongoose.Types.ObjectId(caseId);
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
      filter.paymentDate = dateQuery;
    }

    if (search) {
      const searchRegex = buildSearchRegex(search);
      if (searchRegex) {
        filter.$or = [
          { referenceNumber: searchRegex },
          { moneyReceiptNumber: searchRegex },
          { notes: searchRegex },
        ];
      }
    }

    const sortMap: Record<ClientPaymentSortOption, Record<string, 1 | -1>> = {
      [CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_PAYMENT]: { paymentDate: -1 },
      [CLIENT_PAYMENT_SORT_OPTIONS.OLDEST_PAYMENT]: { paymentDate: 1 },
      [CLIENT_PAYMENT_SORT_OPTIONS.AMOUNT_DESC]: { amount: -1 },
      [CLIENT_PAYMENT_SORT_OPTIONS.AMOUNT_ASC]: { amount: 1 },
      [CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_CREATED]: { createdAt: -1 },
    };

    const sortOption = sortMap[sort as ClientPaymentSortOption] || { paymentDate: -1 };
    const skip = (page - 1) * limit;

    // Parallel execution for paginated payments and client summary aggregates
    const [total, payments, summaryAgg] = await Promise.all([
      ClientPayment.countDocuments(filter),
      ClientPayment.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate<{
          caseId: { internalReference: string; caseNumber: string; title: string };
        }>("caseId", "internalReference caseNumber title")
        .populate<{
          receiptAssetreferenceId: IAssetReferenceDocument & { assetId: IAsset };
        }>({
          path: "receiptAssetreferenceId",
          populate: { path: "assetId" },
        })
        .populate<{
          receivedBy: { _id: mongoose.Types.ObjectId; name: string; email: string };
        }>("receivedBy", "name email")
        .lean(),
      ClientPayment.aggregate<{
        _id: null;
        totalAmount: number;
        totalCount: number;
      }>([
        { $match: { clientId: objectId } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Compute breakdown aggregates by paymentMethod and paymentType for this client
    const [methodAgg, typeAgg] = await Promise.all([
      ClientPayment.aggregate<{ _id: PaymentMethod; amount: number }>([
        { $match: { clientId: objectId } },
        { $group: { _id: "$paymentMethod", amount: { $sum: "$amount" } } },
      ]),
      ClientPayment.aggregate<{ _id: PaymentType; amount: number }>([
        { $match: { clientId: objectId } },
        { $group: { _id: "$paymentType", amount: { $sum: "$amount" } } },
      ]),
    ]);

    const methodBreakdown: Partial<Record<PaymentMethod, number>> = {};
    for (const item of methodAgg) {
      methodBreakdown[item._id] = item.amount;
    }

    const typeBreakdown: Partial<Record<PaymentType, number>> = {};
    for (const item of typeAgg) {
      typeBreakdown[item._id] = item.amount;
    }

    const summary: ClientPaymentSummaryStats = {
      totalCount: summaryAgg[0]?.totalCount ?? 0,
      totalAmount: summaryAgg[0]?.totalAmount ?? 0,
      methodBreakdown,
      typeBreakdown,
    };

    const items: ClientPaymentItemDto[] = payments.map((p) =>
      formatClientPaymentItem(
        p,
        p.caseId as unknown as { internalReference?: string; caseNumber?: string; title?: string },
        p.receiptAssetreferenceId as unknown as (IAssetReferenceDocument & { assetId?: IAsset }),
        p.receivedBy as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string }
      )
    );

    const response: ClientPaymentPaginationResponse = {
      items,
      summary,
      total,
      page,
      limit: limit as ClientPaymentPageLimit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    };

    return NextResponse.json(response);
  }
);

/**
 * POST /api/v1/clients/[id]/payments
 *
 * Record a new client payment. Enforces relationship validity (if caseId is provided,
 * verifies it belongs to this client).
 */
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const currentUserId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid client ID format");
    }

    await ConnectDB();

    const objectId = new mongoose.Types.ObjectId(id);
    const client = await Client.findOne({ _id: objectId, deletedAt: null });
    if (!client) {
      throw ApiError.notFound("Client not found");
    }

    const body = await req.json();
    const validated = createClientPaymentSchema.parse(body);

    // If caseId is provided, enforce relationship integrity:
    // Case must belong to this specific client!
    let caseObjectId: mongoose.Types.ObjectId | null = null;
    if (validated.caseId) {
      caseObjectId = new mongoose.Types.ObjectId(validated.caseId);
      const linkedCase = await Case.findOne({
        _id: caseObjectId,
        clientId: objectId,
        deletedAt: null,
      });

      if (!linkedCase) {
        throw ApiError.badRequest(
          "The specified case does not exist or does not belong to this client."
        );
      }
    }

    // If receipt asset reference is provided, verify it exists
    let receiptObjectId: mongoose.Types.ObjectId | null = null;
    if (validated.receiptAssetreferenceId) {
      receiptObjectId = new mongoose.Types.ObjectId(validated.receiptAssetreferenceId);
      const receiptRef = await AssetReference.findOne({
        _id: receiptObjectId,
        deletedAt: null,
      });

      if (!receiptRef) {
        throw ApiError.badRequest("The referenced receipt file does not exist or was deleted.");
      }
    }

    const userId = new mongoose.Types.ObjectId(currentUserId);

    // Create payment inside transaction
    const createdPayment = await withTransaction(async (dbSession) => {
      // If receipt is provided, link it to client payment
      if (receiptObjectId) {
        await AssetReference.findByIdAndUpdate(
          receiptObjectId,
          {
            ownerType: ASSET_OWNER_TYPES.CLIENT_PAYMENT,
            ownerId: objectId,
          },
          { session: dbSession }
        );
      }

      const [payment] = await ClientPayment.create(
        [
          {
            clientId: objectId,
            caseId: caseObjectId,
            paymentDate: new Date(validated.paymentDate),
            amount: validated.amount,
            currency: validated.currency || "BDT",
            paymentMethod: validated.paymentMethod,
            paymentType: validated.paymentType,
            referenceNumber: validated.referenceNumber?.trim() || null,
            receiptAssetreferenceId: receiptObjectId,
            moneyReceiptNumber: validated.moneyReceiptNumber?.trim() || null,
            notes: validated.notes?.trim() || null,
            receivedBy: userId,
          },
        ],
        { session: dbSession }
      );

      return payment;
    });

    // Populate for response
    const populated = await ClientPayment.findById(createdPayment._id)
      .populate<{
        caseId: { internalReference: string; caseNumber: string; title: string };
      }>("caseId", "internalReference caseNumber title")
      .populate<{
        receiptAssetreferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "receiptAssetreferenceId",
        populate: { path: "assetId" },
      })
      .populate<{
        receivedBy: { _id: mongoose.Types.ObjectId; name: string; email: string };
      }>("receivedBy", "name email")
      .lean();

    const itemDto = formatClientPaymentItem(
      populated!,
      populated!.caseId as unknown as { internalReference?: string; caseNumber?: string; title?: string },
      populated!.receiptAssetreferenceId as unknown as (IAssetReferenceDocument & { assetId?: IAsset }),
      populated!.receivedBy as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string }
    );

    const response: ClientPaymentActionResponse = {
      success: true,
      message: `Payment of ${itemDto.amount} ${itemDto.currency} recorded successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response, { status: 201 });
  }
);
