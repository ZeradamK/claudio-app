/**
 * In-memory sliding-window rate limiter.
 *
 * Tracks a list of timestamps per user; on each check, drops entries older
 * than the window and counts the rest. Survives within a single Node.js
 * process; in production we'd swap for Upstash Redis (Phase 4).
 *
 * Audit fixes:
 *   - S8 (audit #1): split into `peekRateLimit` (read-only check) and
 *     `recordRateLimit` (consume a slot) so the router can probe each
 *     fallback candidate without burning a slot per attempt. Single
 *     consumed slot per actual upstream API call.
 *   - audit #8 (memory leak): when a user's fresh array drains to empty
 *     after pruning, the key is removed from the map rather than left as
 *     `userId → []`. Otherwise the map grows unbounded with cookie churn.
 */

const HITS = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next call is allowed (only set when blocked). */
  retryAfter?: number;
  /** How many calls remain in the current window. */
  remaining: number;
}

function pruneFresh(userId: string, windowMs: number, now: number): number[] {
  const cutoff = now - windowMs;
  const arr = HITS.get(userId) ?? [];
  const fresh = arr.filter((t) => t > cutoff);
  if (fresh.length === 0) {
    HITS.delete(userId);
  } else if (fresh.length !== arr.length) {
    HITS.set(userId, fresh);
  }
  return fresh;
}

/**
 * Check rate-limit status WITHOUT consuming a slot. Use this when you
 * want to probe (e.g. the router checking each fallback candidate).
 * Call {@link recordRateLimit} once before the actual upstream call.
 */
export function peekRateLimit(
  userId: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const fresh = pruneFresh(userId, windowMs, now);
  if (fresh.length >= limit) {
    const oldest = fresh[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, retryAfter, remaining: 0 };
  }
  return { allowed: true, remaining: limit - fresh.length };
}

/**
 * Consume one slot in the current window. Returns the post-consumption
 * status. If you peeked first, calling this commits the slot atomically
 * w.r.t. the in-process map.
 */
export function recordRateLimit(
  userId: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const fresh = pruneFresh(userId, windowMs, now);
  if (fresh.length >= limit) {
    const oldest = fresh[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, retryAfter, remaining: 0 };
  }
  fresh.push(now);
  HITS.set(userId, fresh);
  return { allowed: true, remaining: Math.max(0, limit - fresh.length) };
}

/**
 * @deprecated Use peekRateLimit + recordRateLimit explicitly. Kept for
 * backwards compatibility with callers that already had the
 * "check and consume in one step" semantics.
 */
export function checkAndRecord(
  userId: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  return recordRateLimit(userId, limit, windowMs);
}

/** For testing — drop all in-flight state. */
export function resetRateLimiter(): void {
  HITS.clear();
}
