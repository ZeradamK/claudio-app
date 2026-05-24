import { NextResponse } from 'next/server';
import { isClaudeConfigured } from '@/lib/ai/claude';

export async function GET() {
  try {
    const claudeConfigured = isClaudeConfigured();
    return NextResponse.json({
      // Legacy field name kept so the UI's existing check still passes.
      // Will be renamed in Phase 3.
      cohereConfigured: claudeConfigured,
      claudeConfigured,
      error: !claudeConfigured
        ? 'Claude API key (ANTHROPIC_API_KEY) is required. Add it to .env.local — see .env.example.'
        : null,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error checking API configuration:', error);
    return NextResponse.json(
      {
        cohereConfigured: false,
        claudeConfigured: false,
        error: 'Failed to check API configuration',
      },
      { status: 500 }
    );
  }
}
