import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import env from "@/config/env";
import redis, { isRedisConfigured } from "@/config/redis";
import type { CronLockResult } from "@/types/cron.types";

/**
 * Calculates the exact cutoff timestamp for one calendar month ago.
 *
 * Requirements & Semantics:
 * 1. Operates strictly in UTC to prevent daylight-saving and timezone discrepancies.
 * 2. Month-end clamping: If the current day exceeds the maximum days in the target previous
 *    month (e.g., March 31 going back to February in a non-leap year), it clamps to the last
 *    valid day of that month (February 28th), avoiding the JavaScript setMonth overflow bug.
 * 3. Preserves exact time-of-day precision (hours, minutes, seconds, milliseconds).
 *
 * @param now - Reference date, defaults to current time
 * @returns Date representing exactly one calendar month before reference date
 */
export function getOneMonthRetentionCutoff(now: Date = new Date()): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0 to 11
  const day = now.getUTCDate();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const seconds = now.getUTCSeconds();
  const ms = now.getUTCMilliseconds();

  // Determine previous calendar month and year
  const targetYear = month === 0 ? year - 1 : year;
  const targetMonth = month === 0 ? 11 : month - 1;

  // Determine maximum days in target month (day 0 of targetMonth + 1 gives last day of targetMonth)
  const maxDaysInTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();

  // Clamp day if necessary (e.g. 31st clamped to 28th/29th/30th)
  const clampedDay = Math.min(day, maxDaysInTargetMonth);

  return new Date(
    Date.UTC(targetYear, targetMonth, clampedDay, hours, minutes, seconds, ms)
  );
}

/**
 * Validates request credentials against the server-configured CRON_SECRET.
 *
 * Supports two established header formats:
 * 1. Authorization: Bearer <secret>
 * 2. x-cron-secret: <secret>
 *
 * Employs constant-time SHA-256 digest comparison using crypto.timingSafeEqual
 * to eliminate timing-attack vulnerabilities and prevent secret leakage.
 *
 * @param req - Incoming Next.js request
 * @returns Validation outcome with an HTTP error response if unauthorized or misconfigured
 */
export function validateCronSecret(
  req: NextRequest
): { isValid: true } | { isValid: false; response: NextResponse } {
  const configuredSecret = env.CRON_SECRET || process.env.CRON_SECRET;

  if (!configuredSecret || configuredSecret.trim().length === 0) {
    console.error(
      "❌ [CRON AUTH ERROR] CRON_SECRET environment variable is not configured on the server."
    );
    return {
      isValid: false,
      response: NextResponse.json(
        {
          success: false,
          message:
            "Server configuration error: CRON_SECRET is not configured on the server.",
        },
        { status: 500 }
      ),
    };
  }

  // Extract secret from Authorization header (Bearer token) or custom x-cron-secret header
  let providedSecret = "";
  const authHeader = req.headers.get("authorization");
  const customHeader = req.headers.get("x-cron-secret");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedSecret = authHeader.substring(7).trim();
  } else if (customHeader) {
    providedSecret = customHeader.trim();
  }

  if (!providedSecret) {
    return {
      isValid: false,
      response: NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized: Missing cron secret credentials. Provide 'Authorization: Bearer <token>' or 'x-cron-secret' header.",
        },
        { status: 401 }
      ),
    };
  }

  // Constant-time comparison by hashing both to fixed-length SHA-256 buffers
  const expectedHash = crypto
    .createHash("sha256")
    .update(configuredSecret)
    .digest();
  const providedHash = crypto
    .createHash("sha256")
    .update(providedSecret)
    .digest();

  const isMatch = crypto.timingSafeEqual(expectedHash, providedHash);

  if (!isMatch) {
    return {
      isValid: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Invalid cron secret credentials.",
        },
        { status: 401 }
      ),
    };
  }

  return { isValid: true };
}

// In-process fallback lock store when Redis is unavailable
const processLocks = new Set<string>();

/**
 * Attempts to acquire an exclusive lock for a cron cleanup execution.
 *
 * When Upstash Redis is configured, uses a distributed NX/EX lease lock with auto-expiration.
 * When Redis is unavailable or unconfigured, falls back to in-process memory mutual exclusion,
 * with MongoDB atomic state transitions & transactions ensuring row-level safety.
 *
 * @param lockName - Unique identifier for the job (e.g., 'records', 'media')
 * @param ttlSeconds - Lease expiration time in seconds (default: 300s / 5 minutes)
 */
export async function acquireCronLock(
  lockName: string,
  ttlSeconds = 300
): Promise<CronLockResult> {
  const lockKey = `cron:lock:${lockName}`;
  const lockValue = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

  if (isRedisConfigured) {
    try {
      const acquired = await redis.set(lockKey, lockValue, {
        nx: true,
        ex: ttlSeconds,
      });

      if (!acquired) {
        return {
          acquired: false,
          release: async () => {},
        };
      }

      return {
        acquired: true,
        release: async () => {
          try {
            // Safely release lock only if value still matches
            const currentValue = await redis.get<string>(lockKey);
            if (currentValue === lockValue) {
              await redis.del(lockKey);
            }
          } catch (err) {
            console.error(`[CRON LOCK] Error releasing Redis lock for ${lockName}:`, err);
          }
        },
      };
    } catch (err) {
      console.warn(
        `[CRON LOCK] Upstash Redis error while acquiring lock for ${lockName}. Falling back to process lock:`,
        err
      );
    }
  }

  // Process-level fallback
  if (processLocks.has(lockName)) {
    return {
      acquired: false,
      release: async () => {},
    };
  }

  processLocks.add(lockName);

  // Auto-expire fallback after ttlSeconds
  const timer = setTimeout(() => {
    processLocks.delete(lockName);
  }, ttlSeconds * 1000);

  return {
    acquired: true,
    release: async () => {
      clearTimeout(timer);
      processLocks.delete(lockName);
    },
  };
}
