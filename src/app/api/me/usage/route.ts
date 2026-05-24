/**
 * GET /api/me/usage
 * Returns the user's recent AI usage rows (last ~100 calls). Used by the
 * /settings/plan page to render activity history. All data is per-user;
 * we filter the global usage log by traceTag === userId — Phase 7
 * normalizes this with a `userId` column.
 */

import { NextResponse } from 'next/server';

import { getOrCreateUserId } from '@/lib/auth/user';
import { readUsageRows, summarize } from '@/lib/ai/cost-tracker';

export async function GET() {
  const userId = await getOrCreateUserId();

  // Filter the global log to this user — until the cost-tracker writes a
  // userId column, we use traceTag for the same purpose. New AI calls
  // should pass `traceTag: userId` to populate this.
  const all = await readUsageRows(500);
  const mine = all.filter((r) => r.traceTag === userId);
  return NextResponse.json({
    rows: mine.slice(-100).reverse(),
    summary: summarize(mine),
  });
}
