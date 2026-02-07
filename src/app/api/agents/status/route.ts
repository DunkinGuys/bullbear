import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

// GET /api/agents/status - Get current agent's claim status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.replace('Bearer ', '');
    const apiKeyHash = hashApiKey(apiKey);
    
    const supabase = createServerClient();
    
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, status, is_claimed')
      .eq('api_key_hash', apiKeyHash)
      .single();
    
    if (error || !agent) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      );
    }
    
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
