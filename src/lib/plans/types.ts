/**
 * Plans, quotas, BYOK keys.
 *
 * Plans are static catalog entries. UserProfile holds the per-user state:
 * which plan they're on, their per-provider BYOK keys (encrypted), and a
 * pointer to their current day's usage counters.
 *
 * Storage: file-backed at `data/user-profiles.json` for Phase 1-6.75;
 * Phase 2's Postgres schema gets a `user_profiles` table + a `byok_keys`
 * sibling. The on-disk shape here is identical to the table columns so
 * migration is trivial.
 */

import type { UseCase } from '../ai/types';
import type { EncryptedBlob } from '../cloud/encryption';

export type PlanId = 'free' | 'pro' | 'team' | 'byok';

/** Which model-providers we recognize for BYOK key storage + routing. */
export type ByokProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'mistral';

/**
 * Model id prefix → provider mapping. We use this to figure out which
 * BYOK key to pull when a routed model gets picked.
 */
export const MODEL_PREFIX_TO_PROVIDER: Record<string, ByokProvider> = {
  'openai/': 'openai',
  'anthropic/': 'anthropic',
  'claude-': 'anthropic',
  'google/': 'google',
  'gemini-': 'google',
  'deepseek/': 'deepseek',
  'mistralai/': 'mistral',
};

export function providerForModel(model: string): ByokProvider | null {
  for (const [prefix, provider] of Object.entries(MODEL_PREFIX_TO_PROVIDER)) {
    if (model.startsWith(prefix)) return provider;
  }
  return null;
}

// ─── The plan catalog shape ────────────────────────────────────────────────

export interface PlanFeatures {
  cloudConnections: number;
  architectures: number; // -1 means unlimited
  versionsPerArchitecture: number;
  reverseArchitect: boolean;
  interviewMode: boolean;
  audienceLens: boolean;
  teamSharing: boolean;
  /** Allowed for use-cases that require expensive models (flagships). */
  flagshipModels: boolean;
}

export interface PlanQuota {
  /** Total LLM calls per day across all use-cases. */
  callsPerDay: number;
  /** Combined input+output tokens per day. */
  tokensPerDay: number;
  /** Hard ceiling on per-day LLM spend in USD. */
  costPerDayUsd: number;
  /** Rate limit — calls allowed per rolling 60s window. */
  callsPerMinute: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  /** USD/month. -1 means "varies" (Team is per-seat). */
  monthlyPriceUsd: number;
  /** Marketing tagline. */
  tagline: string;
  /**
   * Models this plan is allowed to call via SERVER credentials.
   * Wildcard "*" means all routed models are allowed.
   * BYOK calls (paid by user key) ignore this list entirely.
   */
  allowedServerModels: string[] | '*';
  /** Use-cases gated to higher tiers (e.g. reverse-architect on Pro+). */
  allowedUseCases: UseCase[] | '*';
  quota: PlanQuota;
  features: PlanFeatures;
}

// ─── Per-user state ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  planId: PlanId;
  createdAt: string;
  /** Map provider → encrypted API key blob. */
  byokKeys: Partial<Record<ByokProvider, EncryptedBlob>>;
  /** ISO date string (YYYY-MM-DD) of the day the current counters apply to. */
  usageDay: string;
  /** Counters reset at UTC midnight (Phase 7 makes this configurable). */
  usage: {
    calls: number;
    tokens: number;
    costUsd: number;
  };
  /** Stripe customer id — populated when user upgrades. Phase 7. */
  stripeCustomerId?: string;
}

/** Public-facing summary returned by /api/me/plan. */
export interface PlanSnapshot {
  planId: PlanId;
  plan: Plan;
  usage: UserProfile['usage'];
  remaining: {
    calls: number;
    tokens: number;
    costUsd: number;
  };
  /** ISO timestamp when counters reset (next UTC midnight). */
  resetsAt: string;
  /** Which providers the user has BYOK keys for. */
  byokConfigured: ByokProvider[];
}

// ─── Gate decisions ────────────────────────────────────────────────────────

export type GateDecisionKind =
  | 'allow-server' // use server-funded credentials, count against plan quota
  | 'allow-byok' // use user's BYOK key, do not count against quota
  | 'deny-model-not-in-plan' // model isn't allowed for this plan and no BYOK key
  | 'deny-rate-limit' // calls/min exceeded
  | 'deny-quota-exhausted' // tokens/day or cost/day exceeded
  | 'deny-feature-locked'; // use-case requires higher tier

export interface GateDecision {
  kind: GateDecisionKind;
  /** Model the gate authorized; the router uses this. */
  resolvedModel: string;
  /** API key the router should pass to the adapter. */
  apiKey?: string;
  /** Which provider the apiKey belongs to (for adapter selection). */
  provider?: ByokProvider | 'openrouter' | 'server-anthropic';
  /** True when BYOK is used so the router skips quota accounting. */
  bypassesQuota: boolean;
  /** Human-readable explanation surfaced to the UI. */
  message?: string;
  /** Retry-after seconds (rate-limit case). */
  retryAfter?: number;
}
