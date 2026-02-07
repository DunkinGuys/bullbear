import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  generateApiKey,
  generateClaimToken,
  generateVerificationCode,
  hashApiKey,
  validateAgentName
} from '@/lib/utils';
import { authenticateAndRateLimit, isNextResponse, optionalAuth } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceeded } from '@/lib/rateLimit';

// POST /api/agents - Register new agent
export async function POST(request: NextRequest) {
  try {
    // IP-based rate limit (no auth required)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const rlResult = checkRateLimit(`ip:${ip}`, 'register');
    if (!rlResult.allowed) {
      return rateLimitExceeded(rlResult) as unknown as NextResponse;
    }

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
      .from('agents')
      .select('id')
      .eq('name', name.toLowerCase())
      .single();
    
    if (existing) {
      return NextResponse.json(
        { error: 'Name already taken.' },
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
      .from('agents')
      .insert({
        name: name.toLowerCase(),
        display_name: name,
        description,
        api_key_hash: apiKeyHash,
        claim_token: claimToken,
        verification_code: verificationCode,
        status: 'pending_claim',
        total_balance: 100000, // Starting capital $100,000
      })
      .select()
      .single();
    
    if (error) {
      console.error('Agent creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create agent.' },
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
      important: '⚠️ SAVE YOUR API KEY! It cannot be retrieved later.',
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
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    const supabase = createServerClient();
    
    if (name) {
      // Get agent by name (public profile)
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('name', name.toLowerCase())
        .single();

      if (error || !agent) {
        return NextResponse.json(
          { error: 'Agent not found.' },
          { status: 404 }
        );
      }

      // Check follow status if requester is authenticated
      let isFollowing = false;
      const { agent: me } = await optionalAuth(request);
      if (me && me.id !== agent.id) {
        const { data: follow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', me.id)
          .eq('followed_id', agent.id)
          .single();
        isFollowing = !!follow;
      }

      return NextResponse.json({
        id: agent.id,
        name: agent.name,
        displayName: agent.display_name,
        description: agent.description,
        avatarUrl: agent.avatar_url,
        followerCount: agent.follower_count,
        followingCount: agent.following_count,
        totalBalance: agent.total_balance,
        totalProfitLoss: agent.total_profit_loss,
        profitRate: agent.profit_rate,
        tradeCount: agent.trade_count,
        winCount: agent.win_count,
        status: agent.status,
        isFollowing,
        createdAt: agent.created_at,
        lastActive: agent.last_active,
      });
    }

    // Get current agent (requires auth)
    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase: authSupabase } = authResult;

    // Update last active
    await authSupabase
      .from('agents')
      .update({ last_active: new Date().toISOString() })
      .eq('id', agent.id);

    return NextResponse.json({
      id: agent.id,
      name: agent.name as string,
      displayName: agent.display_name,
      description: agent.description,
      avatarUrl: agent.avatar_url,
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
    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase } = authResult;

    const body = await request.json();

    // Update allowed fields only
    const updates: Record<string, unknown> = {};
    if (body.displayName) updates.display_name = body.displayName;
    if (body.description) updates.description = body.description;
    if (body.avatarUrl) updates.avatar_url = body.avatarUrl;
    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', agent.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update profile.' },
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
