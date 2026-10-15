import { Redis } from "@upstash/redis";
import { env } from "./env";

/**
 * Upstash Redis client instance configured with validated environment variables.
 * Can be used across server actions, API routes, middleware, and edge runtimes.
 */
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export default redis;
