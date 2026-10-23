import { mailTransporter, DEFAULT_MAIL_FROM } from "@/config/mail";

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

/**
 * Anonymizes an email address for safe audit logging (e.g. j***e@domain.com).
 */
function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const maskedLocal =
    local.length <= 2 ? `${local[0]}***` : `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Reusable mail sender service utilizing the configured singleton SMTP transporter.
 */
export async function sendMail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_MAIL_FROM,
}: SendMailOptions): Promise<SendMailResult> {
  const maskedRecipient = maskEmail(to);

  try {
    const info = await mailTransporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    });

    const acceptedList = (Array.isArray(info.accepted) ? info.accepted : [info.accepted])
      .map(String)
      .filter(Boolean);
    const rejectedList = (Array.isArray(info.rejected) ? info.rejected : [info.rejected])
      .map(String)
      .filter(Boolean);

    // Operational log containing NO sensitive content or OTPs
    console.log(
      `✉️ [MAIL DISPATCH SUCCESS] messageId=${info.messageId} to=${maskedRecipient} accepted=${acceptedList.length} rejected=${rejectedList.length}`
    );

    return {
      messageId: info.messageId,
      accepted: acceptedList,
      rejected: rejectedList,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `❌ [MAIL DISPATCH FAILED] to=${maskedRecipient} error=${errorMessage}`
    );
    throw new Error(`SMTP dispatch failure: ${errorMessage}`);
  }
}

export default sendMail;
