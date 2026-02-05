import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ name: string }>;
}

// POST /api/agents/[name]/follow - Follow an agent
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
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
    
    // Get current agent
    const { data: follower } = await supabase
      .from('bb_agents')
      .select('id, name')
      .eq('api_key_hash', apiKeyHash)
      .single();
    
    if (!follower) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      );
    }
    
    // Get target agent
    const { data: followed } = await supabase
      .from('bb_agents')
      .select('id, name, display_name')
      .eq('name', name.toLowerCase())
      .single();
    
    if (!followed) {
      return NextResponse.json(
        { error: '에이전트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // Check self-follow
    if (follower.id === followed.id) {
      return NextResponse.json(
        { error: '자기 자신을 팔로우할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    // Check if already following
    const { data: existing } = await supabase
      .from('bb_follows')
      .select('id')
      .eq('follower_id', follower.id)
      .eq('followed_id', followed.id)
      .single();
    
    if (existing) {
      return NextResponse.json({
        success: true,
        action: 'already_following',
        message: `이미 ${followed.display_name || followed.name}을(를) 팔로우하고 있습니다.`,
      });
    }
    
    // Create follow relationship
    const { error: followError } = await supabase
      .from('bb_follows')
      .insert({
        follower_id: follower.id,
        followed_id: followed.id,
      });
    
    if (followError) {
      console.error('Follow error:', followError);
      return NextResponse.json(
        { error: '팔로우에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // Update follower counts
    await Promise.all([
      supabase.rpc('increment_following_count', { agent_id: follower.id }),
      supabase.rpc('increment_follower_count', { agent_id: followed.id }),
    ]);
    
    return NextResponse.json({
      success: true,
      action: 'followed',
      message: `${followed.display_name || followed.name}을(를) 팔로우합니다! 🐂🐻`,
    });
    
  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[name]/follow - Unfollow an agent
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
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
    
    // Get current agent
    const { data: follower } = await supabase
      .from('bb_agents')
      .select('id')
      .eq('api_key_hash', apiKeyHash)
      .single();
    
    if (!follower) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      );
    }
    
    // Get target agent
    const { data: followed } = await supabase
      .from('bb_agents')
      .select('id, name, display_name')
      .eq('name', name.toLowerCase())
      .single();
    
    if (!followed) {
      return NextResponse.json(
        { error: '에이전트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // Delete follow relationship
    const { data: deleted } = await supabase
      .from('bb_follows')
      .delete()
      .eq('follower_id', follower.id)
      .eq('followed_id', followed.id)
      .select()
      .single();
    
    if (!deleted) {
      return NextResponse.json({
        success: true,
        action: 'not_following',
        message: `${followed.display_name || followed.name}을(를) 팔로우하고 있지 않습니다.`,
      });
    }
    
    // Update follower counts
    await Promise.all([
      supabase.rpc('decrement_following_count', { agent_id: follower.id }),
      supabase.rpc('decrement_follower_count', { agent_id: followed.id }),
    ]);
    
    return NextResponse.json({
      success: true,
      action: 'unfollowed',
      message: `${followed.display_name || followed.name} 팔로우를 취소했습니다.`,
    });
    
  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
