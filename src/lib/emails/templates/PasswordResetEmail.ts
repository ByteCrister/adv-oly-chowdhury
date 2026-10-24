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
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media screen and (max-width: 600px) {
      .email-wrapper { padding: 20px 12px !important; }
      .card { border-radius: 12px !important; }
      .card-inner { padding: 24px 20px !important; }
      .otp-digit { font-size: 28px !important; padding: 10px 8px !important; }
      .header-title { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #060C1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <!-- Email Wrapper -->
  <table class="email-wrapper" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #060C1A; padding: 48px 24px;">
    <tr>
      <td align="center" valign="top">

        <!-- ═══════════════════════════════════════ -->
        <!--              CARD WRAPPER               -->
        <!-- ═══════════════════════════════════════ -->
        <table class="card" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #0D1730; border: 1px solid #1A2A45; border-radius: 20px; overflow: hidden;">

          <!-- ▓▓▓ GOLD ACCENT BAR ▓▓▓ -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #B8860B 0%, #D4AF37 40%, #F0CE6A 65%, #C09A4E 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- ▓▓▓ HEADER ▓▓▓ -->
          <tr>
            <td align="center" style="padding: 40px 40px 28px 40px; background: linear-gradient(180deg, #111D3A 0%, #0D1730 100%);">

              <!-- Lock Icon Badge -->
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="width: 72px; height: 72px; background-color: rgba(212, 175, 55, 0.1); border: 1.5px solid rgba(212, 175, 55, 0.35); border-radius: 50%;">
                    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" style="height:72px;v-text-anchor:middle;width:72px;" arcsize="50%" strokecolor="#D4AF37" fillcolor="#1A2A45"><v:textbox inset="0,0,0,0"><![endif]-->
                    <div style="width: 72px; height: 72px; text-align: center; line-height: 72px; font-size: 30px;" role="img" aria-label="Security lock">&#128274;</div>
                    <!--[if mso]></v:textbox></v:roundrect><![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Badge Label -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 18px;">
                <tr>
                  <td align="center" style="padding: 5px 16px; background-color: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 999px;">
                    <span style="font-size: 10.5px; font-weight: 700; color: #D4AF37; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap;">&#9670; Chamber Security Portal &#9670;</span>
                  </td>
                </tr>
              </table>

              <!-- Title -->
              <h1 class="header-title" style="margin: 16px 0 0 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.2px; line-height: 1.3;">
                Advocate Aminul Islam Chowdhury Oly
              </h1>
              <p style="margin: 7px 0 0 0; font-size: 12px; color: #7A8FA8; font-weight: 500; letter-spacing: 0.3px;">
                Judge&apos;s Court, Sylhet &nbsp;&bull;&nbsp; Chamber Administration
              </p>
            </td>
          </tr>

          <!-- ▓▓▓ THIN GOLD SEPARATOR ▓▓▓ -->
          <tr>
            <td style="padding: 0 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height: 1px; background: linear-gradient(90deg, transparent 0%, #2A3F5F 20%, #2A3F5F 80%, transparent 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ▓▓▓ BODY CONTENT ▓▓▓ -->
          <tr>
            <td class="card-inner" style="padding: 32px 40px 24px 40px;">

              <!-- Greeting -->
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #E8EDF5; line-height: 1.65; font-weight: 400;">
                Dear <strong style="color: #FFFFFF; font-weight: 700;">${safeName}</strong>,
              </p>
              <p style="margin: 0 0 28px 0; font-size: 14px; color: #8FA0B8; line-height: 1.75;">
                We received a password reset request for your chamber administration account. Please use the secure one-time code below to complete the verification process.
              </p>

              <!-- ═══ OTP BLOCK ═══ -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 28px 20px; background-color: #080F22; border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 14px; background-image: linear-gradient(135deg, #080F22 0%, #0C1528 100%);">

                    <!-- Label -->
                    <p style="margin: 0 0 16px 0; font-size: 10.5px; text-transform: uppercase; letter-spacing: 2.5px; color: #5A7090; font-weight: 700;">
                      One-Time Verification Code
                    </p>

                    <!-- OTP Display -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        ${formattedOtp.split('').map((digit, i) => `
                        <td class="otp-digit" align="center" style="width: 44px; padding: 12px 6px; margin: 0 3px; font-family: 'Courier New', Courier, 'Lucida Console', monospace; font-size: 32px; font-weight: 800; color: #F3C661; background-color: rgba(243, 198, 97, 0.07); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 8px; line-height: 1; letter-spacing: 0;">${digit}</td>
                        ${i < formattedOtp.length - 1 ? '<td style="width: 6px;"></td>' : ''}`).join('')}
                      </tr>
                    </table>

                    <!-- Validity -->
                    <p style="margin: 18px 0 0 0; font-size: 12px; color: #5A7090; line-height: 1.5;">
                      &#128337; Expires in&nbsp;<strong style="color: #8FA0B8;">${expiresInMinutes} minutes</strong> &nbsp;&mdash;&nbsp; Single use only
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ═══ SECURITY WARNING ═══ -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 22px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: rgba(239, 68, 68, 0.07); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="top" style="width: 20px; padding-right: 10px; font-size: 14px; line-height: 1; padding-top: 1px;" aria-hidden="true">&#9888;&#65039;</td>
                        <td style="font-size: 12.5px; color: #F9A8A8; line-height: 1.6;">
                          <strong style="color: #FBBFBF;">Security Notice:</strong>&nbsp; Never share this code with anyone. Chamber staff and technical support will <em>never</em> ask for your verification code.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Ignore Notice -->
              <p style="margin: 22px 0 0 0; font-size: 12.5px; color: #3D546E; line-height: 1.65;">
                If you did not initiate this request, you may safely ignore this email. Your password and account remain secure and unchanged.
              </p>
            </td>
          </tr>

          <!-- ▓▓▓ FOOTER ▓▓▓ -->
          <tr>
            <td align="center" style="padding: 20px 40px 30px 40px; background-color: #080E1E; border-top: 1px solid #141F35;">

              <!-- Decorative rule -->
              <table border="0" cellpadding="0" cellspacing="0" width="80%" style="margin: 0 auto 16px auto;">
                <tr>
                  <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent); font-size: 0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Emblem / Monogram -->
              <p style="margin: 0 0 10px 0; font-family: Georgia, serif; font-size: 13px; color: #D4AF37; font-weight: 700; letter-spacing: 1px;">
                A.I.C. Oly &mdash; Advocate
              </p>

              <!-- Address -->
              <p style="margin: 0 0 5px 0; font-size: 11px; color: #3D546E; line-height: 1.6;">
                Chamber No. 323, 3rd Floor, Bar Hall No. 02<br>
                Judge&apos;s Court, Sylhet, Bangladesh
              </p>

              <!-- Disclaimer -->
              <p style="margin: 12px 0 0 0; font-size: 10.5px; color: #293A52;">
                This is an automated security message &mdash; please do not reply.
              </p>
            </td>
          </tr>

        </table>
        <!-- ═══ END CARD ═══ -->

        <!-- Bottom note outside card -->
        <p style="margin: 20px 0 0 0; font-size: 10px; color: #283649; text-align: center;">
          &copy; ${new Date().getFullYear()} Advocate Aminul Islam Chowdhury Oly. All rights reserved.
        </p>

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
