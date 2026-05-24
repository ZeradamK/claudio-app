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
}

// ─── Non-streaming chat (delegates to router) ──────────────────────────────

export interface ClaudeChatResult {
  content: string;
  usage: { input_tokens: number; output_tokens: number };
  stopReason: 'end_turn' | string;
}

export async function claudeChat(opts: ClaudeRequestBase): Promise<ClaudeChatResult> {
  const req: AIRequest = {
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
    useCase: opts.useCase ?? 'general',
    system: opts.system,
    cacheable: opts.cacheable,
    message: opts.message,
    history: opts.history,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    apiKeyOverride: opts.apiKey,
    validateAs: 'json-generic',
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

export interface ClaudeStreamOptions extends ClaudeRequestBase {
  onDelta?: (chunk: string) => void;
  onComplete?: (usage: Anthropic.Messages.Usage) => void;
}

export async function claudeStream(opts: ClaudeStreamOptions): Promise<Response> {
  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is required for streaming (multi-provider streaming lands Phase 7).' }),
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
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: opts.model ?? getBestClaudeModel('general'),
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
        }
        const final = await stream.finalMessage();
        opts.onComplete?.(final.usage);
        controller.close();
      } catch (err) {
        controller.error(err);
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
