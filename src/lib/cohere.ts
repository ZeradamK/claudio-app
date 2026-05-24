/**
 * @deprecated Phase 1 compatibility shim — Claude-backed.
 *
 * The original Claudio used Cohere as the primary AI. In v2 we route
 * everything through Claude, but several legacy routes still import a
 * `cohere` object with `.chat()` and `.generate()` methods. This shim
 * preserves that surface while delegating to {@link claudeChat}.
 *
 * Phase 3 of the rebuild migrates these call sites to use the Claude
 * wrapper directly and removes this file.
 */

import { claudeChat } from './ai/claude';

interface CohereChatArgs {
  message: string;
  preamble?: string;
  temperature?: number;
  maxTokens?: number;
  /** Cohere-only; ignored under Claude. Phase 5 may add tool-use search. */
  connectors?: Array<{ id: string }>;
  /** Cohere-only; ignored. */
  model?: string;
}

interface CohereGenerateArgs {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  format?: 'json' | string;
}

export const cohere = {
  async chat(args: CohereChatArgs): Promise<{ text: string }> {
    if (args.connectors?.length && process.env.DEBUG_CLAUDE === 'true') {
      // eslint-disable-next-line no-console
      console.warn(
        '[cohere shim] connectors are ignored under Claude; live web search will land via tool-use in Phase 5.'
      );
    }
    const { content } = await claudeChat({
      message: args.message,
      system: args.preamble,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
    });
    return { text: content };
  },

  async generate(
    args: CohereGenerateArgs
  ): Promise<{ generations: Array<{ text: string }> }> {
    const { content } = await claudeChat({
      message: args.prompt,
      temperature: args.temperature ?? 0.3,
      maxTokens: args.maxTokens ?? 1024,
    });
    return { generations: [{ text: content }] };
  },
};
