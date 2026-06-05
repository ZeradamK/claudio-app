/**
 * Edge middleware: best-effort cookie seeding on first visit.
 *
 * Note: Turbopack in Next.js 15.5 does not always invoke middleware
 * reliably for our case, so the actual cookie creation also happens
 * inside the `/api/me/*` route handlers via `getOrCreateUserId()`.
 * This middleware exists as a belt-and-suspenders fallback for
 * deployments running the webpack build.
 *
 * Hardening:
 *   - L1 audit (Math.random fallback): removed. We refuse to mint an
 *     id if randomUUID is unavailable (every Node 19+ runtime has it;
 *     refusing is safer than 46-bit-entropy guessable ids).
 *   - H1 audit (Secure flag): set in production.
 *   - L2 audit (matcher hits static assets): restricted matcher.
 *
 * Phase 2 replaces this entire file with Clerk's middleware.
 */

import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'claudio_uid';
const MAX_AGE = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(COOKIE)?.value;
  if (existing) return NextResponse.next();

  const uid = globalThis.crypto?.randomUUID?.();
  if (!uid) {
    // Refuse to mint a low-entropy id (Math.random was 46 bits — trivially
    // guessable in combination with the cloud-route IDOR we just closed).
    // Modern Node always provides randomUUID; absence indicates an
    // unsupported runtime we shouldn't paper over.
    return NextResponse.next();
  }
  const res = NextResponse.next();
  res.cookies.set({
    name: COOKIE,
    value: uid,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/',
  });
  return res;
}

// Skip Next internals + static assets. Reduces edge invocations ~5x
// and avoids attaching Set-Cookie to cacheable asset responses
// (CDN poisoning risk per audit L2).
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/).*)'],
};
