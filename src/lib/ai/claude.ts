/**
 * Claudio v2 — Claude/AI wrapper, now a delegator to the multi-provider router.
 *
 * Backwards-compatible exports for the 14 Phase-1 consumers:
 *   - claudeChat / claudeJson  → delegate to the router (cheap-first with
 *     Claude fallback when validation fails)
 *   - claudeStream             → still Anthropic-direct, since multi-provider
 *     streaming lands in Phase 7
 *   - CLAUDE_MODELS / isClaudeConfigured / getBestClaudeModel → unchanged
 *     surface; the names are kept for legacy callers but their behavior is
 *     largely cosmetic now (the router picks the actual model).
 *
 * New callers should use `runAI` from `./router` directly so they can pass
 * an explicit `useCase` and get the right cheap-first routing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';

import { runAI } from './router';
import type { AIRequest, UseCase } from './types';

// ─── Models (kept for backwards compatibility) ─────────────────────────────

export const CLAUDE_MODELS = {
  SONNET_4_6: 'claude-sonnet-4-6',
  HAIKU_4_5: 'claude-haiku-4-5-20251001',
  OPUS_4_7: 'claude-opus-4-7',
} as const;

export type ClaudeUseCase = 'architecture' | 'general' | 'code';

export function getBestClaudeModel(useCase: ClaudeUseCase = 'general'): string {
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;
  return CLAUDE_MODELS.SONNET_4_6;
}

export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim() || !!process.env.OPENROUTER_API_KEY?.trim();
}

// ─── Types kept compatible with Phase 1 ────────────────────────────────────

export type ChatRole = 'user' | 'assistant';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface ClaudeRequestBase {
  model?: string;
  system?: string;
  cacheable?: string;
  message: string;
  history?: ChatTurn[];
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  /**
   * New optional field — when set, the router picks the cheap-first model
   * for this use case and falls back automatically. Defaults to 'general'.
   */
  useCase?: UseCase;
  /** Trace tag for cost rollups in the usage log. */
  traceTag?: string;
  /**
   * Authenticated caller id. Passed through to `runAI` so the plan gate
   * applies rate limits + quotas + plan checks. Optional only because
   * Phase-1 callers existed before the field; the router warns when it
   * is absent. **Production deploys MUST set this** — see S5 audit.
   *
   * Routes should always derive this from `getOrCreateUserId()`.
   */
  userId?: string;
}

// ─── Non-streaming chat (delegates to router) ──────────────────────────────

export interface ClaudeChatResult {
  content: string;
  usage: { input_tokens: number; output_tokens: number };
  stopReason: 'end_turn' | string;
}

export async function claudeChat(opts: ClaudeRequestBase): Promise<ClaudeChatResult> {
  const req: AIRequest = {
    userId: opts.userId,
    useCase: opts.useCase ?? 'general',
    system: opts.system,
    cacheable: opts.cacheable,
    message: opts.message,
    history: opts.history,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    apiKeyOverride: opts.apiKey,
    modelOverride: opts.model && opts.model !== CLAUDE_MODELS.SONNET_4_6 ? opts.model : undefined,
    traceTag: opts.traceTag,
  };
  const resp = await runAI(req);
  return {
    content: resp.content,
    usage: {
      input_tokens: resp.usage.inputTokens,
      output_tokens: resp.usage.outputTokens,
    },
    stopReason: 'end_turn',
  };
}

// ─── JSON output (delegates to router) ─────────────────────────────────────

export interface ClaudeJsonOptions extends ClaudeRequestBase {
  retries?: number;
}

export async function claudeJson<T = unknown>(
  opts: ClaudeJsonOptions
): Promise<{ data: T; raw: string; usage: { input_tokens: number; output_tokens: number } }> {
  const req: AIRequest = {
    userId: opts.userId,
    useCase: opts.useCase ?? 'general',
    system: opts.system,
    cacheable: opts.cacheable,
    message: opts.message,
    history: opts.history,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    apiKeyOverride: opts.apiKey,
    // Use the route's declared validator (e.g. json-architecture for
    // architecture-generation use-cases) rather than always forcing
    // json-generic. This was a real bug — claudeJson({useCase:'architecture-generation'})
    // was defeating the architecture schema check (audit bug #11).
    traceTag: opts.traceTag,
  };
  const resp = await runAI(req);
  // The router's validator already ran JSON.parse + jsonrepair on the content,
  // so this parse should always succeed.
  try {
    return {
      data: JSON.parse(resp.content) as T,
      raw: resp.content,
      usage: {
        input_tokens: resp.usage.inputTokens,
        output_tokens: resp.usage.outputTokens,
      },
    };
  } catch {
    // Defensive: try jsonrepair one more time.
    return {
      data: JSON.parse(jsonrepair(resp.content)) as T,
      raw: resp.content,
      usage: {
        input_tokens: resp.usage.inputTokens,
        output_tokens: resp.usage.outputTokens,
      },
    };
  }
}

// ─── Streaming (Anthropic-direct for now; Phase 7 routes via OpenRouter) ──

import { gateForAttempt } from '../plans/gate';
import { consumeQuota } from '../plans/quota-tracker';
import { logUsage } from './cost-tracker';
import { computeCost } from './pricing';

export interface ClaudeStreamOptions extends ClaudeRequestBase {
  onDelta?: (chunk: string) => void;
  onComplete?: (usage: Anthropic.Messages.Usage) => void;
}

