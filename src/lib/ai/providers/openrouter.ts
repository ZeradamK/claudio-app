/**
 * OpenRouter adapter — the multi-provider backbone.
 *
 * OpenRouter exposes 200+ models behind a single OpenAI-compatible API.
 * One API key, one endpoint, every model from "openai/gpt-5-mini" to
 * "deepseek/deepseek-chat-v3" to "google/gemini-2.5-pro" to even
 * "anthropic/claude-sonnet-4-6". They take a small (~5%) margin on top
 * of the underlying provider's price — worth it for the abstraction.
 *
 * Auth: OPENROUTER_API_KEY env var or a per-request override (BYOK).
 *
 * No SDK is needed — the API is plain OpenAI-shaped JSON over HTTPS, so
 * we use fetch and keep the surface tiny.
 */

import type { ProviderAdapter, ProviderCallOpts, ProviderCallResult } from '../types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    /** Some models report cached read tokens; key name varies. */
    prompt_tokens_details?: { cached_tokens?: number };
  };
  error?: { message: string; code?: string };
}

export class OpenRouterAdapter implements ProviderAdapter {
  readonly name = 'openrouter' as const;

  supports(model: string): boolean {
    // Any model id with a provider prefix (e.g. "openai/...", "google/...").
    // Direct-anthropic models without a prefix go to the Anthropic adapter.
    return model.includes('/');
  }

  async call(opts: ProviderCallOpts): Promise<ProviderCallResult> {
    const apiKey = opts.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY is not set. Add it to .env.local or pass an override.'
      );
    }

    const systemContent = [opts.system, opts.cacheable].filter(Boolean).join('\n\n');

    const messages: OpenAIMessage[] = [];
    if (systemContent) {
      messages.push({ role: 'system', content: systemContent });
    }
    for (const turn of opts.history ?? []) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({ role: 'user', content: opts.message });

    const body = {
      model: opts.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4096,
    };

    const resp = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // OpenRouter recommends these for analytics + better routing
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Claudio',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`OpenRouter ${resp.status}: ${text || resp.statusText}`);
    }

    const data = (await resp.json()) as OpenRouterResponse;
    if (data.error) {
      throw new Error(`OpenRouter API error: ${data.error.message}`);
    }

    const content = data.choices[0]?.message?.content ?? '';
    return {
      content,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        cachedInputTokens: data.usage?.prompt_tokens_details?.cached_tokens,
      },
    };
  }
}

export const openRouterAdapter = new OpenRouterAdapter();
