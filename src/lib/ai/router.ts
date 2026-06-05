/**
 * The orchestrator.
 *
 * Single entry point for every Claudio AI call. Flow:
 *
 *   1. Look up the routing config for the use-case.
 *   2. For each candidate model (primary + fallbacks in order):
 *      a. Run the plan gate. The gate decides whether to use the user's
 *         BYOK key (skip quota) or server credentials (count against quota),
 *         or to refuse this model entirely (rate limit, quota, plan).
 *      b. If gate denies → try the next fallback model.
 *      c. If gate allows → call the adapter with the resolved key.
 *      d. Validate the output. On failure → try next fallback.
 *   3. Log every attempt with token usage + computed cost.
 *   4. If gate allowed server credentials and validation passed, consume
 *      the user's daily quota.
 *
 * If every attempt is denied or every model fails validation, throw with
 * the full attempt history so the caller (and UI) can surface a precise
 * "why did this fail" message.
 */

import { anthropicAdapter } from './providers/anthropic';
import { googleGeminiAdapter } from './providers/google';
import { openAICompatAdapter, hasServerEnvKey } from './providers/openai-compat';
import { openRouterAdapter } from './providers/openrouter';
import { computeCost } from './pricing';
import { getRouteConfig } from './routing';
import { logUsage } from './cost-tracker';
import { validate } from './validators';
import { consumeRateSlot, peekForAttempt } from '../plans/gate';
import { consumeQuota } from '../plans/quota-tracker';
import type {
  AIRequest,
  AIResponse,
  AttemptLog,
  ProviderAdapter,
  ProviderCallOpts,
  RouteAttempt,
} from './types';
import type { GateDecision } from '../plans/types';

// Order matters: more specific adapters first. Anthropic catches both
// "anthropic/..." and bare "claude-..." model ids; Google catches
// "google/..." and "gemini-..."; the OpenAI-compat adapter handles
// openai/deepseek/mistral/llama/qwen/grok prefixes; OpenRouter is the
// catch-all for anything else with a slash in it.
const DIRECT_ADAPTERS: ProviderAdapter[] = [
  anthropicAdapter,
  googleGeminiAdapter,
  openAICompatAdapter,
];

function pickDirectAdapter(model: string): ProviderAdapter | null {
  for (const a of DIRECT_ADAPTERS) {
    if (a.supports(model)) return a;
  }
  return null;
}

export class AIRouterError extends Error {
  attempts: AttemptLog[];
  finalDenialMessage?: string;
  constructor(message: string, attempts: AttemptLog[], finalDenialMessage?: string) {
    super(message);
    this.name = 'AIRouterError';
    this.attempts = attempts;
    this.finalDenialMessage = finalDenialMessage;
  }
}

/**
 * Pick the adapter + API key based on the gate decision.
 *
 * BYOK calls go direct to the provider (skipping OpenRouter's 5% margin).
 * Server-funded calls go through OpenRouter for non-Anthropic models and
 * through Anthropic-direct for Anthropic models (the latter unlocks
 * prompt-caching headers).
 */
function selectAdapter(
  model: string,
  decision: GateDecision
): { adapter: ProviderAdapter; apiKey?: string } {
  if (decision.kind === 'allow-byok') {
    const direct = pickDirectAdapter(model);
    if (!direct) {
      // No direct adapter for this model — fall back to OpenRouter with the
      // user's key (works for most providers OpenRouter front-ends).
      return { adapter: openRouterAdapter, apiKey: decision.apiKey };
    }
    return { adapter: direct, apiKey: decision.apiKey };
  }

  // allow-server: prefer the Anthropic direct adapter when the model is
  // Anthropic-shaped (gives us cache_control support). For OpenAI-compat
  // providers, prefer the direct adapter when a server env var is set
  // (e.g. OPENAI_API_KEY in .env.local) — lets dev/test work without an
  // OpenRouter account. Falls through to OpenRouter otherwise.
  if (anthropicAdapter.supports(model)) {
    return { adapter: anthropicAdapter, apiKey: undefined };
  }
  if (openAICompatAdapter.supports(model) && hasServerEnvKey(model)) {
    return { adapter: openAICompatAdapter, apiKey: undefined };
  }
  return { adapter: openRouterAdapter, apiKey: undefined };
}

