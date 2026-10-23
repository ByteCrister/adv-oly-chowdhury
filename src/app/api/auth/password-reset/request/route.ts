import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { passwordResetRequestSchema } from "@/utils/zod";
import { requestPasswordReset } from "@/lib/services/password-reset.service";
import { rateLimit } from "@/lib/services/redis.service";

/**
 * POST /api/auth/password-reset/request
 * Initiates an OTP-based password reset for a chamber administrator account.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown-ip";

  const userAgent = req.headers.get("user-agent") || undefined;

  // Rate Limiting: 5 requests per 5 minutes per IP
  const allowedIp = await rateLimit(`pwreset_req_ip:${ip}`, 5, 300);
  if (!allowedIp) {
    throw new ApiError(
      "Too many password reset requests from this IP. Please wait a few minutes before trying again.",
      429
    );
  }

  const body = await req.json().catch(() => null);
  const validated = passwordResetRequestSchema.parse(body);

  // Rate Limiting: 3 requests per 5 minutes per email
  const allowedEmail = await rateLimit(`pwreset_req_email:${validated.email}`, 3, 300);
  if (!allowedEmail) {
    throw new ApiError(
      "Too many password reset requests for this email. Please wait a few minutes before requesting another code.",
      429
    );
  }

  const result = await requestPasswordReset({
    email: validated.email,
    ip,
    userAgent,
  });

  return NextResponse.json(
    {
      success: true,
      message: result.message,
      data: {
        requestId: result.requestId,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
});
