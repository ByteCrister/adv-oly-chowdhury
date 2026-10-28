
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import ConnectDB from "@/config/db";
import User from "@/db/models/User.model";
import PasswordResetRequest from "@/db/models/PasswordResetRequest.model";
import inngest from "@/config/inngest";
import {
  generateOtp,
  generateSalt,
  hashOtp,
  verifyOtpHash,
  generateResetAuthToken,
  hashResetAuthToken,
  verifyResetAuthToken,
  encryptPayload,
} from "@/lib/auth/otp.helper";
import { ApiError } from "@/lib/helpers/withErrorHandler";
import { clearFailedAttempts } from "@/lib/services/redis.service";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import {
  PASSWORD_RESET_STATUSES,
  PASSWORD_RESET_DELIVERY_STATUSES,
  PASSWORD_RESET_MAX_ATTEMPTS,
  PASSWORD_RESET_OTP_EXPIRATION_MS,
  PASSWORD_RESET_TOKEN_EXPIRATION_MS,
} from "@/const/password-reset.const";



export interface RequestResetParams {
  email: string;
  ip: string;
  userAgent?: string;
}

export interface VerifyOtpParams {
  requestId: string;
  otp: string;
  ip: string;
}

export interface ConfirmResetParams {
  requestId: string;
  resetToken: string;
  newPassword: string;
  ip: string;
  req?: NextRequest;
}

/**
 * Initiates an OTP-based password reset request.
 * Rejects immediately if no active chamber account matches the supplied email.
 * This is a single-user system — account enumeration prevention is not applicable.
 */
export async function requestPasswordReset({
  email,
  ip,
  userAgent,
}: RequestResetParams): Promise<{
  success: boolean;
  message: string;
  requestId: string;
}> {
  await ConnectDB();
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
    isActive: true,
  }).lean();

  const successMessage =
    "A 6-digit verification code has been dispatched to your registered chamber email. Please check your inbox.";

  // Single-user system: reject unknown or inactive accounts immediately with a clear error.
  // Account enumeration prevention is not applicable here — there is only one valid account.
  if (!user) {
    throw new ApiError(
      "No active chamber account was found for that email address. Please verify the email and try again.",
      404
    );
  }

  // Supersede previous pending or active reset requests for this user
  await PasswordResetRequest.updateMany(
    {
      userId: user._id,
      status: {
        $in: [
          PASSWORD_RESET_STATUSES.ACTIVE,
          PASSWORD_RESET_STATUSES.VERIFIED,
        ],
      },
    },
    {
      $set: { status: PASSWORD_RESET_STATUSES.SUPERSEDED },
    }
  );

  // Generate cryptographically secure OTP and verification artifacts
  const otp = generateOtp();
  const salt = generateSalt();
  const otpVerifier = hashOtp(otp, salt);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_EXPIRATION_MS);

  // Store request in dedicated MongoDB collection
  const resetDoc = await PasswordResetRequest.create({
    userId: user._id,
    email: user.email,
    otpVerifier,
    salt,
    expiresAt,
    isVerified: false,
    isConsumed: false,
    attemptsCount: 0,
    maxAttempts: PASSWORD_RESET_MAX_ATTEMPTS,
    ipAddress: ip,
    userAgent: userAgent || null,
    deliveryStatus: PASSWORD_RESET_DELIVERY_STATUSES.PENDING,
    deliveryAttempts: 0,
    status: PASSWORD_RESET_STATUSES.ACTIVE,
  });

  // Encrypt OTP with AES-256-GCM before embedding in Inngest event
  const { ciphertext, iv, tag } = encryptPayload(otp);

  // Dispatch background email delivery job via Inngest
  await inngest.send({
    name: "auth/password-reset.requested",
    data: {
      requestId: resetDoc._id.toString(),
      email: user.email,
      recipientName: user.name,
      encryptedOtp: ciphertext,
      iv,
      tag,
    },
  });

  return {
    success: true,
    message: successMessage,
    requestId: resetDoc._id.toString(),
  };
}

/**
 * Validates a user-supplied OTP against stored cryptographic verifiers.
 * On success, issues a single-use, short-lived reset authorization token.
 */
