/**
 * POST /api/me/upgrade  { planId: 'free' | 'pro' | 'team' | 'byok' }
 *
 * Phase 6.75 stub: instantly changes the user's plan with no payment.
 * Phase 7 wires this to Stripe Checkout — the user is redirected to a
 * Stripe session, the webhook flips the plan on success.
 */

import { NextResponse } from 'next/server';

import { getOrCreateUserId } from '@/lib/auth/user';
import { PLAN_CATALOG } from '@/lib/plans/catalog';
import { setPlan } from '@/lib/plans/store';
import type { PlanId } from '@/lib/plans/types';

export async function POST(req: Request) {
  const userId = await getOrCreateUserId();
  const body = (await req.json().catch(() => ({}))) as { planId?: PlanId };
  if (!body?.planId || !(body.planId in PLAN_CATALOG)) {
    return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
  }
  const profile = await setPlan(userId, body.planId);
  return NextResponse.json({
    success: true,
    plan: PLAN_CATALOG[body.planId],
    profile,
    // Phase 7 returns a Stripe Checkout URL here instead of a finalized profile
    note: 'Phase 6.75 stub: plan applied immediately without payment. Phase 7 wires Stripe.',
  });
}
