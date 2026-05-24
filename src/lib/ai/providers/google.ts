/**
 * Google Gemini direct adapter.
 *
 * Gemini uses a different API shape than OpenAI's chat-completions, so it
 * gets its own adapter. We accept model ids in three forms and normalize:
 *   - "google/gemini-2.5-pro"     → "gemini-2.5-pro"
 *   - "gemini-2.5-pro"            → unchanged
 *   - "google/gemini-2.5-flash"   → "gemini-2.5-flash"
 *
 * BYOK only — server-funded Gemini calls go through OpenRouter to keep our
 * provider footprint small.
 */

import type { ProviderAdapter, ProviderCallOpts, ProviderCallResult } from '../types';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function normalizeModel(model: string): string {
  return model.startsWith('google/') ? model.slice('google/'.length) : model;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: { role: 'system'; parts: Array<{ text: string }> };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
  error?: { message: string };
}

export class GoogleGeminiAdapter implements ProviderAdapter {
  readonly name = 'openrouter' as const; // bucketed with non-Anthropic for accounting

  supports(model: string): boolean {
    const n = normalizeModel(model);
    return n.startsWith('gemini-');
  }

  async call(opts: ProviderCallOpts): Promise<ProviderCallResult> {
    const model = normalizeModel(opts.model);
    if (!opts.apiKey) {
      throw new Error(
        'No Google API key provided. Add one via /settings/api-keys or set GOOGLE_API_KEY.'
      );
    }

    const contents: GeminiContent[] = [];
    for (const turn of opts.history ?? []) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: opts.message }] });

    const systemText = [opts.system, opts.cacheable].filter(Boolean).join('\n\n');
    const body: GeminiRequestBody = {
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxTokens ?? 4096,
      },
    };
    if (systemText) {
      body.systemInstruction = { role: 'system', parts: [{ text: systemText }] };
    }

    const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Gemini ${resp.status}: ${text || resp.statusText}`);
    }

    const data = (await resp.json()) as GeminiResponse;
    if (data.error) throw new Error(`Gemini API error: ${data.error.message}`);

    const content =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

    return {
      content,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        cachedInputTokens: data.usageMetadata?.cachedContentTokenCount,
      },
    };
  }
}

export const googleGeminiAdapter = new GoogleGeminiAdapter();
