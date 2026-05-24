/**
 * Edge middleware: best-effort cookie seeding on first visit.
 *
 * Note: Turbopack in Next.js 15.5 does not always invoke middleware
 * reliably for our case, so the actual cookie creation also happens
 * inside the `/api/me/*` route handlers via `getOrCreateUserId()`.
 * This middleware exists as a belt-and-suspenders fallback for
 * deployments running the webpack build.
 *
 * Phase 2 replaces this entire file with Clerk's middleware.
 */

import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'claudio_uid';
const MAX_AGE = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(COOKIE)?.value;
  if (existing) return NextResponse.next();

  const uid = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const res = NextResponse.next();
  res.cookies.set({
    name: COOKIE,
    value: uid,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
  return res;
}

export const config = {
  matcher: '/:path*',
};
