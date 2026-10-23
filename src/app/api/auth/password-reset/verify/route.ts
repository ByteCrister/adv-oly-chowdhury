import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { passwordResetVerifySchema } from "@/utils/zod";
import { verifyPasswordResetOtp } from "@/lib/services/password-reset.service";
import { rateLimit } from "@/lib/services/redis.service";

/**
 * POST /api/auth/password-reset/verify
 * Validates the 6-digit OTP code against the active reset request.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown-ip";

  // Rate Limiting: 10 verification attempts per 60 seconds per IP
  const allowed = await rateLimit(`pwreset_verify_ip:${ip}`, 10, 60);
  if (!allowed) {
    throw new ApiError(
      "Too many verification attempts from this IP. Please wait a moment before trying again.",
      429
    );
  }

  const body = await req.json().catch(() => null);
  const validated = passwordResetVerifySchema.parse(body);

  const result = await verifyPasswordResetOtp({
    requestId: validated.requestId,
    otp: validated.otp,
    ip,
  });

  return NextResponse.json(
    {
      success: true,
      message: result.message,
      data: {
        resetToken: result.resetToken,
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
