import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import ConnectDB from "@/config/db";
import User from "@/db/models/User.model";
import { passwordUpdateSchema } from "@/utils/zod";

/**
 * PATCH /api/v1/users/me/password
 * Securely updates the advocate chamber administrator password.
 * Verifies current password against stored bcrypt hash, then updates with new hashed password.
 */
export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

  const body = await req.json();
  const { currentPassword, newPassword } = passwordUpdateSchema.parse(body);

  await ConnectDB();

  // Query user including passwordHash (which is select: false by default)
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || user.isActive === false) {
    throw ApiError.notFound("User account not found or inactive.");
  }

  // If a password is already set, verify current password
  if (user.passwordHash) {
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest("Current password is incorrect.");
    }
  }

  // Generate strong bcrypt salt and hash new password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  // Update password in database
  await User.findByIdAndUpdate(userId, {
    $set: { passwordHash },
  });

  return NextResponse.json(
    {
      success: true,
      message: "Password updated successfully.",
      data: null,
    },
    { status: 200 }
  );
});
