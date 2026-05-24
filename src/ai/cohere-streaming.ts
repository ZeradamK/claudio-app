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
  } = options;

  const history = chatHistory.map((m) => ({
    role:
      m.role === 'USER' || m.role === 'user'
        ? ('user' as const)
        : ('assistant' as const),
    content: m.message,
  }));

  return claudeStream({
    message,
    system: promptContext || undefined,
    temperature,
    maxTokens,
    history,
  });
}
