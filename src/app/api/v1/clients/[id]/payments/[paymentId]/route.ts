import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { Client } from "@/db/models/Client.model";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { Case } from "@/db/models/Case.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES, ASSET_PURPOSES } from "@/const/asset-reference.const";
import { AssetType } from "@/const/asset.const";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
// Ensure models are registered in Mongoose schema cache for nested populate
import "@/db/models/Asset.model";
import { updateClientPaymentSchema } from "@/utils/zod/client-payment.validation";
import {
  formatClientPaymentItem,
  type PopulatedCaseInfo,
  type PopulatedReceiptAssetRef,
  type PopulatedReceivedByUser,
} from "../route";
import type {
  ClientPaymentActionResponse,
  ClientPaymentDeleteResponse,
  SingleClientPaymentApiResponse,
} from "@/types/client-payment.types";

interface RouteParams {
  params: Promise<{ id: string; paymentId: string }>;
}

/**
 * GET /api/v1/clients/[id]/payments/[paymentId]
 *
 * Retrieve details for a single client payment with strict field projections.
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

    const [clientExists, payment] = await Promise.all([
      Client.exists({ _id: clientObjectId, deletedAt: null }),
      ClientPayment.findOne({
        _id: paymentObjectId,
        clientId: clientObjectId,
      })
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
        .lean(),
    ]);

    if (!clientExists) {
      throw ApiError.notFound("Client not found");
    }

    if (!payment) {
      throw ApiError.notFound("Payment record not found for this client");
    }

    const dto = formatClientPaymentItem(
      payment,
      payment.caseId as unknown as PopulatedCaseInfo,
      payment.receiptAssetreferenceId as unknown as PopulatedReceiptAssetRef,
      payment.receivedBy as unknown as PopulatedReceivedByUser
    );

    const response: SingleClientPaymentApiResponse = {
      success: true,
      data: dto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PATCH /api/v1/clients/[id]/payments/[paymentId]
 *
 * Update an existing payment record inside a transaction without default overrides.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id, paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const clientObjectId = new mongoose.Types.ObjectId(id);
    const paymentObjectId = new mongoose.Types.ObjectId(paymentId);

    const clientExists = await Client.exists({ _id: clientObjectId, deletedAt: null });
    if (!clientExists) {
      throw ApiError.notFound("Client not found");
    }

    const body = await req.json();
    const validated = updateClientPaymentSchema.parse(body);

    // If caseId is provided, enforce relationship integrity:
    // Case must exist, be active, and belong to this specific client
    let caseObjectId: mongoose.Types.ObjectId | null | undefined = undefined;
    if (validated.caseId !== undefined) {
      if (validated.caseId) {
        caseObjectId = new mongoose.Types.ObjectId(validated.caseId);
        const linkedCase = await Case.findOne({
          _id: caseObjectId,
          clientId: clientObjectId,
          deletedAt: null,
        })
          .select("_id")
          .lean();

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

      const beforeState = payment.toObject();

      // Handle receipt file update / replacement / removal
      const receiptFieldSpecified =
        validated.receiptAssetreferenceId !== undefined ||
        validated.receiptAssetReferenceId !== undefined;
      const targetReceiptId =
        validated.receiptAssetreferenceId !== undefined
          ? validated.receiptAssetreferenceId
          : validated.receiptAssetReferenceId;

      if (receiptFieldSpecified) {
        if (targetReceiptId) {
          const newReceiptId = new mongoose.Types.ObjectId(targetReceiptId);
          const newReceipt = await AssetReference.findOne({
            _id: newReceiptId,
            deletedAt: null,
          }).session(dbSession);

          if (!newReceipt) {
            throw ApiError.badRequest("The specified receipt file does not exist or was deleted.");
          }

          // Security: Ensure the new asset reference is not owned by a different client
          if (
            newReceipt.ownerId &&
            (newReceipt.ownerType === ASSET_OWNER_TYPES.CLIENT_PAYMENT ||
              newReceipt.ownerType === ASSET_OWNER_TYPES.CLIENT) &&
            !newReceipt.ownerId.equals(clientObjectId)
          ) {
            throw ApiError.badRequest("The referenced receipt file belongs to another client.");
          }

          // If replacing previous receipt, soft-delete old reference
          if (
            payment.receiptAssetreferenceId &&
            !payment.receiptAssetreferenceId.equals(newReceiptId)
          ) {
            await AssetReference.findByIdAndUpdate(
              payment.receiptAssetreferenceId,
              { deletedAt: new Date() },
              { session: dbSession, select: "_id" }
            );
          }

          newReceipt.ownerType = ASSET_OWNER_TYPES.CLIENT_PAYMENT;
          newReceipt.ownerId = clientObjectId;
          newReceipt.purpose = ASSET_PURPOSES.PAYMENT_MONEY_RECEIPT;
          await newReceipt.save({ session: dbSession });

          payment.receiptAssetreferenceId = newReceiptId;
        } else {
          // If receipt is explicitly set to null, soft-delete previous reference
          if (payment.receiptAssetreferenceId) {
            await AssetReference.findByIdAndUpdate(
              payment.receiptAssetreferenceId,
              { deletedAt: new Date() },
              { session: dbSession, select: "_id" }
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

      // Record audit log for client payment update
      const diff = calculateAuditDiff(beforeState, payment.toObject());
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: AUDIT_ENTITY_TYPES.CLIENT_PAYMENT,
        entityId: payment._id,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        description: `Updated payment record of ${payment.amount} ${payment.currency}`,
        session: dbSession,
      });
    });

    const populated = await ClientPayment.findById(paymentObjectId)
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
      throw ApiError.notFound("Payment record not found for this client");
    }

    const dto = formatClientPaymentItem(
      populated,
      populated.caseId as unknown as PopulatedCaseInfo,
      populated.receiptAssetreferenceId as unknown as PopulatedReceiptAssetRef,
      populated.receivedBy as unknown as PopulatedReceivedByUser
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
 * Delete a payment record. Soft-deletes attached receipt file reference if present,
 * and records an audit log.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id, paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const clientObjectId = new mongoose.Types.ObjectId(id);
    const paymentObjectId = new mongoose.Types.ObjectId(paymentId);

    const [clientExists, payment] = await Promise.all([
      Client.exists({ _id: clientObjectId, deletedAt: null }),
      ClientPayment.findOne({
        _id: paymentObjectId,
        clientId: clientObjectId,
      }),
    ]);

    if (!clientExists) {
      throw ApiError.notFound("Client not found");
    }

    if (!payment) {
      throw ApiError.notFound("Payment record not found for this client");
    }

    await withTransaction(async (dbSession) => {
      const paymentSnapshot = payment.toObject();

      // If payment has a receipt, soft-delete its AssetReference
      if (payment.receiptAssetreferenceId) {
        await AssetReference.findByIdAndUpdate(
          payment.receiptAssetreferenceId,
          { deletedAt: new Date() },
          { session: dbSession, select: "_id" }
        );
      }

      await payment.deleteOne({ session: dbSession });

      // Record audit log for client payment deletion
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.DELETE,
        entityType: AUDIT_ENTITY_TYPES.CLIENT_PAYMENT,
        entityId: payment._id,
        oldValues: paymentSnapshot,
        newValues: null,
        description: `Deleted payment record of ${payment.amount} ${payment.currency}`,
        session: dbSession,
      });
    });

    const response: ClientPaymentDeleteResponse = {
      success: true,
      message: "Payment record was removed successfully.",
      id: paymentId,
    };

    return NextResponse.json(response);
  }
);

