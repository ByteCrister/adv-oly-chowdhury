import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";

/**
 * POST /api/v1/users/me/avatar
 * Empty stub endpoint for uploading advocate profile headshot.
 * To be implemented with Cloudinary integration.
 */
export const POST = withErrorHandler(async () => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Unauthorized");
  }

  // Placeholder stub response as requested
  return NextResponse.json(
    {
      success: true,
      message: "Profile image upload endpoint stub - to be implemented.",
      data: null,
    },
    { status: 200 }
  );
});
