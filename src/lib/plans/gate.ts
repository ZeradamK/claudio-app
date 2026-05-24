/**
 * The plan gate — the policy layer between `runAI` and the provider adapters.
 *
 * For every (userId, useCase, candidate-model) tuple, decides:
 *   - Is the use-case allowed on the user's plan?
 *   - Can we route this model on server credentials (in the plan's allowlist)?
 *   - Does the user have a BYOK key for this model's provider? Prefer that.
 *   - Has the user hit their rate limit or daily quota?
 *
 * The router calls this once per attempt (primary + each fallback). If the
 * gate refuses one model, the router can still try the next fallback —
 * which is how a Free user automatically falls back from Sonnet 4.6
 * (not in their plan) to DeepSeek (allowed) when chat-modification routes.
 */

import { getPlan, isFlagshipModel, planAllowsServerModel } from './catalog';
import { checkAndRecord } from './rate-limiter';
import { checkQuota } from './quota-tracker';
import { getByokKey, getOrCreateProfile } from './store';
import { providerForModel } from './types';
import type { GateDecision } from './types';
import type { UseCase } from '../ai/types';

/** What the gate has access to of the routing config. */
interface GateInput {
  userId: string;
  useCase: UseCase;
  candidateModel: string;
}

export async function gateForAttempt(input: GateInput): Promise<GateDecision> {
  const { userId, useCase, candidateModel } = input;
  const profile = await getOrCreateProfile(userId);
  const plan = getPlan(profile.planId);

  // 1) Use-case allowed by plan?
  if (plan.allowedUseCases !== '*' && !plan.allowedUseCases.includes(useCase)) {
    return {
      kind: 'deny-feature-locked',
      resolvedModel: candidateModel,
      bypassesQuota: false,
      message: `The "${useCase}" feature requires a higher plan than ${plan.name}.`,
    };
  }

  // 2) Does the user have a BYOK key for this model's provider?
  const provider = providerForModel(candidateModel);
  if (provider) {
    const userKey = await getByokKey(userId, provider);
    if (userKey) {
      // BYOK path — bypasses rate limits and quota entirely.
      return {
        kind: 'allow-byok',
        resolvedModel: candidateModel,
        apiKey: userKey,
        provider,
        bypassesQuota: true,
      };
    }
  }

  // 3) No BYOK key — does the plan allow this model on server credentials?
  if (!planAllowsServerModel(plan, candidateModel)) {
    return {
      kind: 'deny-model-not-in-plan',
      resolvedModel: candidateModel,
      bypassesQuota: false,
      message: isFlagshipModel(candidateModel)
        ? `Flagship model ${candidateModel} requires BYOK or Enterprise.`
        : `${candidateModel} is not included in the ${plan.name} plan. Upgrade or add a BYOK key.`,
    };
  }

  // 4) Rate limit (calls per minute)
  const rl = checkAndRecord(userId, plan.quota.callsPerMinute, 60_000);
  if (!rl.allowed) {
    return {
      kind: 'deny-rate-limit',
      resolvedModel: candidateModel,
      bypassesQuota: false,
      retryAfter: rl.retryAfter,
      message: `Rate limit: ${plan.quota.callsPerMinute} calls/minute. Try again in ${rl.retryAfter}s.`,
    };
  }

  // 5) Daily quota (calls/tokens/cost)
  const quotaCheck = await checkQuota(userId);
  if (!quotaCheck.allowed) {
    return {
      kind: 'deny-quota-exhausted',
      resolvedModel: candidateModel,
      bypassesQuota: false,
      message: `Daily ${quotaCheck.reason} quota reached for ${plan.name}. Upgrade or add a BYOK key to continue.`,
    };
  }

  // 6) Approved on server credentials.
  return {
    kind: 'allow-server',
    resolvedModel: candidateModel,
    provider: provider ? 'openrouter' : 'server-anthropic',
    bypassesQuota: false,
  };
}

/**
 * Convenience helper for routes/UIs that want a human-readable decision
 * without running an LLM call (e.g. previewing whether a button should be
 * enabled).
 */
export async function previewGate(input: GateInput): Promise<GateDecision> {
  // Same logic as gateForAttempt but WITHOUT consuming a rate-limit slot.
  // We do it by snapshotting and inspecting without recording. For Phase
  // 6.75 we just delegate — the rate-limit cost of a preview call is fine
  // for now; Phase 7's Redis swap gives us a proper read-only inspector.
  return gateForAttempt(input);
}