export async function verifyPasswordResetOtp({
  requestId,
  otp,
}: VerifyOtpParams): Promise<{
  success: boolean;
  message: string;
  resetToken: string;
  requestId: string;
}> {
  await ConnectDB();

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw ApiError.badRequest("Invalid verification code or code has expired.");
  }

  const resetDoc = await PasswordResetRequest.findById(requestId).select(
    "+otpVerifier +salt"
  );

  if (!resetDoc) {
    throw ApiError.badRequest("Invalid verification code or code has expired.");
  }

  if (resetDoc.status === PASSWORD_RESET_STATUSES.SUPERSEDED) {
    throw ApiError.badRequest(
      "A newer verification code was requested. Please use the most recent code sent to your email."
    );
  }

  if (resetDoc.status === PASSWORD_RESET_STATUSES.CONSUMED || resetDoc.isConsumed) {
    throw ApiError.badRequest("This verification code has already been used.");
  }

  if (resetDoc.status === PASSWORD_RESET_STATUSES.EXPIRED || new Date() > new Date(resetDoc.expiresAt)) {
    if (resetDoc.status !== PASSWORD_RESET_STATUSES.EXPIRED) {
      await PasswordResetRequest.findByIdAndUpdate(resetDoc._id, {
        $set: { status: PASSWORD_RESET_STATUSES.EXPIRED },
      });
    }
    throw ApiError.badRequest(
      "This verification code has expired. Please request a new code."
    );
  }

  if (resetDoc.attemptsCount >= resetDoc.maxAttempts) {
    await PasswordResetRequest.findByIdAndUpdate(resetDoc._id, {
      $set: { status: PASSWORD_RESET_STATUSES.EXPIRED },
    });
    throw ApiError.badRequest(
      "Maximum verification attempts exceeded. Please request a new code."
    );
  }

  // Constant-time OTP comparison
  const isMatch = verifyOtpHash(otp, resetDoc.salt, resetDoc.otpVerifier);

  if (!isMatch) {
    const updated = await PasswordResetRequest.findByIdAndUpdate(
      resetDoc._id,
      { $inc: { attemptsCount: 1 } },
      { new: true }
    );

    const remainingAttempts = Math.max(
      0,
      resetDoc.maxAttempts - (updated?.attemptsCount || resetDoc.attemptsCount + 1)
    );

    if (remainingAttempts === 0) {
      await PasswordResetRequest.findByIdAndUpdate(resetDoc._id, {
        $set: { status: PASSWORD_RESET_STATUSES.EXPIRED },
      });
      throw ApiError.badRequest(
        "Invalid verification code. Maximum verification attempts exceeded. Please request a new code."
      );
    }

    throw ApiError.badRequest(
      `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`
    );
  }

  // Issue short-lived reset authorization token
  const resetToken = generateResetAuthToken();
  const resetTokenVerifier = hashResetAuthToken(resetToken);
  const resetTokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRATION_MS);

  // Transition state atomically to 'verified'
  const atomicUpdate = await PasswordResetRequest.findOneAndUpdate(
    {
      _id: resetDoc._id,
      status: PASSWORD_RESET_STATUSES.ACTIVE,
      isVerified: false,
    },
    {
      $set: {
        isVerified: true,
        verifiedAt: new Date(),
        status: PASSWORD_RESET_STATUSES.VERIFIED,
        resetTokenVerifier,
        resetTokenExpiresAt,
      },
    },
    { new: true }
  );

  if (!atomicUpdate) {
    throw ApiError.badRequest(
      "Verification could not be completed. The request may have already been processed."
    );
  }

  return {
    success: true,
    message: "Verification successful.",
    resetToken,
    requestId: resetDoc._id.toString(),
  };
}

/**
 * Validates the reset authorization token and commits the new password.
 * Atomically consumes the authorization to prevent replay attacks.
 */
export async function confirmPasswordReset({
  requestId,
  resetToken,
  newPassword,
  req,
}: ConfirmResetParams): Promise<{
  success: boolean;
  message: string;
}> {
  await ConnectDB();

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw ApiError.badRequest(
      "Invalid or expired password reset authorization."
    );
  }

  const resetDoc = await PasswordResetRequest.findById(requestId).select(
    "+resetTokenVerifier"
  );

  if (
    !resetDoc ||
    resetDoc.status !== PASSWORD_RESET_STATUSES.VERIFIED ||
    resetDoc.isConsumed ||
    !resetDoc.resetTokenVerifier ||
    !resetDoc.resetTokenExpiresAt
  ) {
    throw ApiError.badRequest(
      "Invalid or expired password reset authorization. Please restart the reset process."
    );
  }

  if (new Date() > new Date(resetDoc.resetTokenExpiresAt)) {
    await PasswordResetRequest.findByIdAndUpdate(resetDoc._id, {
      $set: { status: PASSWORD_RESET_STATUSES.EXPIRED },
    });
    throw ApiError.badRequest(
      "Password reset authorization has expired. Please restart the reset process."
    );
  }

  // Verify the authorization token
  const tokenMatches = verifyResetAuthToken(
    resetToken,
    resetDoc.resetTokenVerifier
  );

  if (!tokenMatches) {
    throw ApiError.badRequest(
      "Invalid password reset authorization token."
    );
  }

  // Atomically consume authorization BEFORE applying database mutations
  const consumedDoc = await PasswordResetRequest.findOneAndUpdate(
    {
      _id: resetDoc._id,
      status: PASSWORD_RESET_STATUSES.VERIFIED,
      isConsumed: false,
    },
    {
      $set: {
        isConsumed: true,
        consumedAt: new Date(),
        status: PASSWORD_RESET_STATUSES.CONSUMED,
      },
    }
  );

  if (!consumedDoc) {
    throw ApiError.badRequest(
      "This reset authorization has already been consumed."
    );
  }

  // Hash new password using bcrypt cost factor 12 (project standard)
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  // Update user password and session security timestamp
  await User.findByIdAndUpdate(resetDoc.userId, {
    $set: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });

  // Clear any existing brute-force failure lockouts in Redis
  await clearFailedAttempts(resetDoc.email);

  // Record audit log entry
  if (req) {
    await recordAuditLog({
      req,
      userId: resetDoc.userId.toString(),
      action: AUDIT_ACTIONS.UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: resetDoc.userId.toString(),
      oldValues: { passwordReset: false },
      newValues: { passwordReset: true },
      description: "User completed password reset via verified email OTP",
    });
  }

  return {
    success: true,
    message: "Your chamber master password has been successfully reset. You may now sign in.",
  };
}
