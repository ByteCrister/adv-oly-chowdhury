import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { Client } from "@/db/models/Client.model";
import { Court } from "@/db/models/Court.model";
import { Case } from "@/db/models/Case.model";
import { User } from "@/db/models/User.model";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";
import { dropdownQuerySchema } from "@/utils/zod/dropdown.validation";
import type { DropdownItem, DropdownApiResponse } from "@/types/dropdown.types";
import { sanitizeSearchParam, escapeRegex } from "@/lib/helpers/search.helper";

/**
 * GET /api/v1/dropdowns
 *
 * Single, unified polymorphic endpoint to fetch optimized, lightweight dropdown
 * datasets for Client, Court, Case, and User entities.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await getUserId();

  const { searchParams } = new URL(req.url);

  const rawParams = {
    type: searchParams.get("type"),
    search: sanitizeSearchParam(searchParams.get("search")),
    clientId: searchParams.get("clientId") || undefined,
    courtId: searchParams.get("courtId") || undefined,
    limit: searchParams.get("limit") || undefined,
  };

  const parsed = dropdownQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid dropdown query parameters", parsed.error.flatten().fieldErrors);
  }

  const { type, search, clientId, courtId, limit } = parsed.data;
  let items: DropdownItem[] = [];

  switch (type) {
    case DROPDOWN_TYPES.CLIENT: {
      const filter: Record<string, unknown> = { deletedAt: null };

      if (search?.trim()) {
        const regex = new RegExp(escapeRegex(search.trim()), "i");
        filter.$or = [
          { name: regex },
          { clientNumber: regex },
          { organizationName: regex },
          { phone: regex },
        ];
      }

      const docs = await Client.find(filter)
        .select("_id name clientNumber organizationName phone createdAt clientType status")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      items = docs.map((doc) => ({
        id: (doc._id as mongoose.Types.ObjectId).toString(),
        name: doc.name as string,
        subText: doc.clientNumber
          ? `${doc.clientNumber}${doc.organizationName ? ` • ${doc.organizationName}` : ""}`
          : (doc.organizationName as string) || (doc.phone as string) || null,
        date: doc.createdAt ? new Date(doc.createdAt as Date).toISOString() : null,
        metadata: {
          clientNumber: doc.clientNumber,
          clientType: doc.clientType,
          status: doc.status,
          phone: doc.phone,
          organizationName: doc.organizationName,
        },
      }));
      break;
    }

    case DROPDOWN_TYPES.COURT: {
      const filter: Record<string, unknown> = { isActive: true, deletedAt: null };

      if (search?.trim()) {
        const regex = new RegExp(escapeRegex(search.trim()), "i");
        filter.$or = [
          { name: regex },
          { district: regex },
          { courtType: regex },
          { presidingJudgeTitle: regex },
        ];
      }

      const docs = await Court.find(filter)
        .select("_id name courtType district division roomOrHall presidingJudgeTitle createdAt")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      items = docs.map((doc) => ({
        id: (doc._id as mongoose.Types.ObjectId).toString(),
        name: doc.name as string,
        subText: `${doc.district || ""}${doc.courtType ? ` • ${doc.courtType}` : ""}`,
        date: doc.createdAt ? new Date(doc.createdAt as Date).toISOString() : null,
        metadata: {
          courtType: doc.courtType,
          district: doc.district,
          division: doc.division,
          roomOrHall: doc.roomOrHall,
        },
      }));
      break;
    }

    case DROPDOWN_TYPES.CASE: {
      const filter: Record<string, unknown> = { deletedAt: null };

      if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
        filter.clientId = new mongoose.Types.ObjectId(clientId);
      }

      if (courtId && mongoose.Types.ObjectId.isValid(courtId)) {
        filter.courtId = new mongoose.Types.ObjectId(courtId);
      }

      if (search?.trim()) {
        const regex = new RegExp(escapeRegex(search.trim()), "i");
        filter.$or = [
          { title: regex },
          { caseNumber: regex },
          { internalReference: regex },
        ];
      }

      const docs = await Case.find(filter)
        .select("_id title caseNumber internalReference filingDate nextHearingDate caseStatus courtId clientId createdAt")
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      items = docs.map((doc) => ({
        id: (doc._id as mongoose.Types.ObjectId).toString(),
        name: doc.title as string,
        subText: doc.caseNumber
          ? `${doc.caseNumber} (${doc.internalReference})`
          : (doc.internalReference as string),
        date: doc.filingDate
          ? new Date(doc.filingDate as Date).toISOString()
          : doc.createdAt
          ? new Date(doc.createdAt as Date).toISOString()
          : null,
        metadata: {
          caseNumber: doc.caseNumber,
          internalReference: doc.internalReference,
          caseStatus: doc.caseStatus,
          clientId: doc.clientId ? (doc.clientId as mongoose.Types.ObjectId).toString() : null,
          courtId: doc.courtId ? (doc.courtId as mongoose.Types.ObjectId).toString() : null,
          nextHearingDate: doc.nextHearingDate
            ? new Date(doc.nextHearingDate as Date).toISOString()
            : null,
        },
      }));
      break;
    }

    case DROPDOWN_TYPES.USER: {
      const filter: Record<string, unknown> = { isActive: true };

      if (search?.trim()) {
        const regex = new RegExp(escapeRegex(search.trim()), "i");
        filter.$or = [{ name: regex }, { email: regex }];
      }

      const docs = await User.find(filter)
        .select("_id name email title createdAt")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      items = docs.map((doc) => ({
        id: (doc._id as mongoose.Types.ObjectId).toString(),
        name: doc.name as string,
        subText: doc.email
          ? `${doc.email}${doc.title ? ` (${doc.title})` : ""}`
          : (doc.title as string | undefined),
        date: doc.createdAt ? new Date(doc.createdAt as Date).toISOString() : null,
        metadata: {
          email: doc.email,
          title: doc.title,
        },
      }));
      break;
    }
  }

  const response: DropdownApiResponse = {
    success: true,
    type,
    items,
    total: items.length,
  };

  return NextResponse.json(response, { status: 200 });
});
