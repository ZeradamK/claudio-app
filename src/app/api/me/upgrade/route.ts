/**
 * POST /api/me/upgrade  { planId: 'free' | 'pro' | 'team' | 'byok' }
 *
 * STATUS: pre-Stripe stub.
 *
 * Security gate (S4 / CWE-862 Missing Authorization):
 *   In production this endpoint is disabled. Without payment integration,
 *   a POST here grants any caller flagship-model access and lifted quotas
 *   for free. Only enabled when explicitly opted in via env var so a
 *   misconfigured Vercel deploy cannot accidentally ship the stub.
 *
 *   To enable in non-prod local dev, set ALLOW_INSECURE_PLAN_UPGRADES=1
 *   in .env.local. The endpoint still records the attempt + caller id to
 *   the server log so a missed-removal is easy to spot.
 *
 * Phase 7 wires this to Stripe Checkout — the user is redirected to a
 * Stripe session and the webhook flips the plan on success. The env-gate
 * goes away at that point.
 */

import { NextResponse } from 'next/server';

import { getOrCreateUserId } from '@/lib/auth/user';
import { PLAN_CATALOG } from '@/lib/plans/catalog';
import { setPlan } from '@/lib/plans/store';
import type { PlanId } from '@/lib/plans/types';

function stubEnabled(): boolean {
  // Production: never enabled regardless of env. Defense against operators
  // accidentally setting ALLOW_INSECURE_PLAN_UPGRADES in a prod env.
  if (process.env.NODE_ENV === 'production') return false;
  // Non-prod: requires explicit opt-in. Empty/missing = disabled.
  return process.env.ALLOW_INSECURE_PLAN_UPGRADES === '1';
}

export async function POST(req: Request) {
  if (!stubEnabled()) {
    // Audit log: any attempt to hit the upgrade endpoint when disabled is
    // suspicious — either misconfiguration or probing.
    console.warn(
      '[api/me/upgrade] DENIED: upgrade stub is disabled (NODE_ENV=' +
        process.env.NODE_ENV +
        ', ALLOW_INSECURE_PLAN_UPGRADES=' +
        (process.env.ALLOW_INSECURE_PLAN_UPGRADES ?? 'unset') +
        ')'
    );
    return NextResponse.json(
      { error: 'Plan upgrades require payment. Stripe integration not yet wired.' },
      { status: 503 }
    );
  }

  const userId = await getOrCreateUserId();
  const body = (await req.json().catch(() => ({}))) as { planId?: PlanId };

  if (!body?.planId || !(body.planId in PLAN_CATALOG)) {
    return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
  }

  // Loud server-side log so this never gets shipped without notice.
  console.warn(
    '[api/me/upgrade] STUB UPGRADE userId=' + userId + ' planId=' + body.planId
  );

  const profile = await setPlan(userId, body.planId);
  return NextResponse.json({
    success: true,
    plan: PLAN_CATALOG[body.planId],
    profile,
    note: 'INSECURE dev stub — plan applied without payment. Set NODE_ENV=production or unset ALLOW_INSECURE_PLAN_UPGRADES to disable.',
  });
}
