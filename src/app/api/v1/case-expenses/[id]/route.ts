import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
// Ensure models are registered in Mongoose schema cache for nested populate
import "@/db/models/Asset.model";
import { CaseExpense } from "@/db/models/CaseExpense.model";
import { Case } from "@/db/models/Case.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES, ASSET_PURPOSES } from "@/const/asset-reference.const";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import {
  objectIdRegex,
  updateCaseExpenseSchema,
} from "@/utils/zod/case-expense.validation";
import type {
  CaseExpenseActionResponse,
  CaseExpenseDeleteResponse,
  CaseExpenseDocInput,
} from "@/types/case-expense.types";
import { formatCaseExpenseItem } from "../route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/case-expenses/[id]
 *
 * Retrieve details for a single case expense with projected relationship details.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!objectIdRegex.test(id)) {
      throw ApiError.badRequest("Invalid case expense ID format");
    }

    const expenseObjectId = new mongoose.Types.ObjectId(id);
    const expense = await CaseExpense.findById(expenseObjectId)
      .select(
        "_id caseId expenseDate category description amount currency receiptAssetReferenceId recordedBy createdAt updatedAt"
      )
      .populate({
        path: "caseId",
        select: "_id internalReference caseNumber title clientId",
        populate: {
          path: "clientId",
          select: "_id name clientNumber",
        },
      })
      .populate({
        path: "receiptAssetReferenceId",
        select: "_id originalFileName assetId",
        populate: {
          path: "assetId",
          select: "_id secureUrl originalFilename assetType mimeType bytes",
        },
      })
      .populate({
        path: "recordedBy",
        select: "_id name email",
      })
      .lean<CaseExpenseDocInput>();

    if (!expense) {
      throw ApiError.notFound("Case expense record not found");
    }

    return NextResponse.json({ success: true, data: formatCaseExpenseItem(expense) });
  }
);

/**
 * PUT /api/v1/case-expenses/[id]
 *
 * Update an existing case expense with receipt reference synchronization and audit tracking.
 */
