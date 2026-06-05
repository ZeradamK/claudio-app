/**
 * @deprecated Phase 1 compatibility shim — Claude-backed.
 *
 * Preserves the Cohere SDK-shaped surface (cohereClient.chat, .chatStream,
 * COHERE_MODELS, helper functions) so legacy consumers compile. Internally
 * everything is routed to the Claude wrapper in `@/lib/ai/claude`.
 *
 * Phase 3 removes this file along with cohere-chat.ts and cohere-streaming.ts.
 */

import { claudeChat, claudeStream, isClaudeConfigured, getBestClaudeModel } from '@/lib/ai/claude';

// Backwards-compat model name constants — values are now Claude model ids.
export const COHERE_MODELS = {
  COMMAND_A: getBestClaudeModel('architecture'),
  COMMAND_R_PLUS_08: getBestClaudeModel('general'),
  COMMAND_R7B: getBestClaudeModel('general'),
  COMMAND_R_PLUS: getBestClaudeModel('general'),
  COMMAND_R: getBestClaudeModel('general'),
} as const;

export function getBestCohereModel(useCase: 'architecture' | 'general' | 'code'): string {
  return getBestClaudeModel(useCase);
}

export function getCohereModelWithFallback(_preferredModel?: string): string {
  // The original tried Cohere-specific ids; under Claude we always pick the
  // best Claude model for the workload. The preferred-model arg is ignored.
  return getBestClaudeModel('architecture');
}

export function isCohereConfigured(): boolean {
  return isClaudeConfigured();
}

interface CohereChatHistoryItem {
  role: 'USER' | 'CHATBOT' | string;
  message: string;
}

interface CohereChatArgs {
  model?: string;
  message: string;
  preamble?: string;
  temperature?: number;
  maxTokens?: number;
  chatHistory?: CohereChatHistoryItem[];
  connectors?: Array<{ id: string }>;
  /** Authenticated caller id (S5 / CWE-862). Forwarded to claudeChat. */
  userId?: string;
}

interface CohereStreamChunk {
  eventType: 'text-generation' | string;
  text?: string;
}

function toClaudeHistory(
  history: CohereChatHistoryItem[] | undefined
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!history) return [];
  return history.map((h) => ({
    role:
      h.role === 'USER' || h.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: h.message,
  }));
}

/**
 * Drop-in replacement for the Cohere SDK client. Only `.chat()` and
 * `.chatStream()` are supported — those are the only methods Claudio used.
 */
export const cohereClient = {
  async chat(args: CohereChatArgs): Promise<{ text: string }> {
    const { content } = await claudeChat({
      userId: args.userId,
      message: args.message,
      system: args.preamble,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      history: toClaudeHistory(args.chatHistory),
    });
    return { text: content };
  },

  async *chatStream(args: CohereChatArgs): AsyncGenerator<CohereStreamChunk> {
    // Build a Claude stream and re-shape its deltas to look like Cohere chunks.
    const queue: string[] = [];
    let done = false;
    let error: unknown = null;

    const response = await claudeStream({
      userId: args.userId,
      message: args.message,
      system: args.preamble,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      history: toClaudeHistory(args.chatHistory),
      onDelta: (chunk) => queue.push(chunk),
      onComplete: () => {
        done = true;
      },
    });

    if (!response.ok || !response.body) {
      throw new Error(`Claude stream failed: ${response.status} ${response.statusText}`);
    }

    // Drain the response body in parallel so the queue stays fed.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    (async () => {
      try {
        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) {
            done = true;
            break;
          }
          if (value) queue.push(decoder.decode(value));
        }
      } catch (e) {
        error = e;
        done = true;
      }
    })();

    while (!done || queue.length > 0) {
      if (error) throw error;
      if (queue.length === 0) {
        await new Promise((r) => setTimeout(r, 8));
        continue;
      }
      yield { eventType: 'text-generation', text: queue.shift() };
    }
  },
};

export default cohereClient;
