import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";

/**
 * PATCH /api/v1/users/me/password
 * Empty stub endpoint for updating advocate password.
 * To be implemented with bcrypt hash verification.
 */
export const PATCH = withErrorHandler(async () => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Unauthorized");
  }

  // Placeholder stub response as requested
  return NextResponse.json(
    {
      success: true,
      message: "Password update endpoint stub - to be implemented.",
      data: null,
    },
    { status: 200 }
  );
});
