/**
 * In-memory sliding-window rate limiter.
 *
 * Tracks a list of timestamps per user; on each check, drops entries older
 * than the window and counts the rest. Survives within a single Node.js
 * process; in production we'd swap for Upstash Redis (Phase 4).
 *
 * The contract is small: `check(userId, limit, windowMs)` returns either
 * { allowed: true } or { allowed: false, retryAfter: seconds }.
 */

const HITS = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next call is allowed (only set when blocked). */
  retryAfter?: number;
  /** How many calls remain in the current window. */
  remaining: number;
}

export function checkAndRecord(
  userId: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const arr = HITS.get(userId) ?? [];
  // Drop expired timestamps
  const fresh = arr.filter((t) => t > cutoff);

  if (fresh.length >= limit) {
    const oldest = fresh[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    HITS.set(userId, fresh);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  fresh.push(now);
  HITS.set(userId, fresh);
  return { allowed: true, remaining: Math.max(0, limit - fresh.length) };
}

/** For testing — drop all in-flight state. */
export function resetRateLimiter(): void {
  HITS.clear();
}
