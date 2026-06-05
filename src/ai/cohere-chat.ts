/**
 * @deprecated Phase 1 compatibility shim — Claude-backed.
 * Phase 3 migrates consumers to `claudeChat` directly and removes this file.
 */

import { claudeChat } from '@/lib/ai/claude';
import { ChatMessage } from '@/types/chat';

export interface CohereChatOptions {
  model?: string;
  message: string;
  promptContext?: string;
  temperature?: number;
  maxTokens?: number;
  chatHistory?: ChatMessage[];
  /**
   * Authenticated caller id (S5 / CWE-862). Forwarded to claudeChat so
   * the plan gate applies. Callers MUST pass this; the router will warn
   * (non-prod) or refuse (prod) when missing.
   */
  userId?: string;
}

export async function generateCohereChatCompletion({
  message,
  promptContext = '',
  temperature = 0.7,
  maxTokens = 1000,
  chatHistory = [],
  userId,
}: CohereChatOptions): Promise<string> {
  try {
    const history = chatHistory.map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));

    const { content } = await claudeChat({
      userId,
      message,
      system: promptContext || undefined,
      temperature,
      maxTokens,
      history,
    });
    return content;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error generating chat completion via Claude:', error);
    throw new Error(
      `Failed to generate chat completion: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
