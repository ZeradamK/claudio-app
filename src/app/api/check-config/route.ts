import { NextResponse } from 'next/server';
import { isClaudeConfigured } from '@/lib/ai/claude';

/**
 * GET /api/check-config — booleans only.
 *
 * Used by the UI to show a "set up your API key" prompt when no AI
 * provider is configured. Deliberately returns only booleans, never
 * env var names or values (CWE-200: no information disclosure beyond
 * the binary "is something configured" signal). The error message text
 * is fixed and operator-facing — never echoes anything from env.
 */
export async function GET() {
  try {
    const claudeConfigured = isClaudeConfigured();
    return NextResponse.json({
      // Legacy field name kept so the UI's existing check still passes.
      // Will be renamed in Phase 3.
      cohereConfigured: claudeConfigured,
      claudeConfigured,
      error: !claudeConfigured
        ? 'AI provider not configured. Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY in .env.local.'
        : null,
    });
  } catch {
    // Swallow internal error details — only return the boolean state.
    return NextResponse.json(
      {
        cohereConfigured: false,
        claudeConfigured: false,
        error: 'Failed to check configuration',
      },
      { status: 500 }
    );
  }
}
