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
import { Client } from "@/db/models/Client.model";
import { Case } from "@/db/models/Case.model";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES, ASSET_PURPOSES } from "@/const/asset-reference.const";
import { AssetType } from "@/const/asset.const";
import {
  CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT,
  CLIENT_PAYMENT_SORT_OPTIONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  ClientPaymentPageLimit,
  ClientPaymentSortOption,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import {
  createClientPaymentSchema,
  clientPaymentQueryFilterSchema,
} from "@/utils/zod/client-payment.validation";
import { formatSafeIsoDate } from "@/app/api/v1/clients/route";
import type {
  ClientPaymentItemDto,
  ClientPaymentPaginationResponse,
  ClientPaymentActionResponse,
  ClientPaymentSummaryStats,
} from "@/types/client-payment.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export interface RawClientPaymentInput {
  _id?: unknown;
  id?: string;
  clientId?: unknown;
  caseId?: unknown;
  paymentDate?: Date | string | null;
  amount?: number | null;
  currency?: string | null;
  paymentMethod?: PaymentMethod | string | null;
  paymentType?: PaymentType | string | null;
  referenceNumber?: string | null;
  moneyReceiptNumber?: string | null;
  receiptAssetreferenceId?: unknown;
  receiptAssetReferenceId?: unknown;
  notes?: string | null;
  receivedBy?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface PopulatedCaseInfo {
  _id?: mongoose.Types.ObjectId | string;
  internalReference?: string;
  caseNumber?: string;
  title?: string;
}

export interface PopulatedReceiptAssetRef {
  _id?: mongoose.Types.ObjectId | string;
  originalFileName?: string | null;
  assetId?: {
    _id?: mongoose.Types.ObjectId | string;
    secureUrl?: string | null;
    originalFilename?: string | null;
    assetType?: AssetType | string | null;
    mimeType?: string | null;
    bytes?: number | null;
  } | null;
}

export interface PopulatedReceivedByUser {
  _id?: mongoose.Types.ObjectId | string;
  id?: string;
  name?: string | null;
  email?: string | null;
}

/**
 * Format a raw or lean ClientPayment record into a clean, strongly-typed ClientPaymentItemDto.
 * Strips internal metadata, ensures IDs are valid strings, and serializes all required client fields.
 */
export function formatClientPaymentItem(
  payment: RawClientPaymentInput,
  caseDoc?: PopulatedCaseInfo | null,
  receiptRef?: PopulatedReceiptAssetRef | null,
  receivedByUser?: PopulatedReceivedByUser | null
): ClientPaymentItemDto {
  const method = (payment.paymentMethod as PaymentMethod) || PAYMENT_METHODS.CASH;
  const pType = (payment.paymentType as PaymentType) || PAYMENT_TYPES.CASE_PROFESSIONAL_FEE;

  // Resolve case info
  const resolvedCase =
    caseDoc !== undefined
      ? caseDoc
      : payment.caseId && typeof payment.caseId === "object"
      ? (payment.caseId as PopulatedCaseInfo)
      : null;

  const caseIdStr =
    resolvedCase && "_id" in resolvedCase && resolvedCase._id
      ? String(resolvedCase._id)
      : payment.caseId && typeof payment.caseId !== "object"
      ? String(payment.caseId)
      : null;

  const caseRef = resolvedCase
    ? resolvedCase.caseNumber || resolvedCase.internalReference || null
    : null;

  // Resolve receipt and physical asset info
  const resolvedReceiptRef =
    receiptRef !== undefined
      ? receiptRef
      : payment.receiptAssetreferenceId && typeof payment.receiptAssetreferenceId === "object"
      ? (payment.receiptAssetreferenceId as PopulatedReceiptAssetRef)
      : null;

  const receiptRefIdStr =
    resolvedReceiptRef && "_id" in resolvedReceiptRef && resolvedReceiptRef._id
      ? String(resolvedReceiptRef._id)
      : payment.receiptAssetreferenceId && typeof payment.receiptAssetreferenceId !== "object"
      ? String(payment.receiptAssetreferenceId)
      : payment.receiptAssetReferenceId && typeof payment.receiptAssetReferenceId !== "object"
      ? String(payment.receiptAssetReferenceId)
      : null;

  const asset =
    resolvedReceiptRef?.assetId && typeof resolvedReceiptRef.assetId === "object"
      ? resolvedReceiptRef.assetId
      : null;

  // Resolve receiving user info
  const resolvedReceivedBy =
    receivedByUser !== undefined
      ? receivedByUser
      : payment.receivedBy && typeof payment.receivedBy === "object"
      ? (payment.receivedBy as PopulatedReceivedByUser)
      : null;

  const receivedByDto =
    resolvedReceivedBy && resolvedReceivedBy.name
      ? {
          id: resolvedReceivedBy._id
            ? String(resolvedReceivedBy._id)
            : String(resolvedReceivedBy.id || ""),
          name: String(resolvedReceivedBy.name),
          email: String(resolvedReceivedBy.email || ""),
        }
      : null;

  const idStr = payment._id ? String(payment._id) : payment.id ? String(payment.id) : "";
  const clientIdStr = payment.clientId
    ? typeof payment.clientId === "object" && payment.clientId !== null && "_id" in payment.clientId
      ? String(payment.clientId._id)
      : String(payment.clientId)
    : "";

  return {
    id: idStr,
    clientId: clientIdStr,
    caseId: caseIdStr,
    caseReference: caseRef,
    caseTitle: resolvedCase?.title || null,
    paymentDate: formatSafeIsoDate(payment.paymentDate) || new Date().toISOString(),
    amount: typeof payment.amount === "number" ? payment.amount : Number(payment.amount) || 0,
    currency: (payment.currency as string) || "BDT",
    paymentMethod: method,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[method] || String(method),
    paymentType: pType,
    paymentTypeLabel: PAYMENT_TYPE_LABELS[pType] || String(pType),
    referenceNumber: (payment.referenceNumber as string) || null,
    moneyReceiptNumber: (payment.moneyReceiptNumber as string) || null,
    receiptAssetreferenceId: receiptRefIdStr,
    receiptAssetReferenceId: receiptRefIdStr,
    receiptUrl: asset?.secureUrl || null,
    receiptFileName: resolvedReceiptRef?.originalFileName || asset?.originalFilename || null,
    receiptAssetType: (asset?.assetType as AssetType) || null,
    receiptMimeType: asset?.mimeType || null,
    receiptSizeBytes: typeof asset?.bytes === "number" ? asset.bytes : null,
    notes: (payment.notes as string) || null,
    receivedBy: receivedByDto,
    createdAt: formatSafeIsoDate(payment.createdAt) || new Date().toISOString(),
    updatedAt: formatSafeIsoDate(payment.updatedAt) || new Date().toISOString(),
  };
}

/**
 * GET /api/v1/clients/[id]/payments
 *
 * List all payments for a specific client with pagination, filters, and single-pipeline financial summary.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid client ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const clientExists = await Client.exists({ _id: objectId, deletedAt: null });
    if (!clientExists) {
      throw ApiError.notFound("Client not found");
    }

    const { searchParams } = new URL(req.url);

    const rawParams = {
      search: sanitizeSearchParam(searchParams.get("search")),
      paymentMethod: searchParams.get("paymentMethod") || undefined,
      paymentType: searchParams.get("paymentType") || undefined,
      caseId: searchParams.get("caseId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sort: searchParams.get("sort") || CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_PAYMENT,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || CLIENT_PAYMENT_DEFAULT_PAGE_LIMIT,
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

    // Single consolidated parallel execution for paginated payments and faceted breakdowns
    const [total, payments, aggResult] = await Promise.all([
      ClientPayment.countDocuments(filter),
      ClientPayment.find(filter)
        .select(
          "_id clientId caseId paymentDate amount currency paymentMethod paymentType referenceNumber moneyReceiptNumber receiptAssetreferenceId notes receivedBy createdAt updatedAt"
        )
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate<{
          caseId: { _id: mongoose.Types.ObjectId; internalReference?: string; caseNumber?: string; title?: string };
        }>({
          path: "caseId",
          select: "_id internalReference caseNumber title",
        })
        .populate<{
          receiptAssetreferenceId: {
            _id: mongoose.Types.ObjectId;
            originalFileName?: string | null;
            assetId?: {
              _id: mongoose.Types.ObjectId;
              secureUrl: string;
              originalFilename?: string | null;
              assetType?: AssetType | null;
              mimeType?: string | null;
              bytes?: number | null;
            } | null;
          };
        }>({
          path: "receiptAssetreferenceId",
          select: "_id originalFileName assetId",
          populate: {
            path: "assetId",
            select: "_id secureUrl originalFilename assetType mimeType bytes",
          },
        })
        .populate<{
          receivedBy: { _id: mongoose.Types.ObjectId; name: string; email: string };
        }>({
          path: "receivedBy",
          select: "_id name email",
        })
        .lean(),
      ClientPayment.aggregate<{
        summary: Array<{ totalAmount: number; totalCount: number }>;
        byMethod: Array<{ _id: PaymentMethod; amount: number }>;
        byType: Array<{ _id: PaymentType; amount: number }>;
      }>([
        { $match: { clientId: objectId } },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: "$amount" },
                  totalCount: { $sum: 1 },
                },
              },
            ],
            byMethod: [
              {
                $group: {
                  _id: "$paymentMethod",
                  amount: { $sum: "$amount" },
                },
              },
            ],
            byType: [
              {
                $group: {
                  _id: "$paymentType",
                  amount: { $sum: "$amount" },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const methodBreakdown: Partial<Record<PaymentMethod, number>> = {};
    if (aggResult[0]?.byMethod) {
      for (const item of aggResult[0].byMethod) {
        methodBreakdown[item._id] = item.amount;
      }
    }

    const typeBreakdown: Partial<Record<PaymentType, number>> = {};
    if (aggResult[0]?.byType) {
      for (const item of aggResult[0].byType) {
        typeBreakdown[item._id] = item.amount;
      }
    }

    const summary: ClientPaymentSummaryStats = {
      totalCount: aggResult[0]?.summary[0]?.totalCount ?? 0,
      totalAmount: aggResult[0]?.summary[0]?.totalAmount ?? 0,
      methodBreakdown,
      typeBreakdown,
    };

    const items: ClientPaymentItemDto[] = payments.map((p) =>
      formatClientPaymentItem(
        p,
        p.caseId as unknown as PopulatedCaseInfo,
        p.receiptAssetreferenceId as unknown as PopulatedReceiptAssetRef,
        p.receivedBy as unknown as PopulatedReceivedByUser
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
 * Record a new client payment. Enforces relationship validity, claims receipt references,
 * and records an audit log.
 */
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const currentUserId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid client ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const client = await Client.findOne({ _id: objectId, deletedAt: null })
      .select("_id name")
      .lean();
    if (!client) {
      throw ApiError.notFound("Client not found");
    }

    const body = await req.json();
    const validated = createClientPaymentSchema.parse(body);

    // If caseId is provided, enforce relationship integrity:
    // Case must exist, be active, and belong to this specific client
    let caseObjectId: mongoose.Types.ObjectId | null = null;
    if (validated.caseId) {
      caseObjectId = new mongoose.Types.ObjectId(validated.caseId);
      const linkedCase = await Case.findOne({
        _id: caseObjectId,
        clientId: objectId,
        deletedAt: null,
      })
        .select("_id")
        .lean();

      if (!linkedCase) {
        throw ApiError.badRequest(
          "The specified case does not exist or does not belong to this client."
        );
      }
    }

    // If receipt asset reference is provided, verify it exists, is active, and belongs to this client
    const receiptRefId = validated.receiptAssetreferenceId ?? validated.receiptAssetReferenceId;
    let receiptObjectId: mongoose.Types.ObjectId | null = null;
    if (receiptRefId) {
      receiptObjectId = new mongoose.Types.ObjectId(receiptRefId);
      const receiptRef = await AssetReference.findOne({
        _id: receiptObjectId,
        deletedAt: null,
      })
        .select("_id ownerId ownerType")
        .lean();

      if (!receiptRef) {
        throw ApiError.badRequest("The referenced receipt file does not exist or was deleted.");
      }

      // Security: Ensure the asset reference is not owned by a different client
      if (
        receiptRef.ownerId &&
        (receiptRef.ownerType === ASSET_OWNER_TYPES.CLIENT_PAYMENT ||
          receiptRef.ownerType === ASSET_OWNER_TYPES.CLIENT) &&
        !receiptRef.ownerId.equals(objectId)
      ) {
        throw ApiError.badRequest("The referenced receipt file belongs to another client.");
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
            purpose: ASSET_PURPOSES.PAYMENT_MONEY_RECEIPT,
          },
          { session: dbSession, select: "_id" }
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

    // Populate with precise projections for clean response
    const populated = await ClientPayment.findById(createdPayment._id)
      .select(
        "_id clientId caseId paymentDate amount currency paymentMethod paymentType referenceNumber moneyReceiptNumber receiptAssetreferenceId notes receivedBy createdAt updatedAt"
      )
      .populate<{
        caseId: { _id: mongoose.Types.ObjectId; internalReference?: string; caseNumber?: string; title?: string };
      }>({
        path: "caseId",
        select: "_id internalReference caseNumber title",
      })
      .populate<{
        receiptAssetreferenceId: {
          _id: mongoose.Types.ObjectId;
          originalFileName?: string | null;
          assetId?: {
            _id: mongoose.Types.ObjectId;
            secureUrl: string;
            originalFilename?: string | null;
            assetType?: AssetType | null;
            mimeType?: string | null;
            bytes?: number | null;
          } | null;
        };
      }>({
        path: "receiptAssetreferenceId",
        select: "_id originalFileName assetId",
        populate: {
          path: "assetId",
          select: "_id secureUrl originalFilename assetType mimeType bytes",
        },
      })
      .populate<{
        receivedBy: { _id: mongoose.Types.ObjectId; name: string; email: string };
      }>({
        path: "receivedBy",
        select: "_id name email",
      })
      .lean();

    if (!populated) {
      throw ApiError.internal("Failed to retrieve created client payment.");
    }

    const itemDto = formatClientPaymentItem(
      populated,
      populated.caseId as unknown as PopulatedCaseInfo,
      populated.receiptAssetreferenceId as unknown as PopulatedReceiptAssetRef,
      populated.receivedBy as unknown as PopulatedReceivedByUser
    );

    // Record audit log for payment creation
    await recordAuditLog({
      req,
      userId: currentUserId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.CLIENT_PAYMENT,
      entityId: createdPayment._id,
      oldValues: null,
      newValues: createdPayment.toObject(),
      description: `Recorded payment of ${itemDto.amount} ${itemDto.currency} for client "${client.name}"`,
    });

    const response: ClientPaymentActionResponse = {
      success: true,
      message: `Payment of ${itemDto.amount} ${itemDto.currency} recorded successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response, { status: 201 });
  }
);

