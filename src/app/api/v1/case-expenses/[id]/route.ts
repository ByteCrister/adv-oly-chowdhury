import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { CaseExpense } from "@/db/models/CaseExpense.model";
import { Case } from "@/db/models/Case.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { ASSET_OWNER_TYPES } from "@/const/asset-reference.const";
import {
  CASE_EXPENSE_CATEGORY_LABELS,
  CaseExpenseCategory,
} from "@/const/case-expense.const";
import { updateCaseExpenseSchema } from "@/utils/zod/case-expense.validation";
import type {
  CaseExpenseItemDto,
  CaseExpenseActionResponse,
  CaseExpenseDeleteResponse,
} from "@/types/case-expense.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";
import ConnectDB from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Format a CaseExpense record into CaseExpenseItemDto.
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
 * GET /api/v1/case-expenses/[id]
 *
 * Retrieve details for a single case expense.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case expense ID format");
    }

    await ConnectDB();

    const expenseObjectId = new mongoose.Types.ObjectId(id);
    const expense = await CaseExpense.findById(expenseObjectId)
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

    if (!expense) {
      throw ApiError.notFound("Case expense record not found");
    }

    const itemDto = formatCaseExpenseItem(
      expense,
      expense.caseId as unknown as {
        _id?: mongoose.Types.ObjectId;
        internalReference?: string;
        caseNumber?: string;
        title?: string;
        clientId?: { _id?: mongoose.Types.ObjectId; name?: string; clientNumber?: string };
      },
      null,
      expense.receiptAssetReferenceId as unknown as (IAssetReferenceDocument & { assetId?: IAsset }),
      expense.recordedBy as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string }
    );

    return NextResponse.json({ success: true, data: itemDto });
  }
);

/**
 * PUT /api/v1/case-expenses/[id]
 *
 * Update an existing case expense.
 */
export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case expense ID format");
    }

    await ConnectDB();

    const expenseObjectId = new mongoose.Types.ObjectId(id);
    const existingExpense = await CaseExpense.findById(expenseObjectId);
    if (!existingExpense) {
      throw ApiError.notFound("Case expense record not found");
    }

    const body = await req.json();
    const validated = updateCaseExpenseSchema.parse(body);

    let caseObjectId = existingExpense.caseId;
    if (validated.caseId) {
      caseObjectId = new mongoose.Types.ObjectId(validated.caseId);
      const caseExists = await Case.exists({ _id: caseObjectId, deletedAt: null });
      if (!caseExists) {
        throw ApiError.badRequest("The specified case does not exist or has been deleted.");
      }
    }

    let receiptObjectId = existingExpense.receiptAssetReferenceId || null;
    if (validated.receiptAssetReferenceId !== undefined) {
      if (validated.receiptAssetReferenceId) {
        receiptObjectId = new mongoose.Types.ObjectId(validated.receiptAssetReferenceId);
        const receiptExists = await AssetReference.exists({
          _id: receiptObjectId,
          deletedAt: null,
        });
        if (!receiptExists) {
          throw ApiError.badRequest("The referenced receipt voucher file does not exist.");
        }
      } else {
        receiptObjectId = null;
      }
    }

    await withTransaction(async (dbSession) => {
      // If receipt changed, unassign old and assign new
      const oldReceiptId = existingExpense.receiptAssetReferenceId;
      if (oldReceiptId && (!receiptObjectId || !oldReceiptId.equals(receiptObjectId))) {
        await AssetReference.findByIdAndUpdate(
          oldReceiptId,
          { ownerType: ASSET_OWNER_TYPES.OTHER, ownerId: null },
          { session: dbSession }
        );
      }

      if (receiptObjectId && (!oldReceiptId || !receiptObjectId.equals(oldReceiptId))) {
        await AssetReference.findByIdAndUpdate(
          receiptObjectId,
          {
            ownerType: ASSET_OWNER_TYPES.CASE_EXPENSE,
            ownerId: caseObjectId,
          },
          { session: dbSession }
        );
      }

      const updateFields: Record<string, unknown> = {
        caseId: caseObjectId,
        receiptAssetReferenceId: receiptObjectId,
      };

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
      });
    });

    const updated = await CaseExpense.findById(expenseObjectId)
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
      updated!,
      updated!.caseId as unknown as {
        _id?: mongoose.Types.ObjectId;
        internalReference?: string;
        caseNumber?: string;
        title?: string;
        clientId?: { _id?: mongoose.Types.ObjectId; name?: string; clientNumber?: string };
      },
      null,
      updated!.receiptAssetReferenceId as unknown as (IAssetReferenceDocument & { assetId?: IAsset }),
      updated!.recordedBy as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string }
    );

    const response: CaseExpenseActionResponse = {
      success: true,
      message: `Case expense updated successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * DELETE /api/v1/case-expenses/[id]
 *
 * Delete a case expense record.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid case expense ID format");
    }

    await ConnectDB();

    const expenseObjectId = new mongoose.Types.ObjectId(id);
    const expense = await CaseExpense.findById(expenseObjectId);
    if (!expense) {
      throw ApiError.notFound("Case expense record not found");
    }

    await withTransaction(async (dbSession) => {
      // If there's an associated receipt asset reference, clean its ownership
      if (expense.receiptAssetReferenceId) {
        await AssetReference.findByIdAndUpdate(
          expense.receiptAssetReferenceId,
          { ownerType: ASSET_OWNER_TYPES.OTHER, ownerId: null },
          { session: dbSession }
        );
      }

      await CaseExpense.findByIdAndDelete(expenseObjectId, { session: dbSession });
    });

    const response: CaseExpenseDeleteResponse = {
      success: true,
      message: "Case expense deleted successfully.",
      id,
    };

    return NextResponse.json(response);
  }
);
