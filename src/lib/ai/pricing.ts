/**
 * Per-model pricing catalog used to estimate $ cost from token usage.
 *
 * Prices are in USD per million tokens. They DRIFT — check the providers'
 * pricing pages and update here. The router treats unknown models as
 * cost-zero (we'd rather under-report than fail the request).
 *
 * Sources (verify periodically):
 *   - OpenAI:      https://openai.com/api/pricing
 *   - Google:      https://ai.google.dev/pricing
 *   - DeepSeek:    https://api-docs.deepseek.com/quick_start/pricing
 *   - Anthropic:   https://anthropic.com/pricing
 *   - Mistral:     https://mistral.ai/products/la-plateforme#pricing
 *   - Meta/Groq:   https://groq.com/pricing
 *   - OpenRouter:  https://openrouter.ai/models (per-model pages)
 *
 * Note: OpenRouter typically adds a ~5% margin on top of provider pricing.
 * These values approximate the OpenRouter-as-seen price; for the
 * "anthropic/*" entries we use Anthropic-direct since the router prefers
 * the direct adapter when prompt caching helps.
 */

import type { TokenUsage } from './types';

export interface ModelPrice {
  /** USD per million input tokens. */
  inputPerM: number;
  /** USD per million output tokens. */
  outputPerM: number;
  /** USD per million cached-read input tokens (if provider supports caching). */
  cachedInputPerM?: number;
}

export const MODEL_PRICING: Record<string, ModelPrice> = {
  // ─── OpenAI (via OpenRouter; direct API is similar) ─────────────────────
  'openai/gpt-5': { inputPerM: 1.25, outputPerM: 10, cachedInputPerM: 0.125 },
  'openai/gpt-5-mini': { inputPerM: 0.25, outputPerM: 2, cachedInputPerM: 0.025 },
  'openai/gpt-5-nano': { inputPerM: 0.05, outputPerM: 0.4 },
  'openai/o3': { inputPerM: 2, outputPerM: 8 },
  'openai/o3-mini': { inputPerM: 1.1, outputPerM: 4.4 },

  // ─── Google ─────────────────────────────────────────────────────────────
  'google/gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 10 },
  'google/gemini-2.5-flash': { inputPerM: 0.3, outputPerM: 2.5 },
  'google/gemini-2.5-flash-lite': { inputPerM: 0.1, outputPerM: 0.4 },

  // ─── DeepSeek ───────────────────────────────────────────────────────────
  'deepseek/deepseek-chat-v3': { inputPerM: 0.27, outputPerM: 1.1 },
  'deepseek/deepseek-r1': { inputPerM: 0.55, outputPerM: 2.19 },

  // ─── Meta (via Groq / Together) ─────────────────────────────────────────
  'meta-llama/llama-4-maverick': { inputPerM: 0.5, outputPerM: 0.75 },
  'meta-llama/llama-4-scout': { inputPerM: 0.2, outputPerM: 0.6 },

  // ─── Mistral ────────────────────────────────────────────────────────────
  'mistralai/codestral': { inputPerM: 0.3, outputPerM: 0.9 },
  'mistralai/mistral-large-2': { inputPerM: 2, outputPerM: 6 },

  // ─── Qwen ───────────────────────────────────────────────────────────────
  'qwen/qwen-3': { inputPerM: 0.2, outputPerM: 0.6 },

  // ─── xAI ────────────────────────────────────────────────────────────────
  'x-ai/grok-4-fast': { inputPerM: 0.2, outputPerM: 0.5 },

  // ─── Anthropic (direct adapter, no OpenRouter margin) ───────────────────
  'anthropic/claude-sonnet-4-6': { inputPerM: 3, outputPerM: 15, cachedInputPerM: 0.3 },
  'claude-sonnet-4-6': { inputPerM: 3, outputPerM: 15, cachedInputPerM: 0.3 },
  'anthropic/claude-haiku-4-5': { inputPerM: 1, outputPerM: 5, cachedInputPerM: 0.1 },
  'claude-haiku-4-5-20251001': { inputPerM: 1, outputPerM: 5, cachedInputPerM: 0.1 },
  'anthropic/claude-opus-4-7': { inputPerM: 15, outputPerM: 75, cachedInputPerM: 1.5 },
  'claude-opus-4-7': { inputPerM: 15, outputPerM: 75, cachedInputPerM: 1.5 },
};

/** Compute USD cost for one request given the model id and token usage. */
export function computeCost(model: string, usage: TokenUsage): number {
  const price = MODEL_PRICING[model];
  if (!price) return 0; // unknown model — log zero rather than crash
  const cached = usage.cachedInputTokens ?? 0;
  const billableInput = Math.max(0, usage.inputTokens - cached);
  const inputCost = (billableInput / 1_000_000) * price.inputPerM;
  const cachedCost = price.cachedInputPerM
    ? (cached / 1_000_000) * price.cachedInputPerM
    : 0;
  const outputCost = (usage.outputTokens / 1_000_000) * price.outputPerM;
  return inputCost + cachedCost + outputCost;
}
