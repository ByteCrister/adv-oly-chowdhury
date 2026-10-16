import redis, { isRedisConfigured } from "@/config/redis";

/**
 * Fixed-window rate limiter per IP address or identifier.
 * Fails open if Redis is down or not configured to avoid blocking legitimate access.
 */
export async function rateLimit(
  identifier: string,
  limit = 5,
  windowInSeconds = 60
): Promise<boolean> {
  if (!isRedisConfigured) {
    // Fail open in development / unconfigured environments
    return true;
  }

  try {
    const key = `app:ratelimit:${identifier}`;
    const requests = await redis.incr(key);
    if (requests === 1) {
      await redis.expire(key, windowInSeconds);
    }
    return requests <= limit;
  } catch (error) {
    console.error("Redis rateLimit error (failing open):", error);
    return true;
  }
}

/**
 * Check if an identifier (e.g. account email or IP) is in an active cooldown window.
 */
export async function isInCooldown(
  action: string,
  identifier: string
): Promise<boolean> {
  if (!isRedisConfigured) {
    return false;
  }

  try {
    const key = `app:cooldown:${action}:${identifier}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error("Redis isInCooldown error (failing open):", error);
    return false;
  }
}

/**
 * Trigger a temporary cooldown window after consecutive failed actions (e.g. failed login attempts).
 */
export async function setCooldown(
  action: string,
  identifier: string,
  windowInSeconds: number
): Promise<void> {
  if (!isRedisConfigured) {
    return;
  }

  try {
    const key = `app:cooldown:${action}:${identifier}`;
    await redis.setex(key, windowInSeconds, "true");
  } catch (error) {
    console.error("Redis setCooldown error:", error);
  }
}
