import { NextRequest } from "next/server";
import { ClientSession, Types } from "mongoose";
import { AuditLog } from "@/db/models/AuditLog.model";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AuditAction,
  AuditEntityType,
} from "@/const/audit-log.const";
import { getAuthSession } from "@/lib/auth/auth.helper";

/**
 * Sensitive fields that must NEVER be persisted in audit logs.
 */
const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "secret",
  "refreshToken",
  "accessToken",
  "salt",
]);

/**
 * System metadata fields that should be omitted from diff tracking.
 */
const SYSTEM_IGNORED_FIELDS = new Set([
  "_id",
  "__v",
  "updatedAt",
  "createdAt",
  "passwordHash",
]);

export interface AuditRequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Extracts client IP address and User Agent string from an incoming request.
 */
export function extractAuditReqMeta(
  req?: NextRequest | Request | null
): AuditRequestMeta {
  if (!req) {
    return { ipAddress: null, userAgent: null };
  }

  let ipAddress: string | null = null;
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    ipAddress = forwardedFor.split(",")[0].trim();
  } else if (req.headers.get("x-real-ip")) {
    ipAddress = req.headers.get("x-real-ip")!.trim();
  } else if (req.headers.get("cf-connecting-ip")) {
    ipAddress = req.headers.get("cf-connecting-ip")!.trim();
  } else if ("ip" in req && typeof (req as { ip?: string }).ip === "string") {
    ipAddress = (req as { ip: string }).ip;
  }

  const userAgent = req.headers.get("user-agent") || null;

  return { ipAddress, userAgent };
}

/**
 * Normalizes values to plain JavaScript objects and strips sensitive credentials.
 */
export function sanitizeAuditPayload(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle Mongoose Document
  if (
    typeof value === "object" &&
    value !== null &&
    "toObject" in value &&
    typeof (value as { toObject: unknown }).toObject === "function"
  ) {
    return sanitizeAuditPayload(
      (value as { toObject: (opts?: unknown) => Record<string, unknown> }).toObject({
        depopulate: true,
      })
    );
  }

  // Handle MongoDB ObjectId
  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  // Handle Date
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item));
  }

  // Handle Plain Objects
  if (typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_FIELDS.has(key)) {
        sanitized[key] = "[REDACTED]";
        continue;
      }
      sanitized[key] = sanitizeAuditPayload(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Checks equality between two values, taking into account ObjectIds, Dates, and JSON equivalence.
 */
function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // Compare ObjectIds
  if (a instanceof Types.ObjectId || b instanceof Types.ObjectId) {
    return a.toString() === b.toString();
  }

  // Compare Dates
  if (a instanceof Date || b instanceof Date) {
    const timeA = a instanceof Date ? a.getTime() : new Date(String(a)).getTime();
    const timeB = b instanceof Date ? b.getTime() : new Date(String(b)).getTime();
    return timeA === timeB;
  }

  // Compare complex objects or arrays
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(sanitizeAuditPayload(a)) === JSON.stringify(sanitizeAuditPayload(b));
  }

  // Number / String comparisons (e.g. "123" vs 123 shouldn't be equal, but "id" vs Types.ObjectId string)
  if (typeof a !== typeof b) {
    return String(a) === String(b);
  }

  return false;
}

/**
 * Generic dictionary payload type accepting plain records, Mongoose documents, and typed entity objects.
 * Strictly typed with object and Record<string, unknown> without any 'any' usage.
 */
export type AuditStatePayload =
  | Record<string, unknown>
  | object
  | null
  | undefined;

/**
 * Calculates the delta between previous state and updated state,
 * returning only fields that were genuinely modified.
 */
export function calculateAuditDiff<
  TBefore extends object = object,
  TAfter extends object = object,
>(
  before: TBefore | null | undefined,
  after: TAfter | null | undefined
): {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
} {
  const cleanBefore = (sanitizeAuditPayload(before) as Record<string, unknown>) || {};
  const cleanAfter = (sanitizeAuditPayload(after) as Record<string, unknown>) || {};

  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(cleanBefore), ...Object.keys(cleanAfter)]);

  for (const key of allKeys) {
    if (SYSTEM_IGNORED_FIELDS.has(key)) continue;

    const valBefore = cleanBefore[key];
    const valAfter = cleanAfter[key];

    if (!areValuesEqual(valBefore, valAfter)) {
      if (valBefore !== undefined) {
        oldValues[key] = valBefore;
      }
      if (valAfter !== undefined) {
        newValues[key] = valAfter;
      }
    }
  }

  return {
    oldValues: Object.keys(oldValues).length > 0 ? oldValues : null,
    newValues: Object.keys(newValues).length > 0 ? newValues : null,
  };
}

export interface RecordAuditLogParams<
  TOld extends object = object,
  TNew extends object = object,
> {
  req?: NextRequest | Request | null;
  userId?: string | Types.ObjectId | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | Types.ObjectId;
  oldValues?: TOld | Record<string, unknown> | null;
  newValues?: TNew | Record<string, unknown> | null;
  description?: string | null;
  session?: ClientSession | null;
}

/**
 * Core compliance audit logger. Persists an immutable audit log entry to MongoDB.
 *
 * Supports execution inside active Mongoose transactions.
 * Automatically sanitizes sensitive payloads and resolves client IP/User-Agent.
 */
export async function recordAuditLog<
  TOld extends object = object,
  TNew extends object = object,
>(params: RecordAuditLogParams<TOld, TNew>) {
  const {
    req,
    userId: explicitUserId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    description,
    session,
  } = params;

  // Resolve authenticated user ID
  let resolvedUserId: Types.ObjectId | null = null;
  if (explicitUserId) {
    resolvedUserId =
      explicitUserId instanceof Types.ObjectId
        ? explicitUserId
        : Types.ObjectId.isValid(explicitUserId)
        ? new Types.ObjectId(explicitUserId)
        : null;
  } else {
    try {
      const authSession = await getAuthSession();
      if (authSession?.user?.id && Types.ObjectId.isValid(authSession.user.id)) {
        resolvedUserId = new Types.ObjectId(authSession.user.id);
      }
    } catch {
      resolvedUserId = null;
    }
  }

  // Resolve target entity ID
  const targetEntityId =
    entityId instanceof Types.ObjectId
      ? entityId
      : new Types.ObjectId(String(entityId));

  // Extract client metadata
  const { ipAddress, userAgent } = extractAuditReqMeta(req);

  // Sanitize state payloads
  const sanitizedOld = oldValues ? (sanitizeAuditPayload(oldValues) as Record<string, unknown>) : null;
  const sanitizedNew = newValues ? (sanitizeAuditPayload(newValues) as Record<string, unknown>) : null;

  const auditEntry = new AuditLog({
    userId: resolvedUserId,
    action,
    entityType,
    entityId: targetEntityId,
    oldValues: sanitizedOld,
    newValues: sanitizedNew,
    description: description || null,
    ipAddress,
    userAgent,
    createdAt: new Date(),
  });

  if (session) {
    await auditEntry.save({ session });
  } else {
    await auditEntry.save();
  }

  return auditEntry;
}

export { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES };
