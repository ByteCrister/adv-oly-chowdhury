import inngest, { PasswordResetRequestedPayload } from "@/config/inngest";
import ConnectDB from "@/config/db";
import PasswordResetRequest from "@/db/models/PasswordResetRequest.model";
import { decryptPayload } from "@/lib/auth/otp.helper";
import { sendMail } from "@/lib/services/mail.service";
import { renderPasswordResetEmail } from "@/lib/emails/templates/PasswordResetEmail";
import { NonRetriableError } from "inngest";
import {
  PASSWORD_RESET_STATUSES,
  PASSWORD_RESET_DELIVERY_STATUSES,
} from "@/const/password-reset.const";

/**
 * Inngest background function that safely delivers password reset OTP emails.
 * 
 * Features:
 * - Decrypts the transient OTP from AES-256-GCM in memory.
 * - Enforces database request validity and expiry checks before dispatching SMTP.
 * - Idempotency guard prevents duplicate email dispatches.
 * - Controlled retry policy with exponential backoff for transient SMTP failures.
 */
export const sendPasswordResetEmail = inngest.createFunction(
  {
    id: "send-password-reset-email",
    name: "Send Chamber Password Reset Email",
    retries: 3,
    triggers: [{ event: "auth/password-reset.requested" }],
  },
  async ({ event, step }) => {
    const { requestId, email, recipientName, encryptedOtp, iv, tag } =
      event.data as PasswordResetRequestedPayload;

    // Step 1: Query database to ensure the reset request is active and valid
    const preCheck = await step.run("verify-request-state", async () => {
      await ConnectDB();
      const resetDoc = await PasswordResetRequest.findById(requestId).lean();

      if (!resetDoc) {
        throw new NonRetriableError(
          `Password reset request ${requestId} does not exist.`
        );
      }

      // Check if this request was superseded by a newer one or consumed
      if (resetDoc.status === PASSWORD_RESET_STATUSES.SUPERSEDED) {
        return {
          valid: false,
          reason: "Request superseded by a newer reset request.",
        };
      }

      if (resetDoc.status === PASSWORD_RESET_STATUSES.CONSUMED || resetDoc.isConsumed) {
        return {
          valid: false,
          reason: "Request has already been consumed.",
        };
      }

      if (new Date() > new Date(resetDoc.expiresAt) || resetDoc.status === PASSWORD_RESET_STATUSES.EXPIRED) {
        return {
          valid: false,
          reason: "Request has expired.",
        };
      }

      // Idempotency: if already marked sent, avoid duplicate email
      if (resetDoc.deliveryStatus === PASSWORD_RESET_DELIVERY_STATUSES.SENT) {
        return {
          valid: false,
          reason: "Email already dispatched for this reset request.",
        };
      }

      return { valid: true, reason: null };
    });

    if (!preCheck.valid) {
      console.log(`ℹ️ [INNGEST PASSWORD RESET]: Skipping email delivery - ${preCheck.reason}`);
      return { skipped: true, reason: preCheck.reason };
    }

    // Step 2: Decrypt OTP in memory and dispatch email via Nodemailer
    const delivery = await step.run("dispatch-smtp-email", async () => {
      let rawOtp: string;
      try {
        rawOtp = decryptPayload(encryptedOtp, iv, tag);
      } catch (err) {
        throw new NonRetriableError(
          `Failed to decrypt OTP payload: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      const emailData = renderPasswordResetEmail({
        recipientName,
        otp: rawOtp,
        expiresInMinutes: 10,
      });

      return await sendMail({
        to: email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });
    });

    // Step 3: Record successful delivery in database
    await step.run("record-delivery-status", async () => {
      await ConnectDB();
      await PasswordResetRequest.findByIdAndUpdate(requestId, {
        $set: {
          deliveryStatus: PASSWORD_RESET_DELIVERY_STATUSES.SENT,
          lastDeliveredAt: new Date(),
          deliveryError: null,
        },
        $inc: { deliveryAttempts: 1 },
      });
    });

    return {
      success: true,
      requestId,
      messageId: delivery.messageId,
    };
  }
);

export default sendPasswordResetEmail;
