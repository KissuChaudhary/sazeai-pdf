import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a new Ratelimit instance
// This function can be used to create different limiters for different actions
export function createRateLimiter(
  limit: number = 10,
  window: `${number} ${"s" | "m" | "h" | "d"}` = "1 d"
) {
  // Ensure Redis env vars are present, otherwise return null (or mock for dev if needed)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("Upstash Redis credentials not found. Rate limiting disabled.");
    return null;
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: "@upstash/ratelimit",
  });
}

export const dailyRateLimiter = createRateLimiter(200, "1 d");
export const burstRateLimiter = createRateLimiter(30, "1 m");
