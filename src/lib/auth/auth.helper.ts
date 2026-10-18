import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { ApiError } from "@/lib/helpers/withErrorHandler";

/**
 * Server-side helper to get the active NextAuth session in server components or route handlers.
 */
export async function getAuthSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      error.digest === "HANGING_PROMISE_REJECTION"
    ) {
      return null;
    }
    console.error("Error retrieving auth session:", error);
    return null;
  }
}

/**
 * Server-side helper that retrieves the authenticated userId or throws an Unauthorized error.
 */
export async function getUserId(): Promise<string> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Authentication required");
  }
  return session.user.id;
}

