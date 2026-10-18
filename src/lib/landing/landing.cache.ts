import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Cache tag identifying the landing page public profile and aggregated data.
 * Used for targeted on-demand cache invalidation when advocate details change.
 */
export const LANDING_CACHE_TAG = "landing-page-profile";

/**
 * Route path of the primary landing page.
 */
export const LANDING_PAGE_PATH = "/";

/**
 * Invalidates the cached landing page data and server-rendered HTML route.
 * Should be called ONLY after a successful database update to user profile or avatar.
 */
export function revalidateLandingCache(): void {
  try {
    // Next.js 16 revalidateTag accepts the "max" profile to adhere to modern cacheLife rules
    revalidateTag(LANDING_CACHE_TAG, "max");
  } catch (error) {
    // Non-fatal warning if called in environments where cache stores are uninitialized
    console.warn("Failed to revalidate landing cache tag:", error);
  }

  try {
    // Revalidates the statically rendered route so new visitors receive fresh markup
    revalidatePath(LANDING_PAGE_PATH, "page");
  } catch (error) {
    console.warn("Failed to revalidate landing route path:", error);
  }
}
