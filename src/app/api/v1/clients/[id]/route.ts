import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { withTransaction } from "@/lib/helpers/withTransaction";
import { Client } from "@/db/models/Client.model";
import { Case } from "@/db/models/Case.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { Task } from "@/db/models/Task.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import {
  CLIENT_TYPE_LABELS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUSES,
  ClientType,
  ClientStatus,
} from "@/const/client.const";
import {
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentType,
} from "@/const/client-document.const";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import { CASE_STATUSES } from "@/const/case.const";
import { TASK_STATUSES } from "@/const/task.const";
import { updateClientSchema } from "@/utils/zod/client.validation";
import { formatSafeIsoDate } from "@/app/api/v1/clients/route";
import type {
  ClientDetailDto,
  ClientActionResponse,
  ClientDeleteResponse,
  ClientCaseSummaryDto,
  ClientDocumentSummaryDto,
  ClientPaymentSummaryDto,
} from "@/types/client.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Fetch and construct the comprehensive ClientDetailDto for a client.
 * Uses bounded queries and database-level aggregations to eliminate memory bloat.
 */
async function buildClientDetailDto(
  clientId: mongoose.Types.ObjectId,
  dbSession?: mongoose.ClientSession
): Promise<ClientDetailDto> {
  const clientQuery = Client.findOne({ _id: clientId, deletedAt: null });
  if (dbSession) clientQuery.session(dbSession);
  const client = await clientQuery.lean();

  if (!client) {
    throw ApiError.notFound("Client not found or has been removed");
  }

  // Parallel fetch for bounded relationships and aggregated metrics
  const [
    caseStatsAgg,
    recentCases,
    totalDocuments,
    recentDocuments,
    paymentStatsAgg,
    recentPayments,
    pendingTasksCount,
  ] = await Promise.all([
    Case.aggregate<{
      _id: null;
      totalCases: number;
      activeCases: number;
      closedCases: number;
    }>([
      { $match: { clientId, deletedAt: null } },
      {
        $group: {
          _id: null,
          totalCases: { $sum: 1 },
          activeCases: {
            $sum: { $cond: [{ $eq: ["$caseStatus", CASE_STATUSES.ACTIVE] }, 1, 0] },
          },
          closedCases: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$caseStatus",
                    [CASE_STATUSES.DISPOSED, CASE_STATUSES.CLOSED],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Case.find({ clientId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate<{ courtId: { name: string } }>("courtId", "name")
      .lean(),
    ClientDocument.countDocuments({ clientId, deletedAt: null }),
    ClientDocument.find({ clientId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate<{
        assetReferenceId: IAssetReferenceDocument & { assetId: IAsset };
      }>({
        path: "assetReferenceId",
        populate: { path: "assetId" },
      })
      .lean(),
    ClientPayment.aggregate<{
      _id: null;
      totalPayments: number;
      totalPaidAmount: number;
      lastPaymentDate: Date | null;
    }>([
      { $match: { clientId } },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalPaidAmount: { $sum: "$amount" },
          lastPaymentDate: { $max: "$paymentDate" },
        },
      },
    ]),
    ClientPayment.find({ clientId })
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate<{ caseId: { internalReference: string; caseNumber: string } }>(
        "caseId",
        "internalReference caseNumber"
      )
      .lean(),
    Task.countDocuments({
      clientId,
      status: { $in: [TASK_STATUSES.TODO, TASK_STATUSES.IN_PROGRESS] },
    }),
  ]);

  // Aggregate stats
  const caseStats = caseStatsAgg[0];
  const totalCases = caseStats?.totalCases ?? 0;
  const activeCases = caseStats?.activeCases ?? 0;
  const closedCases = caseStats?.closedCases ?? 0;

  const paymentStats = paymentStatsAgg[0];
  const totalPayments = paymentStats?.totalPayments ?? 0;
  const totalPaidAmount = paymentStats?.totalPaidAmount ?? 0;
  const lastPaymentDate = formatSafeIsoDate(paymentStats?.lastPaymentDate);

  // Map Recent Cases
  const mappedRecentCases: ClientCaseSummaryDto[] = recentCases.map((c) => ({
    id: c._id.toString(),
    internalReference: c.internalReference,
    caseNumber: c.caseNumber || null,
    title: c.title,
    caseType: c.caseType,
    caseStatus: c.caseStatus,
    courtName: c.courtId?.name || null,
    filingDate: formatSafeIsoDate(c.filingDate),
    nextHearingDate: formatSafeIsoDate(c.nextHearingDate),
  }));

  // Map Recent Documents
  const mappedRecentDocuments: ClientDocumentSummaryDto[] = recentDocuments.map((d) => {
    const assetRef = d.assetReferenceId as unknown as (IAssetReferenceDocument & {
      assetId: IAsset;
    });
    const asset = assetRef?.assetId;

    return {
      id: d._id.toString(),
      title: d.title,
      documentType: d.documentType as ClientDocumentType,
      documentTypeLabel:
        CLIENT_DOCUMENT_TYPE_LABELS[d.documentType as ClientDocumentType] || d.documentType,
      documentDate: formatSafeIsoDate(d.documentDate),
      expiryDate: formatSafeIsoDate(d.expiryDate),
      fileUrl: asset?.secureUrl || "",
      fileName: assetRef?.originalFileName || asset?.originalFilename || d.title,
      fileSize: asset?.bytes || 0,
      mimeType: asset?.mimeType || "application/octet-stream",
      createdAt: formatSafeIsoDate(d.createdAt) || "",
    };
  });

  // Map Recent Payments
  const mappedRecentPayments: ClientPaymentSummaryDto[] = recentPayments.map((p) => {
    const caseRef = p.caseId
      ? p.caseId.caseNumber || p.caseId.internalReference
      : null;

    return {
      id: p._id.toString(),
      paymentDate: formatSafeIsoDate(p.paymentDate) || new Date().toISOString(),
      amount: p.amount,
      currency: p.currency || "BDT",
      paymentMethod: p.paymentMethod as PaymentMethod,
      paymentMethodLabel:
        PAYMENT_METHOD_LABELS[p.paymentMethod as PaymentMethod] || p.paymentMethod,
      paymentType: p.paymentType as PaymentType,
      paymentTypeLabel:
        PAYMENT_TYPE_LABELS[p.paymentType as PaymentType] || p.paymentType,
      referenceNumber: p.referenceNumber || null,
      moneyReceiptNumber: p.moneyReceiptNumber || null,
      caseReference: caseRef,
    };
  });

  const cType = client.clientType as ClientType;
  const cStatus = client.status as ClientStatus;

  return {
    id: client._id.toString(),
    clientNumber: client.clientNumber,
    clientType: cType,
    clientTypeLabel: CLIENT_TYPE_LABELS[cType] || String(client.clientType),
    status: cStatus,
    statusLabel: CLIENT_STATUS_LABELS[cStatus] || String(client.status),
    name: client.name,
    organizationName: client.organizationName || null,
    fatherOrSpouseName: client.fatherOrSpouseName || null,
    motherName: client.motherName || null,
    dateOfBirth: formatSafeIsoDate(client.dateOfBirth),
    nationalId: client.nationalId || null,
    phone: client.phone || null,
    alternatePhone: client.alternatePhone || null,
    email: client.email || null,
    address: client.address || null,
    permanentAddress: client.permanentAddress || null,
    notes: client.notes || null,
    isDeletable: totalCases === 0 && totalPayments === 0,
    stats: {
      totalCases,
      activeCases,
      closedCases,
      totalDocuments,
      totalPayments,
      totalPaidAmount,
      lastPaymentDate,
      pendingTasksCount,
    },
    recentCases: mappedRecentCases,
    recentDocuments: mappedRecentDocuments,
    recentPayments: mappedRecentPayments,
    createdAt: formatSafeIsoDate(client.createdAt) || "",
    updatedAt: formatSafeIsoDate(client.updatedAt) || "",
  };
}

/**
 * GET /api/v1/clients/[id]
 *
 * Retrieve full information for a specific client along with associated summaries.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid client ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const dto = await buildClientDetailDto(objectId);

    return NextResponse.json({
      success: true,
      data: dto,
    });
  }
);

/**
 * PATCH /api/v1/clients/[id]
 *
 * Update client details inside a database transaction without default overrides.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid client ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const body = await req.json();
    const validated = updateClientSchema.parse(body);


    // If clientNumber is updated, ensure uniqueness excluding self
    if (validated.clientNumber) {
      const duplicate = await Client.findOne({
        _id: { $ne: objectId },
        clientNumber: validated.clientNumber.trim().toUpperCase(),
      });

      if (duplicate) {
        throw ApiError.conflict(
          `Another client with number "${validated.clientNumber.trim().toUpperCase()}" already exists.`
        );
      }
    }

    // Execute update inside transaction
    await withTransaction(async (dbSession) => {
      const client = await Client.findOne({
        _id: objectId,
        deletedAt: null,
      }).session(dbSession);

      if (!client) {
        throw ApiError.notFound("Client not found");
      }

      const beforeState = client.toObject();

      if (validated.clientNumber !== undefined) {
        client.clientNumber = validated.clientNumber.trim().toUpperCase();
      }
      if (validated.clientType !== undefined) client.clientType = validated.clientType;
      if (validated.status !== undefined) client.status = validated.status;
      if (validated.name !== undefined) client.name = validated.name.trim();
      if (validated.organizationName !== undefined) {
        client.organizationName = validated.organizationName?.trim() || null;
      }
      if (validated.fatherOrSpouseName !== undefined) {
        client.fatherOrSpouseName = validated.fatherOrSpouseName?.trim() || null;
      }
      if (validated.motherName !== undefined) {
        client.motherName = validated.motherName?.trim() || null;
      }
      if (validated.dateOfBirth !== undefined) {
        client.dateOfBirth = validated.dateOfBirth ? new Date(validated.dateOfBirth) : null;
      }
      if (validated.nationalId !== undefined) {
        client.nationalId = validated.nationalId?.trim() || null;
      }
      if (validated.phone !== undefined) {
        client.phone = validated.phone?.trim() || null;
      }
      if (validated.alternatePhone !== undefined) {
        client.alternatePhone = validated.alternatePhone?.trim() || null;
      }
      if (validated.email !== undefined) {
        client.email = validated.email?.trim() || null;
      }
      if (validated.address !== undefined) {
        client.address = validated.address?.trim() || null;
      }
      if (validated.permanentAddress !== undefined) {
        client.permanentAddress = validated.permanentAddress?.trim() || null;
      }
      if (validated.notes !== undefined) {
        client.notes = validated.notes?.trim() || null;
      }

      await client.save({ session: dbSession });

      // Record audit log for client update
      const diff = calculateAuditDiff(beforeState, client.toObject());
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: AUDIT_ENTITY_TYPES.CLIENT,
        entityId: client._id,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        description: `Updated client "${client.name}" (${client.clientNumber})`,
        session: dbSession,
      });
    });

    const updatedDto = await buildClientDetailDto(objectId);

    const response: ClientActionResponse = {
      success: true,
      message: `Client "${updatedDto.name}" updated successfully.`,
      data: updatedDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PUT /api/v1/clients/[id]
 *
 * Alias for PATCH handler.
 */
export const PUT = PATCH;

/**
 * DELETE /api/v1/clients/[id]
 *
 * Safely soft-deletes a client and associated documents & asset references.
 * Enforces financial and relational integrity guards (rejects if active cases or payments exist).
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid client ID format");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const client = await Client.findOne({ _id: objectId, deletedAt: null });
    if (!client) {
      throw ApiError.notFound("Client not found");
    }

    // Association guard: check linked cases and payments
    const [caseCount, paymentCount] = await Promise.all([
      Case.countDocuments({ clientId: objectId, deletedAt: null }),
      ClientPayment.countDocuments({ clientId: objectId }),
    ]);

    if (caseCount > 0 || paymentCount > 0) {
      const reasons: string[] = [];
      if (caseCount > 0) {
        reasons.push(`${caseCount} active case${caseCount > 1 ? "s" : ""}`);
      }
      if (paymentCount > 0) {
        reasons.push(`${paymentCount} financial payment record${paymentCount > 1 ? "s" : ""}`);
      }

      throw ApiError.conflict(
        `Cannot delete client "${client.name}". This client is referenced by ${reasons.join(" and ")}. Please resolve or reassign these records before deleting.`,
        {
          clientId: id,
          clientName: client.name,
          associations: {
            cases: caseCount,
            payments: paymentCount,
          },
        }
      );
    }

    // Perform safe soft deletion inside transaction
    await withTransaction(async (dbSession) => {
      const beforeState = client.toObject();

      // 1. Soft-delete client record
      client.deletedAt = new Date();
      client.status = CLIENT_STATUSES.ARCHIVED;
      await client.save({ session: dbSession });

      // 2. Soft-delete client documents and linked asset references
      const clientDocs = await ClientDocument.find({
        clientId: objectId,
        deletedAt: null,
      }).session(dbSession);

      const assetRefIds = clientDocs.map((d) => d.assetReferenceId);

      await ClientDocument.updateMany(
        { clientId: objectId, deletedAt: null },
        { deletedAt: new Date() },
        { session: dbSession }
      );

      if (assetRefIds.length > 0) {
        await AssetReference.updateMany(
          { _id: { $in: assetRefIds }, deletedAt: null },
          { deletedAt: new Date() },
          { session: dbSession }
        );
      }

      // Record audit log for client soft deletion
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.SOFT_DELETE,
        entityType: AUDIT_ENTITY_TYPES.CLIENT,
        entityId: client._id,
        oldValues: { deletedAt: null, status: beforeState.status },
        newValues: { deletedAt: client.deletedAt, status: CLIENT_STATUSES.ARCHIVED },
        description: `Archived client "${client.name}" (${client.clientNumber})`,
        session: dbSession,
      });
    });

    const response: ClientDeleteResponse = {
      success: true,
      message: `Client "${client.name}" (${client.clientNumber}) was safely removed.`,
      id,
    };

    return NextResponse.json(response);
  }
);
