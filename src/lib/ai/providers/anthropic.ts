/**
 * Anthropic-direct adapter.
 *
 * We could go entirely through OpenRouter, but routing Claude calls
 * direct lets us use Anthropic's prompt-caching headers (`cache_control`)
 * which OpenRouter's chat-completions translation doesn't preserve.
 *
 * Model id conventions handled here:
 *   - "claude-sonnet-4-6" (preferred, undated)
 *   - "anthropic/claude-sonnet-4-6" (OpenRouter-style — we strip the prefix)
 *   - "claude-haiku-4-5-20251001" (dated variants)
 *   - "claude-opus-4-7"
 */

import Anthropic from '@anthropic-ai/sdk';

import type { ProviderAdapter, ProviderCallOpts, ProviderCallResult } from '../types';

function normalizeModel(id: string): string {
  return id.startsWith('anthropic/') ? id.slice('anthropic/'.length) : id;
}

function getClient(apiKeyOverride?: string): Anthropic {
  const apiKey = apiKeyOverride || process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set.');
  }
  return new Anthropic({ apiKey });
}

function buildSystemBlocks(
  system: string | undefined,
  cacheable: string | undefined
): string | Anthropic.Messages.TextBlockParam[] | undefined {
  if (!system && !cacheable) return undefined;
  if (!cacheable) return system;
  const blocks: Anthropic.Messages.TextBlockParam[] = [];
  if (system) blocks.push({ type: 'text', text: system });
  blocks.push({
    type: 'text',
    text: cacheable,
    // Caches the prefix up to and including this block (5-min TTL).
    cache_control: { type: 'ephemeral' },
  });
  return blocks;
}

export class AnthropicAdapter implements ProviderAdapter {
  readonly name = 'anthropic-direct' as const;

  supports(model: string): boolean {
    const normalized = normalizeModel(model);
    return normalized.startsWith('claude-');
  }

  async call(opts: ProviderCallOpts): Promise<ProviderCallResult> {
    const client = getClient(opts.apiKey);
    const model = normalizeModel(opts.model);

    const messages: Anthropic.Messages.MessageParam[] = [];
    for (const turn of opts.history ?? []) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({ role: 'user', content: opts.message });

    const response = await client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.7,
      system: buildSystemBlocks(opts.system, opts.cacheable),
      messages,
    });

    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    // Anthropic usage reports cache hits separately.
    const u = response.usage;
    return {
      content,
      usage: {
        inputTokens: u.input_tokens,
        outputTokens: u.output_tokens,
        cachedInputTokens: u.cache_read_input_tokens ?? undefined,
      },
    };
  }
}

export const anthropicAdapter = new AnthropicAdapter();
