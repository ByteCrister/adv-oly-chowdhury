import redis, { isRedisConfigured } from "@/config/redis";

// ---------------------------------------------------------------------------
// Progressive brute-force lockout constants
// ---------------------------------------------------------------------------
// Cooldown durations (in seconds) that escalate with each failure tier.
// Tier 1 : 1–4 failures  →  no cooldown (only IP rate-limit applies)
// Tier 2 : 5–9 failures  →  30-second cooldown
// Tier 3 : 10–19 failures → 5-minute cooldown
// Tier 4 : 20+ failures  → 30-minute cooldown
export const LOCKOUT_TIERS: { minFailures: number; cooldownSeconds: number }[] = [
  { minFailures: 20, cooldownSeconds: 30 * 60 },  // 30 min
  { minFailures: 10, cooldownSeconds: 5 * 60  },  //  5 min
  { minFailures:  5, cooldownSeconds: 30      },  // 30 s
];

/** Sliding-window in which failure counts are accumulated (1 hour). */
const FAILURE_WINDOW_S = 60 * 60; // 1 hour

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

// ---------------------------------------------------------------------------
// Progressive lockout helpers
// ---------------------------------------------------------------------------

/**
 * Record a failed sign-in attempt for an identifier (e.g. email address).
 * Uses a Redis sorted-set whose members are attempt timestamps so that old
 * attempts naturally fall outside the sliding window.
 *
 * @returns The total number of failures recorded in the current window.
 */
export async function trackFailedAttempt(
  identifier: string
): Promise<number> {
  if (!isRedisConfigured) return 0;

  try {
    const key = `app:brute:${identifier}`;
    const now = Date.now();
    const windowStart = now - FAILURE_WINDOW_S * 1000;

    // Pipeline: add this attempt, prune old ones, count remaining, refresh TTL
    await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await redis.zremrangebyscore(key, "-inf", windowStart);
    const count = await redis.zcard(key);
    await redis.expire(key, FAILURE_WINDOW_S);
    return count;
  } catch (error) {
    console.error("Redis trackFailedAttempt error:", error);
    return 0;
  }
}

/**
 * Return the number of failed attempts recorded for an identifier
 * within the current sliding window.
 */
export async function getFailedAttempts(
  identifier: string
): Promise<number> {
  if (!isRedisConfigured) return 0;

  try {
    const key = `app:brute:${identifier}`;
    const windowStart = Date.now() - FAILURE_WINDOW_S * 1000;
    await redis.zremrangebyscore(key, "-inf", windowStart);
    return await redis.zcard(key);
  } catch (error) {
    console.error("Redis getFailedAttempts error:", error);
    return 0;
  }
}

/**
 * Clear the failure log for an identifier after a successful sign-in.
 * This prevents a legitimate user from being locked out after recovering
 * their correct password.
 */
export async function clearFailedAttempts(
  identifier: string
): Promise<void> {
  if (!isRedisConfigured) return;

  try {
    await redis.del(`app:brute:${identifier}`);
  } catch (error) {
    console.error("Redis clearFailedAttempts error:", error);
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
