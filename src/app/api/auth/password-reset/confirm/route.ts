import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { passwordResetConfirmSchema } from "@/utils/zod";
import { confirmPasswordReset } from "@/lib/services/password-reset.service";
import { rateLimit } from "@/lib/services/redis.service";

/**
 * POST /api/auth/password-reset/confirm
 * Atomically consumes the reset authorization and sets the new account password.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown-ip";

  // Rate Limiting: 5 password reset submissions per 5 minutes per IP
  const allowed = await rateLimit(`pwreset_confirm_ip:${ip}`, 5, 300);
  if (!allowed) {
    throw new ApiError(
      "Too many password reset submissions. Please wait a few minutes before trying again.",
      429
    );
  }

  const body = await req.json().catch(() => null);
  const validated = passwordResetConfirmSchema.parse(body);

  const result = await confirmPasswordReset({
    requestId: validated.requestId,
    resetToken: validated.resetToken,
    newPassword: validated.newPassword,
    ip,
    req,
  });

  return NextResponse.json(
    {
      success: true,
      message: result.message,
      data: null,
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
