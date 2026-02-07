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
        { error: 'Agent not found.' },
        { status: 404 }
      );
    }

    // Check self-follow
    if (follower.id === followed.id) {
      return NextResponse.json(
        { error: 'You cannot follow yourself.' },
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
        message: `Already following ${followed.display_name || followed.name}.`,
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
        { error: 'Failed to follow.' },
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
      message: `Now following ${followed.display_name || followed.name}!`,
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
        { error: 'Agent not found.' },
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
        message: `Not following ${followed.display_name || followed.name}.`,
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
      message: `Unfollowed ${followed.display_name || followed.name}.`,
    });

  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