export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!objectIdRegex.test(id)) {
      throw ApiError.badRequest("Invalid case expense ID format");
    }

    const expenseObjectId = new mongoose.Types.ObjectId(id);
    const existingExpense = await CaseExpense.findById(expenseObjectId).select(
      "_id caseId expenseDate category description amount currency receiptAssetReferenceId recordedBy createdAt updatedAt"
    );
    if (!existingExpense) {
      throw ApiError.notFound("Case expense record not found");
    }

    const beforeState = existingExpense.toObject();

    const body = await req.json();
    const validated = updateCaseExpenseSchema.parse(body);

    let targetCaseObjectId = existingExpense.caseId;
    if (validated.caseId) {
      targetCaseObjectId = new mongoose.Types.ObjectId(validated.caseId);
      const caseExists = await Case.exists({ _id: targetCaseObjectId, deletedAt: null });
      if (!caseExists) {
        throw ApiError.badRequest("The specified case does not exist or has been deleted.");
      }
    }

    const receiptFieldSpecified =
      validated.receiptAssetReferenceId !== undefined ||
      validated.receiptAssetreferenceId !== undefined;
    const rawReceiptVal =
      validated.receiptAssetReferenceId !== undefined
        ? validated.receiptAssetReferenceId
        : validated.receiptAssetreferenceId;

    let targetReceiptObjectId: mongoose.Types.ObjectId | null = null;
    if (receiptFieldSpecified) {
      if (rawReceiptVal) {
        targetReceiptObjectId = new mongoose.Types.ObjectId(rawReceiptVal);
        const receiptRef = await AssetReference.findOne({
          _id: targetReceiptObjectId,
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
          !receiptRef.ownerId.equals(targetCaseObjectId)
        ) {
          throw ApiError.badRequest("The referenced receipt file belongs to another legal case.");
        }
      } else {
        targetReceiptObjectId = null;
      }
    }

    await withTransaction(async (dbSession) => {
      const oldReceiptId = existingExpense.receiptAssetReferenceId;
      const updateFields: Record<string, unknown> = {};

      // Handle receipt attachment, replacement, or removal
      if (receiptFieldSpecified) {
        if (targetReceiptObjectId) {
          // If replacing previous receipt, soft-delete old reference
          if (oldReceiptId && !oldReceiptId.equals(targetReceiptObjectId)) {
            await AssetReference.findByIdAndUpdate(
              oldReceiptId,
              { deletedAt: new Date() },
              { session: dbSession, select: "_id" }
            );
          }

          await AssetReference.findByIdAndUpdate(
            targetReceiptObjectId,
            {
              ownerType: ASSET_OWNER_TYPES.CASE_EXPENSE,
              ownerId: targetCaseObjectId,
              purpose: ASSET_PURPOSES.EXPENSE_RECEIPT,
            },
            { session: dbSession, select: "_id" }
          );

          updateFields.receiptAssetReferenceId = targetReceiptObjectId;
        } else {
          // Explicit removal request: soft-delete old reference
          if (oldReceiptId) {
            await AssetReference.findByIdAndUpdate(
              oldReceiptId,
              { deletedAt: new Date() },
              { session: dbSession, select: "_id" }
            );
          }
          updateFields.receiptAssetReferenceId = null;
        }
      } else if (!existingExpense.caseId.equals(targetCaseObjectId) && oldReceiptId) {
        // If caseId changed, update ownerId on existing receipt
        await AssetReference.findByIdAndUpdate(
          oldReceiptId,
          { ownerId: targetCaseObjectId },
          { session: dbSession, select: "_id" }
        );
      }

      if (validated.caseId) {
        updateFields.caseId = targetCaseObjectId;
      }

      if (validated.expenseDate) {
        updateFields.expenseDate = new Date(validated.expenseDate);
      }
      if (validated.category) {
        updateFields.category = validated.category;
      }
      if (validated.description !== undefined) {
        updateFields.description = validated.description?.trim() || null;
      }
      if (validated.amount !== undefined) {
        updateFields.amount = validated.amount;
      }
      if (validated.currency) {
        updateFields.currency = validated.currency;
      }

      await CaseExpense.findByIdAndUpdate(expenseObjectId, updateFields, {
        session: dbSession,
        select: "_id",
      });

      // 4. Record audit log for case expense update
      const diff = calculateAuditDiff(beforeState, { ...beforeState, ...updateFields });
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: AUDIT_ENTITY_TYPES.CASE_EXPENSE,
        entityId: expenseObjectId,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        description: `Updated case expense record of ${validated.amount ?? existingExpense.amount} ${validated.currency ?? existingExpense.currency}`,
        session: dbSession,
      });
    });

    const updated = await CaseExpense.findById(expenseObjectId)
      .select(
        "_id caseId expenseDate category description amount currency receiptAssetReferenceId recordedBy createdAt updatedAt"
      )
      .populate({
        path: "caseId",
        select: "_id internalReference caseNumber title clientId",
        populate: {
          path: "clientId",
          select: "_id name clientNumber",
        },
      })
      .populate({
        path: "receiptAssetReferenceId",
        select: "_id originalFileName assetId",
        populate: {
          path: "assetId",
          select: "_id secureUrl originalFilename assetType mimeType bytes",
        },
      })
      .populate({
        path: "recordedBy",
        select: "_id name email",
      })
      .lean<CaseExpenseDocInput>();

    if (!updated) {
      throw ApiError.notFound("Case expense record not found");
    }

    const itemDto = formatCaseExpenseItem(updated);

    const response: CaseExpenseActionResponse = {
      success: true,
      message: "Case expense updated successfully.",
      data: itemDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PATCH /api/v1/case-expenses/[id]
 *
 * Alias for PUT handler.
 */
export const PATCH = PUT;

/**
 * DELETE /api/v1/case-expenses/[id]
 *
 * Delete a case expense record and release its attached receipt asset reference.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!objectIdRegex.test(id)) {
      throw ApiError.badRequest("Invalid case expense ID format");
    }

    const expenseObjectId = new mongoose.Types.ObjectId(id);
    const expense = await CaseExpense.findById(expenseObjectId).select(
      "_id caseId expenseDate category description amount currency receiptAssetReferenceId recordedBy createdAt updatedAt"
    );
    if (!expense) {
      throw ApiError.notFound("Case expense record not found");
    }

    await withTransaction(async (dbSession) => {
      const expenseSnapshot = expense.toObject();

      // If there's an associated receipt asset reference, soft-delete it
      if (expense.receiptAssetReferenceId) {
        await AssetReference.findByIdAndUpdate(
          expense.receiptAssetReferenceId,
          { deletedAt: new Date() },
          { session: dbSession, select: "_id" }
        );
      }

      const deletedDoc = await CaseExpense.findByIdAndDelete(expenseObjectId, {
        session: dbSession,
        select: "_id",
      });

      if (!deletedDoc) {
        throw ApiError.notFound("Case expense record not found or already deleted");
      }

      // Record audit log for case expense deletion
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.DELETE,
        entityType: AUDIT_ENTITY_TYPES.CASE_EXPENSE,
        entityId: expenseObjectId,
        oldValues: expenseSnapshot,
        newValues: null,
        description: `Deleted case expense record of ${expense.amount} ${expense.currency}`,
        session: dbSession,
      });
    });

    const response: CaseExpenseDeleteResponse = {
      success: true,
      message: "Case expense deleted successfully.",
      id,
    };

    return NextResponse.json(response);
  }
);
