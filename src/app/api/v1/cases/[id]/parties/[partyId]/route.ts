import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import ConnectDB from "@/db";
import { CaseParty } from "@/db/models/CaseParty.model";
import { Client } from "@/db/models/Client.model";
import { updateCasePartySchema } from "@/utils/zod/case-party.validation";
import { formatCasePartyItem } from "../route";
import type {
  CasePartyActionResponse,
  CasePartyDeleteResponse,
} from "@/types/case-party.types";

interface RouteParams {
  params: Promise<{ id: string; partyId: string }>;
}

/**
 * GET /api/v1/cases/[id]/parties/[partyId]
 *
 * Retrieve an individual party associated with a case.
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, partyId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(partyId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const partyObjectId = new mongoose.Types.ObjectId(partyId);

    await ConnectDB();

    const partyDoc = await CaseParty.findOne({
      _id: partyObjectId,
      caseId: caseObjectId,
    })
      .populate("clientId", "name clientNumber organizationName clientType phone email")
      .lean();

    if (!partyDoc) {
      throw ApiError.notFound("Party not found for this case.");
    }

    const itemDto = formatCasePartyItem(
      partyDoc,
      partyDoc.clientId as Record<string, unknown> | null
    );

    return NextResponse.json({
      success: true,
      data: itemDto,
    });
  }
);

/**
 * PATCH /api/v1/cases/[id]/parties/[partyId]
 *
 * Update an existing case party record.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, partyId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(partyId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const partyObjectId = new mongoose.Types.ObjectId(partyId);

    const body = await req.json();
    const validated = updateCasePartySchema.parse(body);

    await ConnectDB();

    const partyDoc = await CaseParty.findOne({
      _id: partyObjectId,
      caseId: caseObjectId,
    });

    if (!partyDoc) {
      throw ApiError.notFound("Party not found for this case.");
    }

    if (validated.clientId !== undefined) {
      if (validated.clientId) {
        const clientObjectId = new mongoose.Types.ObjectId(validated.clientId);
        const clientExists = await Client.exists({ _id: clientObjectId, deletedAt: null });
        if (!clientExists) {
          throw ApiError.badRequest("Selected client does not exist or has been archived.");
        }
        partyDoc.clientId = clientObjectId;
      } else {
        partyDoc.clientId = null;
      }
    }

    if (validated.name !== undefined) partyDoc.name = validated.name.trim();
    if (validated.partyType !== undefined) partyDoc.partyType = validated.partyType;
    if (validated.role !== undefined) partyDoc.role = validated.role;
    if (validated.address !== undefined) {
      partyDoc.address = validated.address?.trim() || null;
    }
    if (validated.phone !== undefined) {
      partyDoc.phone = validated.phone?.trim() || null;
    }
    if (validated.notes !== undefined) {
      partyDoc.notes = validated.notes?.trim() || null;
    }

    await partyDoc.save();

    const updatedDoc = await CaseParty.findById(partyObjectId)
      .populate("clientId", "name clientNumber organizationName clientType phone email")
      .lean();

    const itemDto = formatCasePartyItem(
      updatedDoc!,
      updatedDoc!.clientId as Record<string, unknown> | null
    );

    const response: CasePartyActionResponse = {
      success: true,
      message: `Party "${itemDto.name}" updated successfully.`,
      data: itemDto,
    };

    return NextResponse.json(response);
  }
);

/**
 * PUT /api/v1/cases/[id]/parties/[partyId]
 *
 * Alias for PATCH handler.
 */
export const PUT = PATCH;

/**
 * DELETE /api/v1/cases/[id]/parties/[partyId]
 *
 * Remove a party record from the case.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id, partyId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(partyId)) {
      throw ApiError.badRequest("Invalid ID format");
    }

    const caseObjectId = new mongoose.Types.ObjectId(id);
    const partyObjectId = new mongoose.Types.ObjectId(partyId);

    await ConnectDB();

    const partyDoc = await CaseParty.findOne({
      _id: partyObjectId,
      caseId: caseObjectId,
    });

    if (!partyDoc) {
      throw ApiError.notFound("Party not found for this case.");
    }

    await partyDoc.deleteOne();

    const response: CasePartyDeleteResponse = {
      success: true,
      message: `Party "${partyDoc.name}" was removed from the case successfully.`,
      id: partyId,
    };

    return NextResponse.json(response);
  }
);
