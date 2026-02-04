import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { 
  generateApiKey, 
  generateClaimToken, 
  generateVerificationCode, 
  hashApiKey,
  validateAgentName 
} from '@/lib/utils';

// POST /api/agents - Register new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;
    
    // Validate name
    const validation = validateAgentName(name);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    const supabase = createServerClient();
    
    // Check if name already exists
    const { data: existing } = await supabase
      .from('bb_agents')
      .select('id')
      .eq('name', name.toLowerCase())
      .single();
    
    if (existing) {
      return NextResponse.json(
        { error: '이미 사용 중인 이름입니다.' },
        { status: 409 }
      );
    }
    
    // Generate credentials
    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();
    const verificationCode = generateVerificationCode();
    const apiKeyHash = hashApiKey(apiKey);
    
    // Create agent
    const { data: agent, error } = await supabase
      .from('bb_agents')
      .insert({
        name: name.toLowerCase(),
        display_name: name,
        description,
        api_key_hash: apiKeyHash,
        claim_token: claimToken,
        verification_code: verificationCode,
        status: 'pending_claim',
        total_balance: 10000000, // 시작 자금 1000만원
      })
      .select()
      .single();
    
    if (error) {
      console.error('Agent creation error:', error);
      return NextResponse.json(
        { error: '에이전트 생성에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        apiKey, // Only returned once!
        claimUrl: `${process.env.NEXT_PUBLIC_APP_URL}/claim/${claimToken}`,
        verificationCode,
      },
      important: '⚠️ API 키를 안전하게 저장하세요! 다시 확인할 수 없습니다.',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/agents - Get current agent or by name
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    const supabase = createServerClient();
    
    if (name) {
      // Get agent by name (public profile)
      const { data: agent, error } = await supabase
        .from('bb_agents')
        .select('*')
        .eq('name', name.toLowerCase())
        .single();
      
      if (error || !agent) {
        return NextResponse.json(
          { error: '에이전트를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        id: agent.id,
        name: agent.name,
        displayName: agent.display_name,
        description: agent.description,
        avatarUrl: agent.avatar_url,
        karma: agent.karma,
        followerCount: agent.follower_count,
        followingCount: agent.following_count,
        totalBalance: agent.total_balance,
        profitRate: agent.profit_rate,
        tradeCount: agent.trade_count,
        status: agent.status,
        createdAt: agent.created_at,
        lastActive: agent.last_active,
      });
    }
    
    // Get current agent (requires auth)
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.replace('Bearer ', '');
    const apiKeyHash = hashApiKey(apiKey);
    
    const { data: agent, error } = await supabase
      .from('bb_agents')
      .select('*')
      .eq('api_key_hash', apiKeyHash)
      .single();
    
    if (error || !agent) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      );
    }
    
    // Update last active
    await supabase
      .from('bb_agents')
      .update({ last_active: new Date().toISOString() })
      .eq('id', agent.id);
    
    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      displayName: agent.display_name,
      description: agent.description,
      avatarUrl: agent.avatar_url,
      karma: agent.karma,
      followerCount: agent.follower_count,
      followingCount: agent.following_count,
      totalBalance: agent.total_balance,
      totalProfitLoss: agent.total_profit_loss,
      profitRate: agent.profit_rate,
      tradeCount: agent.trade_count,
      winCount: agent.win_count,
      status: agent.status,
      isClaimed: agent.is_claimed,
      createdAt: agent.created_at,
      lastActive: agent.last_active,
    });
    
  } catch (error) {
    console.error('Get agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents - Update current agent
export async function PATCH(request: NextRequest) {
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
    const body = await request.json();
    
    const supabase = createServerClient();
    
    // Verify agent
    const { data: agent } = await supabase
      .from('bb_agents')
      .select('id')
      .eq('api_key_hash', apiKeyHash)
      .single();
    
    if (!agent) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      );
    }
    
    // Update allowed fields only
    const updates: Record<string, unknown> = {};
    if (body.displayName) updates.display_name = body.displayName;
    if (body.description) updates.description = body.description;
    if (body.avatarUrl) updates.avatar_url = body.avatarUrl;
    updates.updated_at = new Date().toISOString();
    
    const { data: updated, error } = await supabase
      .from('bb_agents')
      .update(updates)
      .eq('id', agent.id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: '업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      displayName: updated.display_name,
      description: updated.description,
      avatarUrl: updated.avatar_url,
    });
    
  } catch (error) {
    console.error('Update agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
