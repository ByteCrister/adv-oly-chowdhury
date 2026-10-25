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
import { sanitizeSearchParam, buildSearchFilter } from "@/lib/helpers/search.helper";

/**
 * Safely converts any date representation into an ISO string or null.
 * Protects against RangeError: Invalid time value exceptions.
 */
function toIsoDateOrNull(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as string | number | Date);
  return !isNaN(d.getTime()) ? d.toISOString() : null;
}

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

      const clientSearchFilter = buildSearchFilter(search, [
        "name",
        "clientNumber",
        "organizationName",
        "phone",
      ]);
      if (clientSearchFilter) {
        filter.$or = clientSearchFilter;
      }

      const docs = await Client.find(filter)
        .select("_id name clientNumber organizationName phone createdAt clientType status")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      items = docs.map((doc) => {
        let subText: string | null = null;
        if (doc.clientNumber) {
          subText = doc.organizationName
            ? `${doc.clientNumber} • ${doc.organizationName}`
            : String(doc.clientNumber);
        } else if (doc.organizationName) {
          subText = String(doc.organizationName);
        } else if (doc.phone) {
          subText = String(doc.phone);
        }

        return {
          id: String(doc._id),
          name: String(doc.name || ""),
          subText,
          date: toIsoDateOrNull(doc.createdAt),
          metadata: {
            clientNumber: doc.clientNumber ? String(doc.clientNumber) : null,
            clientType: doc.clientType ? String(doc.clientType) : null,
            status: doc.status ? String(doc.status) : null,
            phone: doc.phone ? String(doc.phone) : null,
            organizationName: doc.organizationName ? String(doc.organizationName) : null,
          },
        };
      });
      break;
    }

    case DROPDOWN_TYPES.COURT: {
      const filter: Record<string, unknown> = { isActive: true, deletedAt: null };

      const courtSearchFilter = buildSearchFilter(search, [
        "name",
        "district",
        "courtType",
        "presidingJudgeTitle",
      ]);
      if (courtSearchFilter) {
        filter.$or = courtSearchFilter;
      }

      const docs = await Court.find(filter)
        .select("_id name courtType district division roomOrHall createdAt")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      items = docs.map((doc) => {
        const parts = [doc.district, doc.courtType].filter(Boolean);
        const subText = parts.length > 0 ? parts.join(" • ") : null;

        return {
          id: String(doc._id),
          name: String(doc.name || ""),
          subText,
          date: toIsoDateOrNull(doc.createdAt),
          metadata: {
            courtType: doc.courtType ? String(doc.courtType) : null,
            district: doc.district ? String(doc.district) : null,
            division: doc.division ? String(doc.division) : null,
            roomOrHall: doc.roomOrHall ? String(doc.roomOrHall) : null,
          },
        };
      });
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

      const caseSearchFilter = buildSearchFilter(search, [
        "title",
        "caseNumber",
        "internalReference",
      ]);
      if (caseSearchFilter) {
        filter.$or = caseSearchFilter;
      }

      const docs = await Case.find(filter)
        .select("_id title caseNumber internalReference filingDate nextHearingDate caseStatus courtId clientId createdAt")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      items = docs.map((doc) => {
        let subText: string | null = null;
        if (doc.caseNumber && doc.internalReference) {
          subText = `${doc.caseNumber} (${doc.internalReference})`;
        } else if (doc.caseNumber) {
          subText = String(doc.caseNumber);
        } else if (doc.internalReference) {
          subText = String(doc.internalReference);
        }

        return {
          id: String(doc._id),
          name: String(doc.title || ""),
          subText,
          date: toIsoDateOrNull(doc.filingDate) ?? toIsoDateOrNull(doc.createdAt),
          metadata: {
            caseNumber: doc.caseNumber ? String(doc.caseNumber) : null,
            internalReference: doc.internalReference ? String(doc.internalReference) : null,
            caseStatus: doc.caseStatus ? String(doc.caseStatus) : null,
            clientId: doc.clientId ? String(doc.clientId) : null,
            courtId: doc.courtId ? String(doc.courtId) : null,
            nextHearingDate: toIsoDateOrNull(doc.nextHearingDate),
          },
        };
      });
      break;
    }

    case DROPDOWN_TYPES.USER: {
      const filter: Record<string, unknown> = { isActive: true };

      const userSearchFilter = buildSearchFilter(search, ["name", "email"]);
      if (userSearchFilter) {
        filter.$or = userSearchFilter;
      }

      const docs = await User.find(filter)
        .select("_id name email title createdAt")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      items = docs.map((doc) => {
        let subText: string | null = null;
        if (doc.email) {
          subText = doc.title ? `${doc.email} (${doc.title})` : String(doc.email);
        } else if (doc.title) {
          subText = String(doc.title);
        }

        return {
          id: String(doc._id),
          name: String(doc.name || ""),
          subText,
          date: toIsoDateOrNull(doc.createdAt),
          metadata: {
            email: doc.email ? String(doc.email) : null,
            title: doc.title ? String(doc.title) : null,
          },
        };
      });
      break;
    }

    default: {
      items = [];
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
