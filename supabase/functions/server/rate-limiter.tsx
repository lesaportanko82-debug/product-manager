/**
 * Rate Limiter — KV-based rate limiting for AI endpoints
 * Uses sliding window counter stored in KV store
 */
import * as kv from "./kv_store.tsx";

interface RateLimitConfig {
  maxRequests: number;   // max requests per window
  windowMs: number;      // window duration in ms
}

const CONFIGS: Record<string, RateLimitConfig> = {
  "ai-chat": { maxRequests: 30, windowMs: 3600000 },       // 30/hour
  "evaluate-case": { maxRequests: 15, windowMs: 3600000 },  // 15/hour
  "recommend-next": { maxRequests: 20, windowMs: 3600000 }, // 20/hour
};

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * Check if request is within rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }
 */
export async function checkRateLimit(
  sessionId: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining?: number; retryAfterMs?: number }> {
  const config = CONFIGS[endpoint] || { maxRequests: 50, windowMs: 3600000 };
  const key = `ratelimit:${endpoint}:${sessionId}`;

  try {
    const entry: RateLimitEntry | null = await kv.get(key);
    const now = Date.now();

    if (!entry || now - entry.windowStart > config.windowMs) {
      // New window
      await kv.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: config.maxRequests - 1 };
    }

    if (entry.count >= config.maxRequests) {
      const retryAfterMs = config.windowMs - (now - entry.windowStart);
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    // Increment
    entry.count += 1;
    await kv.set(key, entry);
    return { allowed: true, remaining: config.maxRequests - entry.count };
  } catch (err) {
    console.log(`Rate limiter error for ${endpoint}: ${err}`);
    // Fail open — allow request if rate limiter itself errors
    return { allowed: true, remaining: -1 };
  }
}

/**
 * Format retry-after for human-readable response
 */
export function formatRetryAfter(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes <= 1) return "менее минуты";
  if (minutes < 60) return `${minutes} мин.`;
  return `${Math.ceil(minutes / 60)} ч.`;
}
