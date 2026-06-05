/**
 * @deprecated Phase 1 compatibility shim — Claude-backed.
 * Phase 3 migrates consumers to `claudeStream` directly and removes this file.
 */

import { claudeStream } from '@/lib/ai/claude';

export interface StreamingOptions {
  model?: string;
  message: string;
  promptContext?: string;
  temperature?: number;
  maxTokens?: number;
  chatHistory?: Array<{ role: string; message: string }>;
  /**
   * Authenticated caller id (S5 / CWE-862). Forwarded to claudeStream so
   * the plan gate applies once streaming is wired through the router (S6).
   */
  userId?: string;
}

export async function streamingCohereChatCompletion(
  options: StreamingOptions
): Promise<Response> {
  const {
    message,
    promptContext = '',
    temperature = 0.7,
    maxTokens = 1024,
    chatHistory = [],
    userId,
  } = options;

  const history = chatHistory.map((m) => ({
    role:
      m.role === 'USER' || m.role === 'user'
        ? ('user' as const)
        : ('assistant' as const),
    content: m.message,
  }));

  return claudeStream({
    userId,
    message,
    system: promptContext || undefined,
    temperature,
    maxTokens,
    history,
  });
}
