import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { Case } from "@/db/models/Case.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import { updateClientPaymentSchema } from "@/utils/zod/client-payment.validation";
import type {
  ClientPaymentItemDto,
  ClientPaymentActionResponse,
  ClientPaymentDeleteResponse,
} from "@/types/client-payment.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";
import ConnectDB from "@/db";

interface RouteParams {
  params: Promise<{ id: string; paymentId: string }>;
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
 * GET /api/v1/clients/[id]/payments/[paymentId]
 *
 * Retrieve details for a single client payment.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const clientObjectId = new mongoose.Types.ObjectId(id);
    const paymentObjectId = new mongoose.Types.ObjectId(paymentId);

    await ConnectDB();

    const payment = await ClientPayment.findOne({
      _id: paymentObjectId,
      clientId: clientObjectId,
    })
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

    if (!payment) {
      throw ApiError.notFound("Payment record not found for this client");
    }

    const dto = formatClientPaymentItem(
      payment,
      payment.caseId as unknown as { internalReference?: string; caseNumber?: string; title?: string },
      payment.receiptAssetreferenceId as unknown as (IAssetReferenceDocument & { assetId?: IAsset }),
      payment.receivedBy as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string }
    );

    return NextResponse.json({
      success: true,
      data: dto,
    });
  }
);

/**
 * PATCH /api/v1/clients/[id]/payments/[paymentId]
 *
 * Update an existing payment record inside a transaction.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const clientObjectId = new mongoose.Types.ObjectId(id);
    const paymentObjectId = new mongoose.Types.ObjectId(paymentId);

    const body = await req.json();
    const validated = updateClientPaymentSchema.parse(body);

    await ConnectDB();

    // If caseId is provided, enforce relationship integrity:
    // Case must belong to this specific client!
    let caseObjectId: mongoose.Types.ObjectId | null | undefined = undefined;
    if (validated.caseId !== undefined) {
      if (validated.caseId) {
        caseObjectId = new mongoose.Types.ObjectId(validated.caseId);
        const linkedCase = await Case.findOne({
          _id: caseObjectId,
          clientId: clientObjectId,
          deletedAt: null,
        });

        if (!linkedCase) {
          throw ApiError.badRequest(
            "The specified case does not exist or does not belong to this client."
          );
        }
      } else {
        caseObjectId = null;
      }
    }

    await withTransaction(async (dbSession) => {
      const payment = await ClientPayment.findOne({
        _id: paymentObjectId,
        clientId: clientObjectId,
      }).session(dbSession);

      if (!payment) {
        throw ApiError.notFound("Payment record not found for this client");
      }

      // Handle receipt file update / replacement
      if (validated.receiptAssetreferenceId !== undefined) {
        if (validated.receiptAssetreferenceId) {
          const newReceiptId = new mongoose.Types.ObjectId(validated.receiptAssetreferenceId);
          const newReceipt = await AssetReference.findOne({
            _id: newReceiptId,
            deletedAt: null,
          }).session(dbSession);

          if (!newReceipt) {
            throw ApiError.badRequest("The specified receipt file does not exist or was deleted.");
          }

          // If replacing previous receipt, soft-delete old reference
          if (
            payment.receiptAssetreferenceId &&
            !payment.receiptAssetreferenceId.equals(newReceiptId)
          ) {
            await AssetReference.findByIdAndUpdate(
              payment.receiptAssetreferenceId,
              { deletedAt: new Date() },
              { session: dbSession }
            );
          }

          newReceipt.ownerType = ASSET_OWNER_TYPES.CLIENT_PAYMENT;
          newReceipt.ownerId = clientObjectId;
          await newReceipt.save({ session: dbSession });

          payment.receiptAssetreferenceId = newReceiptId;
        } else {
          // If receipt is explicitly set to null, soft-delete previous reference
          if (payment.receiptAssetreferenceId) {
            await AssetReference.findByIdAndUpdate(
              payment.receiptAssetreferenceId,
              { deletedAt: new Date() },
              { session: dbSession }
            );
          }
          payment.receiptAssetreferenceId = null;
        }
      }

      if (caseObjectId !== undefined) payment.caseId = caseObjectId;
      if (validated.paymentDate !== undefined) {
        payment.paymentDate = new Date(validated.paymentDate);
      }
      if (validated.amount !== undefined) payment.amount = validated.amount;
      if (validated.currency !== undefined) payment.currency = validated.currency;
      if (validated.paymentMethod !== undefined) payment.paymentMethod = validated.paymentMethod;
      if (validated.paymentType !== undefined) payment.paymentType = validated.paymentType;
      if (validated.referenceNumber !== undefined) {
        payment.referenceNumber = validated.referenceNumber?.trim() || null;
      }
      if (validated.moneyReceiptNumber !== undefined) {
        payment.moneyReceiptNumber = validated.moneyReceiptNumber?.trim() || null;
      }
      if (validated.notes !== undefined) {
        payment.notes = validated.notes?.trim() || null;
      }

      await payment.save({ session: dbSession });
    });

    const populated = await ClientPayment.findById(paymentObjectId)
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

    const dto = formatClientPaymentItem(
      populated!,
      populated!.caseId as unknown as { internalReference?: string; caseNumber?: string; title?: string },
      populated!.receiptAssetreferenceId as unknown as (IAssetReferenceDocument & { assetId?: IAsset }),
      populated!.receivedBy as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string }
    );

    const response: ClientPaymentActionResponse = {
      success: true,
      message: `Payment record updated successfully.`,
      data: dto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PUT /api/v1/clients/[id]/payments/[paymentId]
 *
 * Alias for PATCH handler.
 */
export const PUT = PATCH;

/**
 * DELETE /api/v1/clients/[id]/payments/[paymentId]
 *
 * Delete a payment record. Soft-deletes attached receipt file reference if present.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const clientObjectId = new mongoose.Types.ObjectId(id);
    const paymentObjectId = new mongoose.Types.ObjectId(paymentId);

    await ConnectDB();

    const payment = await ClientPayment.findOne({
      _id: paymentObjectId,
      clientId: clientObjectId,
    });

    if (!payment) {
      throw ApiError.notFound("Payment record not found for this client");
    }

    await withTransaction(async (dbSession) => {
      // If payment has a receipt, soft-delete its AssetReference
      if (payment.receiptAssetreferenceId) {
        await AssetReference.findByIdAndUpdate(
          payment.receiptAssetreferenceId,
          { deletedAt: new Date() },
          { session: dbSession }
        );
      }

      await payment.deleteOne({ session: dbSession });
    });

    const response: ClientPaymentDeleteResponse = {
      success: true,
      message: "Payment record was removed successfully.",
      id: paymentId,
    };

    return NextResponse.json(response);
  }
);
