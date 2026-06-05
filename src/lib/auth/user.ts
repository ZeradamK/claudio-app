/**
 * Interim user identity for Phase 6.75.
 *
 * Pre-Clerk: each first-time visitor gets a `claudio_uid` cookie containing
 * a fresh UUID. All subsequent requests carry that cookie and the plans
 * layer uses it as the userId.
 *
 * Phase 2 lands Clerk; this file becomes a thin shim that returns the
 * Clerk-verified user id instead of the cookie value.
 *
 * Limitations of the cookie approach:
 *   - Anyone with the cookie can act as that user (no auth). Acceptable
 *     for local dev / Phase 6.75 demo; not for production.
 *   - Clearing cookies = new identity = quota resets. Stripe + Clerk fix
 *     this in Phase 7.
 */

import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

const COOKIE_NAME = 'claudio_uid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Read the current visitor's id from cookies, creating a fresh one if
 * missing. Safe to call from any server-side route handler or RSC.
 */
export async function getOrCreateUserId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const fresh = randomUUID();
  // Setting from inside cookies() is allowed in route handlers and Server
  // Actions but not RSC. Callers in RSC context should fall back to a
  // header- or middleware-derived id when this throws — Phase 2 swaps
  // this entire file for Clerk so we don't optimize further.
  try {
    jar.set(COOKIE_NAME, fresh, {
      httpOnly: true,
      sameSite: 'lax',
      // Secure in production: cookie only sent over HTTPS, blocks MITM
      // sniffing on shared networks. Off in dev where localhost is HTTP.
      // (H1 partial mitigation — full fix is real auth in Phase 2.)
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  } catch {
    // RSC: read-only cookie store; this is fine, middleware sets it.
  }
  return fresh;
}

/** Read-only — returns null if no cookie yet. */
export async function readUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}
