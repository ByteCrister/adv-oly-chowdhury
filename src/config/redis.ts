import { Redis } from "@upstash/redis";
import { env } from "./env";

/**
 * Flag determining if valid Upstash Redis credentials have been configured
 * (excludes placeholder values).
 */
export const isRedisConfigured = Boolean(
  env.UPSTASH_REDIS_REST_URL &&
  env.UPSTASH_REDIS_REST_TOKEN &&
  !env.UPSTASH_REDIS_REST_URL.includes("your-upstash-redis") &&
  !env.UPSTASH_REDIS_REST_TOKEN.includes("your_upstash_redis")
);

/**
 * Upstash Redis client instance configured with validated environment variables.
 * Can be used across server actions, API routes, middleware, and edge runtimes.
 */
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export default redis;