export async function runAI(req: AIRequest): Promise<AIResponse> {
  const route = getRouteConfig(req.useCase);
  const validatorKey = req.validateAs ?? route.validator;
  const temperature = req.temperature ?? route.temperature;
  const maxTokens = req.maxTokens ?? route.maxTokens;

  const attemptList: RouteAttempt[] = req.modelOverride
    ? [{ model: req.modelOverride }]
    : [route.primary, ...route.fallback];

  const attempts: AttemptLog[] = [];
  let totalCost = 0;
  let lastDenialMessage: string | undefined;

  for (const next of attemptList) {
    // Step 1: Run the gate (only when we have a userId — internal calls bypass).
    // Uses PEEK (no rate-slot consumed); we record one slot below before the
    // actual upstream call, so a request that tries primary → fallback1 →
    // fallback2 burns at most ONE rate slot total (S8 fix).
    let gateDecision: GateDecision;
    if (req.userId) {
      gateDecision = await peekForAttempt({
        userId: req.userId,
        useCase: req.useCase,
        candidateModel: next.model,
      });
      if (
        gateDecision.kind === 'deny-model-not-in-plan' ||
        gateDecision.kind === 'deny-rate-limit' ||
        gateDecision.kind === 'deny-quota-exhausted' ||
        gateDecision.kind === 'deny-feature-locked'
      ) {
        lastDenialMessage = gateDecision.message;
        attempts.push({
          model: next.model,
          provider: 'openrouter',
          validationPassed: false,
          validationError: `gate ${gateDecision.kind}: ${gateDecision.message ?? ''}`,
          usage: { inputTokens: 0, outputTokens: 0 },
          costUsd: 0,
          durationMs: 0,
        });
        continue;
      }
    } else {
      // No userId on the request. This is the legacy "internal call" path
      // that synthesizes an allow-server decision and bypasses the plan
      // gate. It is dangerous (audit S5 / CWE-862: missing authorization)
      // because it gives free unmetered flagship-model access whenever
      // a caller forgets to plumb userId through.
      //
      // Production refuses outright; non-prod logs loudly so the missing
      // wiring surfaces in dev logs. Internal background jobs that
      // genuinely need to bypass the gate must set userId to a
      // service-account marker AND set ALLOW_INTERNAL_BYPASS=1.
      const allowInternal = process.env.ALLOW_INTERNAL_BYPASS === '1';
      if (process.env.NODE_ENV === 'production' && !allowInternal) {
        throw new AIRouterError(
          'AI request rejected: userId is required in production. Set ' +
            'ALLOW_INTERNAL_BYPASS=1 for service-account callers.',
          attempts,
          'userId required'
        );
      }
      console.warn(
        '[ai/router] WARN: AI request without userId — plan gate bypassed. ' +
          'useCase=' + req.useCase +
          ', model=' + next.model +
          '. This is a CWE-862 vector and must be fixed before production.'
      );
      gateDecision = {
        kind: 'allow-server',
        resolvedModel: next.model,
        bypassesQuota: true,
      };
    }

    const { adapter, apiKey } = selectAdapter(next.model, gateDecision);
    const start = Date.now();
    const log: AttemptLog = {
      model: next.model,
      provider: adapter.name,
      validationPassed: false,
      usage: { inputTokens: 0, outputTokens: 0 },
      costUsd: 0,
      durationMs: 0,
    };

    try {
      // S8: now that we've picked an adapter we're actually going to call,
      // commit one rate-limit slot. BYOK calls do not count against rate
      // limits (bypassesQuota implies bypassesRate too).
      if (req.userId && !gateDecision.bypassesQuota) {
        await consumeRateSlot(req.userId);
      }

      const callOpts: ProviderCallOpts = {
        model: next.model,
        system: req.system,
        cacheable: req.cacheable,
        message: req.message,
        history: req.history,
        temperature: next.temperature ?? temperature,
        maxTokens: next.maxTokens ?? maxTokens,
        apiKey: apiKey ?? req.apiKeyOverride,
      };

      const result = await adapter.call(callOpts);
      log.usage = result.usage;
      log.costUsd = computeCost(next.model, result.usage);
      log.durationMs = Date.now() - start;
      totalCost += log.costUsd;

      const v = validate(validatorKey, result.content);
      if (v.ok) {
        log.validationPassed = true;
        attempts.push(log);

        const response: AIResponse = {
          content: v.content ?? result.content,
          modelUsed: next.model,
          provider: adapter.name,
          totalCostUsd: totalCost,
          usage: result.usage,
          attempts,
        };

        // Step 2: Consume quota for server-funded calls only.
        if (req.userId && !gateDecision.bypassesQuota) {
          const totalTokens = result.usage.inputTokens + result.usage.outputTokens;
          await consumeQuota(req.userId, { tokens: totalTokens, costUsd: log.costUsd });
        }

        await logUsage(req.useCase, response, req.traceTag);
        return response;
      } else {
        log.validationError = v.error;
        attempts.push(log);
      }
    } catch (err) {
      log.durationMs = Date.now() - start;
      log.validationError = err instanceof Error ? err.message : String(err);
      attempts.push(log);
    }
  }

  const errSummary = attempts
    .map((a) => `${a.model}: ${a.validationError ?? 'unknown failure'}`)
    .join(' → ');
  throw new AIRouterError(
    `All ${attempts.length} model attempts failed for "${req.useCase}". ${errSummary}`,
    attempts,
    lastDenialMessage
  );
}
