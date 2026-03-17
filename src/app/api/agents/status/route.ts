import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndRateLimit, isNextResponse } from '@/lib/apiAuth';

// GET /api/agents/status - Get current agent's claim status
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent } = authResult;

    return NextResponse.json({
      status: agent.is_claimed ? 'claimed' : 'pending_claim',
      agentStatus: agent.status,
      name: agent.name,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
