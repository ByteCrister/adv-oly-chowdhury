import { Inngest } from "inngest";
import env from "./env";

/**
 * Event payload definitions for Inngest background functions.
 */
export interface PasswordResetRequestedPayload {
  requestId: string;
  email: string;
  recipientName?: string;
  encryptedOtp: string;
  iv: string;
  tag: string;
}

export type ChamberInngestEvents = {
  "auth/password-reset.requested": {
    data: PasswordResetRequestedPayload;
  };
};

/**
 * Reusable, centralized Inngest client configured with validated environment variables.
 */
export const inngest = new Inngest({
  id: "adv-oly-chowdhury",
  eventKey: env.INNGEST_EVENT_KEY,
  signingKey: env.INNGEST_SIGNING_KEY,
  isDev: process.env.NODE_ENV === "development",
});

export default inngest;