/**
 * Plan-gated streaming chat (S6 fix). Pre-stream the request goes through
 * the same `gateForAttempt` the non-streaming router uses, so:
 *   - the use-case is checked against the plan
 *   - rate limit and daily quota are consulted (and consumed post-stream
 *     for server-funded calls)
 *   - BYOK keys are honoured (skipping server quota)
 *
 * Before this commit, streaming was Anthropic-direct with zero gating —
 * every chat-UI call hit ANTHROPIC_API_KEY unmetered, the highest-volume
 * use case in the app (audit S6 / CWE-862).
 */
export async function claudeStream(opts: ClaudeStreamOptions): Promise<Response> {
  // ─── 1) Plan gate ──────────────────────────────────────────────────────
  // Production refuses streaming without userId (matches router behaviour).
  if (!opts.userId) {
    const allowInternal = process.env.ALLOW_INTERNAL_BYPASS === '1';
    if (process.env.NODE_ENV === 'production' && !allowInternal) {
      return new Response(
        JSON.stringify({ error: 'userId required for streaming in production' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    console.warn(
      '[ai/claude:claudeStream] WARN: stream request without userId — plan gate bypassed.'
    );
  }

  const candidateModel = opts.model ?? getBestClaudeModel('general');
  let decision: Awaited<ReturnType<typeof gateForAttempt>> | null = null;

  if (opts.userId) {
    decision = await gateForAttempt({
      userId: opts.userId,
      useCase: opts.useCase ?? 'chat-modification',
      candidateModel,
    });
    if (decision.kind !== 'allow-server' && decision.kind !== 'allow-byok') {
      // Gate refused — return a JSON 403/429 so the UI can show an upgrade
      // modal or retry, instead of starting a stream that fails mid-way.
      const status =
        decision.kind === 'deny-rate-limit'
          ? 429
          : decision.kind === 'deny-quota-exhausted'
            ? 429
            : 403;
      return new Response(
        JSON.stringify({
          error: 'message' in decision ? decision.message : 'AI call denied',
          reason: decision.kind,
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ─── 2) Pick API key ───────────────────────────────────────────────────
  // BYOK gate decision provides the user's key; otherwise server key.
  const apiKey =
    (decision && decision.kind === 'allow-byok' && 'apiKey' in decision
      ? decision.apiKey
      : undefined) ||
    opts.apiKey ||
    process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          'No API key available. Set ANTHROPIC_API_KEY or add a BYOK key via /settings/api-keys.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const client = new Anthropic({ apiKey });

  const messages: Anthropic.Messages.MessageParam[] = [];
  for (const turn of opts.history ?? []) {
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: 'user', content: opts.message });

  const system: string | Anthropic.Messages.TextBlockParam[] | undefined =
    opts.cacheable && opts.system
      ? [
          { type: 'text', text: opts.system },
          { type: 'text', text: opts.cacheable, cache_control: { type: 'ephemeral' } },
        ]
      : opts.cacheable
        ? [{ type: 'text', text: opts.cacheable, cache_control: { type: 'ephemeral' } }]
        : opts.system;

  const encoder = new TextEncoder();
  const userId = opts.userId;
  const useCase = opts.useCase ?? 'chat-modification';
  const bypassesQuota = decision?.bypassesQuota === true;

  const readable = new ReadableStream({
    async start(controller) {
      // Capture partial-usage state so a mid-stream error still records
      // the tokens we did burn (audit #6 — server pays for partial work,
      // user should be charged).
      const partial: { input_tokens: number; output_tokens: number } = {
        input_tokens: 0,
        output_tokens: 0,
      };
      let havePartial = false;
      let streamError: unknown = null;

      try {
        const stream = client.messages.stream({
          model: candidateModel,
          max_tokens: opts.maxTokens ?? 4096,
          temperature: opts.temperature ?? 0.7,
          system,
          messages,
        });
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text || '';
            opts.onDelta?.(text);
            controller.enqueue(encoder.encode(text));
          }
          if (event.type === 'message_delta' && event.usage) {
            // Anthropic emits running usage on message_delta — output_tokens
            // is incremental. Capture so we have something to charge if the
            // loop bails after this point.
            partial.output_tokens = event.usage.output_tokens ?? partial.output_tokens;
            havePartial = true;
          }
        }
        const final = await stream.finalMessage();
        partial.input_tokens = final.usage.input_tokens;
        partial.output_tokens = final.usage.output_tokens;
        havePartial = true;
        opts.onComplete?.(final.usage);
      } catch (err) {
        streamError = err;
      } finally {
        // ─── 3) Post-stream: log + consume quota — ALWAYS try ───────────
        // Even on error, real tokens may have been spent. Record what we
        // know. Wrap in its own try so logging failures never propagate.
        if (userId && havePartial) {
          try {
            const usage = {
              inputTokens: partial.input_tokens,
              outputTokens: partial.output_tokens,
            };
            const costUsd = computeCost(candidateModel, usage);
            if (!bypassesQuota) {
              await consumeQuota(userId, {
                tokens: usage.inputTokens + usage.outputTokens,
                costUsd,
              });
            }
            await logUsage(
              useCase,
              {
                content: '',
                modelUsed: candidateModel,
                provider: 'anthropic-direct',
                totalCostUsd: costUsd,
                usage,
                attempts: [
                  {
                    model: candidateModel,
                    provider: 'anthropic-direct',
                    validationPassed: streamError === null,
                    validationError: streamError
                      ? streamError instanceof Error
                        ? streamError.message
                        : String(streamError)
                      : undefined,
                    usage,
                    costUsd,
                    durationMs: 0,
                  },
                ],
              },
              opts.traceTag ?? (streamError ? 'stream-error' : 'stream')
            );
          } catch (logErr) {
            console.error('[ai/claude:claudeStream] post-stream logging failed:', logErr);
          }
        }

        if (streamError) {
          controller.error(streamError);
        } else {
          controller.close();
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
