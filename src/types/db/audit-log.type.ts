import { Document, Types } from "mongoose";
import { AuditAction, AuditEntityType } from "@/const/audit-log.const";

export interface IAuditLog {
  userId?: Types.ObjectId | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: Types.ObjectId;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface IAuditLogDocument extends IAuditLog, Document<Types.ObjectId> {}
