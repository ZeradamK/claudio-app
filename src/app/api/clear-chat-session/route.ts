import { NextRequest, NextResponse } from 'next/server';
import { clearConversationSession } from '@/ai/jarvis-orchestrator';

/**
 * API route for clearing the chat session for a specific architecture
 * GET /api/clear-chat-session?architectureId=123
 */
export async function GET(request: NextRequest) {
  // Extract the architecture ID from the query parameters
  const architectureId = request.nextUrl.searchParams.get('architectureId');
  
  if (!architectureId) {
    return NextResponse.json(
      { error: 'Architecture ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Call the function to clear the conversation session
    const cleared = clearConversationSession(architectureId);
    
    if (cleared) {
      return NextResponse.json({ success: true, message: 'Conversation session cleared successfully' });
    } else {
      return NextResponse.json({ success: false, message: 'No active session found for this architecture' });
    }
  } catch (error) {
    console.error('Error clearing conversation session:', error);
    return NextResponse.json(
      { error: 'Failed to clear conversation session' },
      { status: 500 }
    );
  }
} 