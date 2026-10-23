/**
 * Password Reset Email Template
 * Branded for Advocate Aminul Islam Chowdhury Oly, Judge's Court, Sylhet
 * 
 * Provides responsive, email-client-safe HTML and plaintext variants.
 */

export interface PasswordResetEmailProps {
  recipientName?: string;
  otp: string;
  expiresInMinutes?: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Escapes characters to prevent HTML injection in emails.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderPasswordResetEmail({
  recipientName,
  otp,
  expiresInMinutes = 10,
}: PasswordResetEmailProps): RenderedEmail {
  const safeName = recipientName ? escapeHtml(recipientName) : "Advocate / Chamber Member";
  const formattedOtp = otp.trim();
  const subject = `Your Chamber Password Reset Code: ${formattedOtp}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #070D18; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #070D18; color: #E2E8F0;">
  <!-- Main Container Table -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #070D18; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #0B132B; border: 1px solid #1E2D4A; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Decorative Header Bar -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #D4AF37 0%, #C09A4E 50%, #996515 100%);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 4px 14px; background-color: rgba(192, 154, 78, 0.12); border: 1px solid rgba(192, 154, 78, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #D4AF37; letter-spacing: 1.5px; text-transform: uppercase;">
                      Chamber Security Portal
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 14px;">
                    <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">
                      Advocate Aminul Islam Chowdhury Oly
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #94A3B8; font-weight: 500;">
                      Judge&apos;s Court, Sylhet • Chamber Administration
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="height: 1px; background-color: #1E2D4A; width: 100%;"></div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 36px 20px 36px;">
              <p style="margin: 0 0 14px 0; font-size: 15px; color: #F1F5F9; line-height: 1.6;">
                Dear <strong>${safeName}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #CBD5E1; line-height: 1.6;">
                A password reset request was initiated for your advocate chamber administration account. Use the one-time verification code below to authorize the password change:
              </p>

              <!-- OTP Callout Block -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background-color: #070E1E; border: 1px solid #C09A4E; border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 24px 16px;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94A3B8; font-weight: 600; display: block; margin-bottom: 8px;">
                      One-Time Verification Code
                    </span>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #F3C669; padding-left: 8px;">
                      ${formattedOtp}
                    </div>
                    <span style="font-size: 12px; color: #94A3B8; display: block; margin-top: 10px;">
                      Valid for the next <strong>${expiresInMinutes} minutes</strong>
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Expiry & Safety Notice -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(220, 38, 38, 0.08); border-left: 3px solid #EF4444; border-radius: 4px; padding: 12px 14px; margin-bottom: 20px;">
                <tr>
                  <td style="font-size: 12px; color: #FCA5A5; line-height: 1.5;">
                    <strong>Security Precaution:</strong> Never share this verification code with anyone. Chamber administrators and technical support will never ask for your code.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.5;">
                If you did not request a password reset, please disregard this email or review your account security immediately. Your current password remains secure and unchanged until verified.
              </p>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="padding: 24px 36px 32px 36px; background-color: #070D1A; border-top: 1px solid #142036; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748B; font-weight: 500;">
                Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge&apos;s Court, Sylhet, Bangladesh
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                This is an automated security transmission. Please do not reply directly to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `CHAMBER AUTHENTICATION SECURITY PORTAL
Advocate Aminul Islam Chowdhury Oly
Judge's Court, Sylhet • Chamber Administration

Dear ${recipientName || "Advocate / Chamber Member"},

A password reset was requested for your chamber account. Use the following one-time verification code:

VERIFICATION CODE: ${formattedOtp}

This code is valid for ${expiresInMinutes} minutes and can only be used once.

SECURITY NOTICE:
Never share this code with anyone. Chamber administrators and staff will never request your code.

If you did not request this password reset, no action is required and your account remains secure.

--------------------------------------------------
Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet, Bangladesh
Automated Security Transmission - Do not reply directly.`;

  return { subject, html, text };
}

export default renderPasswordResetEmail;
