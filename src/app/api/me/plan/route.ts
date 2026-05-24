/**
 * GET /api/me/plan
 * Returns the user's current plan, usage snapshot, remaining quota, and
 * which BYOK providers they have configured. UI uses this to render
 * /settings/plan, the plan badge, and the upgrade modal.
 */

import { NextResponse } from 'next/server';

import { getOrCreateUserId } from '@/lib/auth/user';
import { getPlan } from '@/lib/plans/catalog';
import { getQuotaSnapshot } from '@/lib/plans/quota-tracker';
import { getOrCreateProfile, listByokProviders } from '@/lib/plans/store';
import type { PlanSnapshot } from '@/lib/plans/types';

export async function GET() {
  const userId = await getOrCreateUserId();
  const profile = await getOrCreateProfile(userId);
  const plan = getPlan(profile.planId);
  const snap = await getQuotaSnapshot(userId);
  const byok = await listByokProviders(userId);

  const response: PlanSnapshot = {
    planId: profile.planId,
    plan,
    usage: snap.usage,
    remaining: snap.remaining,
    resetsAt: snap.resetsAt,
    byokConfigured: byok,
  };
  return NextResponse.json(response);
}
