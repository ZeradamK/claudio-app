/**
 * Daily quota tracker — reads/writes per-user `usage` counters in the
 * profile store. Resets are handled by the store on day-rollover read.
 *
 * Separating this from the store gives us a clean spot to (later) push
 * counters to Redis for sub-second propagation across multiple Node
 * processes. Today it's just a thin wrapper.
 */

import { getOrCreateProfile, recordUsage } from './store';
import { getPlan } from './catalog';
import type { PlanQuota, UserProfile } from './types';

export interface QuotaSnapshot {
  usage: UserProfile['usage'];
  remaining: { calls: number; tokens: number; costUsd: number };
  quota: PlanQuota;
  /** ISO timestamp of the next reset (UTC midnight). */
  resetsAt: string;
}

function nextUtcMidnight(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getQuotaSnapshot(userId: string): Promise<QuotaSnapshot> {
  const profile = await getOrCreateProfile(userId);
  const plan = getPlan(profile.planId);
  return {
    usage: profile.usage,
    quota: plan.quota,
    remaining: {
      calls: Math.max(0, plan.quota.callsPerDay - profile.usage.calls),
      tokens: Math.max(0, plan.quota.tokensPerDay - profile.usage.tokens),
      costUsd: Math.max(0, plan.quota.costPerDayUsd - profile.usage.costUsd),
    },
    resetsAt: nextUtcMidnight(),
  };
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: 'calls' | 'tokens' | 'cost';
  snapshot: QuotaSnapshot;
}

/**
 * Cheap pre-flight: refuse if the user is already at or over a quota
 * dimension. Does NOT consume any quota — callers do that after a
 * successful API response via `recordUsage`.
 */
export async function checkQuota(userId: string): Promise<QuotaCheckResult> {
  const snapshot = await getQuotaSnapshot(userId);
  if (snapshot.remaining.calls <= 0) {
    return { allowed: false, reason: 'calls', snapshot };
  }
  if (snapshot.remaining.tokens <= 0) {
    return { allowed: false, reason: 'tokens', snapshot };
  }
  if (snapshot.remaining.costUsd <= 0) {
    return { allowed: false, reason: 'cost', snapshot };
  }
  return { allowed: true, snapshot };
}

/** Increment usage counters after a successful AI call. */
export async function consumeQuota(
  userId: string,
  delta: { tokens: number; costUsd: number }
): Promise<void> {
  await recordUsage(userId, { calls: 1, tokens: delta.tokens, costUsd: delta.costUsd });
}
