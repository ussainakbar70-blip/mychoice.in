/**
 * Production Rate Limiting Abstraction
 * 
 * Protects critical endpoints:
 * - Payment order creation
 * - Payment verification
 * - Webhooks
 * - Refunds
 * - Authentication & password reset
 * 
 * Provides an in-memory sliding window implementation for local/single-node,
 * and a standardized interface for distributed Redis/Upstash in multi-instance production.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // UNIX timestamp in ms
}

export interface RateLimiterProvider {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

class InMemoryRateLimiter implements RateLimiterProvider {
  private hits: Map<string, number[]> = new Map();
  private lastCleanup = Date.now();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();

    // Periodic cleanup of stale keys every 60 seconds
    if (now - this.lastCleanup > 60000) {
      this.cleanup(now);
      this.lastCleanup = now;
    }

    const windowStart = now - windowMs;
    const timestamps = (this.hits.get(key) || []).filter((t) => t > windowStart);

    if (timestamps.length >= limit) {
      const oldestInWindow = timestamps[0];
      const resetAt = oldestInWindow + windowMs;
      return {
        success: false,
        limit,
        remaining: 0,
        resetAt,
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    return {
      success: true,
      limit,
      remaining: limit - timestamps.length,
      resetAt: now + windowMs,
    };
  }

  private cleanup(now: number) {
    for (const [key, timestamps] of this.hits.entries()) {
      const active = timestamps.filter((t) => now - t < 3600000); // 1 hour max
      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, active);
      }
    }
  }

  reset(): void {
    this.hits.clear();
  }
}

export const inMemoryRateLimiter = new InMemoryRateLimiter();

/**
 * Checks rate limit for an action.
 * Standard presets:
 * - payment_creation: 10 per minute per IP/user
 * - payment_verification: 15 per minute per IP
 * - webhook: 120 per minute
 * - admin_refund: 20 per minute per admin
 */
export async function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60000
): Promise<RateLimitResult> {
  return await inMemoryRateLimiter.check(key, limit, windowMs);
}
