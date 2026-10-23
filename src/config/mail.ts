import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPPool from "nodemailer/lib/smtp-pool";
import env from "./env";


/**
 * Creates and configures the Nodemailer SMTP transporter.
 * Leverages connection pooling and explicit timeouts for production reliability.
 */
function createTransporter(): Transporter {
  const host = process.env.SMTP_HOST || env.SMTP_HOST;
  const user = (process.env.SMTP_USER || env.SMTP_USER).trim().replace(/^['"]|['"]$/g, "");
  const rawPass = (process.env.SMTP_PASSWORD || env.SMTP_PASSWORD).trim();
  const cleanPassword = rawPass
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+/g, "");

  const isGmail =
    host.toLowerCase().includes("gmail") ||
    user.toLowerCase().endsWith("@gmail.com");

  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass: cleanPassword,
      },
    });
  }

  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : env.SMTP_PORT;
  const secure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === "true"
    : env.SMTP_SECURE;

  const transportOptions: SMTPPool.Options = {
    host,
    port,
    secure,
    auth: {
      user,
      pass: cleanPassword,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
  };

  return nodemailer.createTransport(transportOptions);
}

/**
 * Dynamic SMTP transporter instance that always resolves the current credentials.
 */
export const mailTransporter = {
  sendMail: (options: Parameters<Transporter["sendMail"]>[0]) => {
    return createTransporter().sendMail(options);
  },
  verify: () => {
    return createTransporter().verify();
  },
} as unknown as Transporter;

/**
 * Standard default sender address for chamber transactional emails.
 */
export const DEFAULT_MAIL_FROM =
  env.SMTP_FROM || `"Advocate Oly Chowdhury" <${env.SMTP_USER}>`;

/**
 * Diagnostic helper to verify SMTP connection without exposing sensitive credentials.
 */
export async function verifyMailConnection(): Promise<boolean> {
  try {
    await mailTransporter.verify();
    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [SMTP Transport Error]: Failed to establish SMTP connection:", errorMsg);
    return false;
  }
}

export default mailTransporter;
