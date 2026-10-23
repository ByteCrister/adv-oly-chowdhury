import { z } from "zod";

/**
 * Zod schema for initiating a password reset request.
 */
export const passwordResetRequestSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase()),
});

export type PasswordResetRequestDto = z.infer<typeof passwordResetRequestSchema>;

/**
 * Zod schema for verifying a one-time verification code (OTP).
 */
export const passwordResetVerifySchema = z.object({
  requestId: z
    .string({ message: "Request identifier is required" })
    .min(1, "Request identifier is required"),
  otp: z
    .string({ message: "Verification code is required" })
    .trim()
    .regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
});

export type PasswordResetVerifyDto = z.infer<typeof passwordResetVerifySchema>;

/**
 * Zod schema for confirming new password with verified reset authorization token.
 */
export const passwordResetConfirmSchema = z
  .object({
    requestId: z
      .string({ message: "Request identifier is required" })
      .min(1, "Request identifier is required"),
    resetToken: z
      .string({ message: "Reset authorization token is required" })
      .min(32, "Invalid reset authorization token"),
    newPassword: z
      .string({ message: "New password is required" })
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string({ message: "Password confirmation is required" })
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export type PasswordResetConfirmDto = z.infer<typeof passwordResetConfirmSchema>;
