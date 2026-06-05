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
import { peekRateLimit, recordRateLimit } from './rate-limiter';
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

/**
 * Internal shared logic — runs every check except rate-limit (which is
 * the only side-effectful one). Both peekForAttempt and gateForAttempt
 * call this; gateForAttempt then additionally records a rate-limit slot.
 */
async function checkPolicy(
  input: GateInput,
  rateLimitMode: 'peek' | 'record'
): Promise<GateDecision> {
  const { userId, useCase, candidateModel } = input;
  const profile = await getOrCreateProfile(userId);
  const plan = getPlan(profile.planId);

  // 1) Use-case allowed by plan?
  if (plan.allowedUseCases !== '*' && !plan.allowedUseCases.includes(useCase)) {
    return {
      kind: 'deny-feature-locked',
      resolvedModel: candidateModel,
      bypassesQuota: false,
      message: 'The "' + useCase + '" feature requires a higher plan than ' + plan.name + '.',
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
        ? 'Flagship model ' + candidateModel + ' requires BYOK or Enterprise.'
        : candidateModel + ' is not included in the ' + plan.name + ' plan. Upgrade or add a BYOK key.',
    };
  }

  // 4) Rate limit (calls per minute) — peek OR record.
  const rl =
    rateLimitMode === 'record'
      ? recordRateLimit(userId, plan.quota.callsPerMinute, 60_000)
      : peekRateLimit(userId, plan.quota.callsPerMinute, 60_000);
  if (!rl.allowed) {
    return {
      kind: 'deny-rate-limit',
      resolvedModel: candidateModel,
      bypassesQuota: false,
      retryAfter: rl.retryAfter,
      message:
        'Rate limit: ' +
        plan.quota.callsPerMinute +
        ' calls/minute. Try again in ' +
        rl.retryAfter +
        's.',
    };
  }

  // 5) Daily quota (calls/tokens/cost)
  const quotaCheck = await checkQuota(userId);
  if (!quotaCheck.allowed) {
    return {
      kind: 'deny-quota-exhausted',
      resolvedModel: candidateModel,
      bypassesQuota: false,
      message:
        'Daily ' +
        quotaCheck.reason +
        ' quota reached for ' +
        plan.name +
        '. Upgrade or add a BYOK key to continue.',
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
 * Read-only gate check (S8 fix). Probes plan + BYOK + plan-allowlist +
 * rate-limit + quota WITHOUT consuming a rate-limit slot. The router
 * uses this when iterating its fallback list so a single user request
 * burns at most one rate slot, not one per candidate model.
 */
export async function peekForAttempt(input: GateInput): Promise<GateDecision> {
  return checkPolicy(input, 'peek');
}

/**
 * Side-effectful gate decision. Used by callers that don't have a
 * separate "I'm about to actually call upstream" step — they want
 * check-and-consume in one shot.
 *
 * The router uses peekForAttempt in its candidate loop and a separate
 * consumeRateSlot() before the upstream fetch, so this remains the entry
 * point for non-router callers (claudeStream).
 */
export async function gateForAttempt(input: GateInput): Promise<GateDecision> {
  return checkPolicy(input, 'record');
}

/**
 * After peekForAttempt has approved a candidate and the router has
 * decided to fire the upstream call, this commits one rate-limit slot
 * for the user. No-op for BYOK decisions (bypassesQuota === true).
 */
export async function consumeRateSlot(userId: string): Promise<void> {
  const profile = await getOrCreateProfile(userId);
  const plan = getPlan(profile.planId);
  recordRateLimit(userId, plan.quota.callsPerMinute, 60_000);
}

/**
 * @deprecated Use peekForAttempt — same semantics, clearer name.
 */
export async function previewGate(input: GateInput): Promise<GateDecision> {
  return peekForAttempt(input);
}
