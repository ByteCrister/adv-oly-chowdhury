import { Document, Types } from "mongoose";
import {
  PasswordResetStatus,
  PasswordResetDeliveryStatus,
} from "@/const/password-reset.const";

// Re-export so existing consumers of this module keep working without changes.
export type { PasswordResetStatus, PasswordResetDeliveryStatus };

export interface IPasswordResetRequest {
  userId: Types.ObjectId;
  email: string;
  otpVerifier: string;
  salt: string;
  expiresAt: Date;
  isVerified: boolean;
  verifiedAt?: Date | null;
  isConsumed: boolean;
  consumedAt?: Date | null;
  attemptsCount: number;
  maxAttempts: number;
  resetTokenVerifier?: string | null;
  resetTokenExpiresAt?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deliveryStatus: PasswordResetDeliveryStatus;
  deliveryAttempts: number;
  lastDeliveredAt?: Date | null;
  deliveryError?: string | null;
  status: PasswordResetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPasswordResetRequestDocument
  extends IPasswordResetRequest,
    Document<Types.ObjectId> {}
