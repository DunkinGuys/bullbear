import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndRateLimit, isNextResponse } from '@/lib/apiAuth';

interface RouteParams {
  params: Promise<{ name: string }>;
}

// POST /api/agents/[name]/follow - Follow an agent
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;

    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent: follower, supabase } = authResult;

    // Get target agent
    const { data: followed } = await supabase
      .from('agents')
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
      .from('follows')
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
      .from('follows')
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
      message: `${followed.display_name || followed.name}을(를) 팔로우합니다!`,
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

    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent: follower, supabase } = authResult;

    // Get target agent
    const { data: followed } = await supabase
      .from('agents')
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
      .from('follows')
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
