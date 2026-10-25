/**
 * Password Reset Email Template
 * Branded for Advocate Aminul Islam Chowdhury Oly, Judge's Court, Sylhet
 * 
 * Provides a clean, professional, fully responsive, email-client-safe HTML and plaintext email.
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
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F4F6F9; }
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 16px 10px !important;
      }
      .card-content {
        padding: 24px 20px !important;
      }
      .card-header {
        padding: 24px 20px 18px 20px !important;
      }
      .card-footer {
        padding: 20px 20px !important;
      }
      .header-title {
        font-size: 19px !important;
      }
      .otp-code {
        font-size: 28px !important;
        letter-spacing: 6px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;">

  <!-- Preheader text for mailbox snippet preview -->
  <div style="display: none; font-size: 1px; color: #F4F6F9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your password reset verification code is ${formattedOtp}. This code expires in ${expiresInMinutes} minutes.
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Outer Canvas Table -->
  <table class="email-wrapper" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F6F9; padding: 36px 16px;">
    <tr>
      <td align="center" valign="top">

        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="580" style="width: 580px;">
          <tr>
            <td align="center" valign="top">
        <![endif]-->

        <!-- Main Card Table -->
        <table class="card-container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">

          <!-- Top Brand Accent Line -->
          <tr>
            <td height="4" style="background-color: #0F172A; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td class="card-header" align="left" style="padding: 32px 36px 20px 36px; border-bottom: 1px solid #EEF2F6;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h1 class="header-title" style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 21px; font-weight: 700; color: #0F172A; line-height: 1.3; letter-spacing: 0.2px;">
                      Advocate Aminul Islam Chowdhury Oly
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.8px;">
                      Judge&apos;s Court, Sylhet &nbsp;&bull;&nbsp; Chamber Portal
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="card-content" style="padding: 32px 36px 28px 36px;">

              <!-- Greeting -->
              <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 600; color: #0F172A; line-height: 1.5;">
                Dear ${safeName},
              </p>

              <!-- Description -->
              <p style="margin: 0 0 24px 0; font-size: 14.5px; color: #334155; line-height: 1.6;">
                We received a request to reset the password for your chamber account. Please use the verification code below to proceed with setting a new password.
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="padding: 24px 16px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
                    <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1.5px;">
                      Verification Code
                    </p>
                    <div class="otp-code" style="font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 34px; font-weight: 700; color: #0F172A; letter-spacing: 8px; padding-left: 8px; line-height: 1.2; text-align: center; user-select: all; -webkit-user-select: all;">
                      ${formattedOtp}
                    </div>
                    <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748B; line-height: 1.4;">
                      Expires in <strong style="color: #334155;">${expiresInMinutes} minutes</strong> &nbsp;&bull;&nbsp; One-time use only
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Information Note -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 16px 0;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #F8FAFC; border-left: 3px solid #0F172A; border-radius: 0 4px 4px 0;">
                    <p style="margin: 0; font-size: 12.5px; color: #475569; line-height: 1.6;">
                      <strong style="color: #0F172A;">Security notice:</strong> If you did not request this password reset, please disregard this email. Your password will remain unchanged. Never share this code with anyone &mdash; chamber staff will never ask for your code.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="card-footer" style="padding: 24px 36px 28px 36px; background-color: #F8FAFC; border-top: 1px solid #EEF2F6;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 12px; color: #64748B; line-height: 1.6;">
                    <strong style="color: #334155;">Advocate Aminul Islam Chowdhury Oly</strong><br>
                    Chamber No. 323 (3rd Floor), Bar Hall No: 02<br>
                    Judge&apos;s Court, Sylhet, Bangladesh
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px; font-size: 11px; color: #94A3B8; line-height: 1.5; border-top: 1px solid #E2E8F0;">
                    This is an automated transmission from the Chamber Management Portal. Please do not reply directly to this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- Main Card Table End -->

        <!-- Copyright outside card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin-top: 16px;">
          <tr>
            <td align="center" style="font-size: 11px; color: #94A3B8; line-height: 1.5;">
              &copy; ${new Date().getFullYear()} Advocate Aminul Islam Chowdhury Oly. All rights reserved.
            </td>
          </tr>
        </table>

        <!--[if (gte mso 9)|(IE)]>
            </td>
          </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `ADVOCATE AMINUL ISLAM CHOWDHURY OLY
Judge's Court, Sylhet • Chamber Portal

Dear ${recipientName || "Advocate / Chamber Member"},

We received a request to reset the password for your chamber account. Please use the verification code below to proceed with setting a new password:

VERIFICATION CODE: ${formattedOtp}

This code is valid for ${expiresInMinutes} minutes and can only be used once.

SECURITY NOTICE:
If you did not request this password reset, please disregard this email. Your password will remain unchanged. Never share this code with anyone; chamber staff will never ask for your verification code.

--------------------------------------------------
Advocate Aminul Islam Chowdhury Oly
Chamber No. 323 (3rd Floor), Bar Hall No: 02
Judge's Court, Sylhet, Bangladesh

Automated Chamber Notification — Please do not reply directly to this email.`;

  return { subject, html, text };
}

export default renderPasswordResetEmail;
