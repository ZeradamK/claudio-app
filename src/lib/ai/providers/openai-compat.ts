/**
 * OpenAI-compatible direct adapter.
 *
 * Many providers (OpenAI, DeepSeek, Mistral, Groq, Together) speak the
 * exact same chat-completions API as OpenAI. One adapter handles them all
 * — we just swap the base URL and strip the "<provider>/" prefix off the
 * model id when forwarding.
 *
 * Used for the BYOK path: when a user has pasted e.g. their OpenAI key,
 * we send their calls directly to https://api.openai.com instead of
 * routing through OpenRouter. Skips the OpenRouter 5% margin and uses
 * provider-specific features (json_schema, prompt caching headers).
 */

import type { ProviderAdapter, ProviderCallOpts, ProviderCallResult } from '../types';

const PROVIDER_BASE_URLS: Record<string, string> = {
  'openai/': 'https://api.openai.com/v1/chat/completions',
  'deepseek/': 'https://api.deepseek.com/chat/completions',
  'mistralai/': 'https://api.mistral.ai/v1/chat/completions',
  'meta-llama/': 'https://api.groq.com/openai/v1/chat/completions',
  'qwen/': 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  'x-ai/': 'https://api.x.ai/v1/chat/completions',
};

const PROVIDER_ENV_KEYS: Record<string, string> = {
  'openai/': 'OPENAI_API_KEY',
  'deepseek/': 'DEEPSEEK_API_KEY',
  'mistralai/': 'MISTRAL_API_KEY',
  'meta-llama/': 'GROQ_API_KEY',
  'qwen/': 'DASHSCOPE_API_KEY',
  'x-ai/': 'XAI_API_KEY',
};

const PROVIDER_PREFIXES = Object.keys(PROVIDER_BASE_URLS);

function findPrefix(model: string): string | null {
  return PROVIDER_PREFIXES.find((p) => model.startsWith(p)) ?? null;
}

function getServerEnvKey(model: string): string | undefined {
  const prefix = findPrefix(model);
  if (!prefix) return undefined;
  return process.env[PROVIDER_ENV_KEYS[prefix]]?.trim() || undefined;
}

export function hasServerEnvKey(model: string): boolean {
  return getServerEnvKey(model) !== undefined;
}

function stripPrefix(model: string, prefix: string): string {
  return model.slice(prefix.length);
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices?: Array<{ message: { content: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
  error?: { message: string };
}

export class OpenAICompatAdapter implements ProviderAdapter {
  readonly name = 'openrouter' as const; // shares the "openrouter" label for accounting; the actual provider is implied by the URL

  supports(model: string): boolean {
    return findPrefix(model) !== null;
  }

  async call(opts: ProviderCallOpts): Promise<ProviderCallResult> {
    const prefix = findPrefix(opts.model);
    if (!prefix) throw new Error(`OpenAICompatAdapter cannot route model: ${opts.model}`);
    const url = PROVIDER_BASE_URLS[prefix];
    const modelName = stripPrefix(opts.model, prefix);

    const apiKey = opts.apiKey ?? getServerEnvKey(opts.model);
    if (!apiKey) {
      throw new Error(
        `No API key for ${prefix} — add via /settings/api-keys or set ${PROVIDER_ENV_KEYS[prefix]} in .env.local.`
      );
    }

    const systemContent = [opts.system, opts.cacheable].filter(Boolean).join('\n\n');
    const messages: OpenAIMessage[] = [];
    if (systemContent) messages.push({ role: 'system', content: systemContent });
    for (const turn of opts.history ?? []) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({ role: 'user', content: opts.message });

    const body = {
      model: modelName,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4096,
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`${prefix} ${resp.status}: ${text || resp.statusText}`);
    }

    const data = (await resp.json()) as OpenAIResponse;
    if (data.error) throw new Error(`${prefix} API error: ${data.error.message}`);

    const content = data.choices?.[0]?.message?.content ?? '';
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

export const openAICompatAdapter = new OpenAICompatAdapter();
