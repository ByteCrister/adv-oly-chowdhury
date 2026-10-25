import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import User from "@/db/models/User.model";
import { requestPasswordReset } from "@/lib/services/password-reset.service";
import { rateLimit } from "@/lib/services/redis.service";
import { passwordChangeRequestOtpSchema } from "@/utils/zod";

/**
 * POST /api/v1/users/me/password/request-otp
 * Verifies the user's current password and dispatches a 6-digit OTP code to the
 * authenticated user's email to authorize a password change.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

  const body = await req.json().catch(() => ({}));
  const { currentPassword } = passwordChangeRequestOtpSchema.parse(body);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown-ip";
  const userAgent = req.headers.get("user-agent") || undefined;

  // Rate Limiting: 3 OTP requests per 5 minutes per user
  const allowedUser = await rateLimit(`pw_change_otp_user:${userId}`, 3, 300);
  if (!allowedUser) {
    throw new ApiError(
      "Too many verification requests. Please wait a few minutes before requesting another code.",
      429
    );
  }

  // Fetch user including passwordHash
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || user.isActive === false) {
    throw ApiError.notFound("User account not found or inactive.");
  }

  // Verify current password against stored hash if set
  if (user.passwordHash) {
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest("Current password is incorrect.");
    }
  }

  // Dispatch OTP using the robust password reset service
  const result = await requestPasswordReset({
    email: user.email,
    ip,
    userAgent,
  });

  return NextResponse.json(
    {
      success: true,
      message: "A 6-digit verification code has been dispatched to your chamber email.",
      data: {
        requestId: result.requestId,
        email: user.email,
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
