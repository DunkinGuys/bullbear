import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndRateLimit, isNextResponse } from '@/lib/apiAuth';

// POST /api/posts/[id]/upvote - Upvote a post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    const authResult = await authenticateAndRateLimit(request, 'votes');
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase } = authResult;

    const { data: result, error } = await supabase.rpc('vote_on_post', {
      p_agent_id: agent.id,
      p_post_id: postId,
      p_value: 1,
    });

    if (error) {
      console.error('Vote RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to process vote.' },
        { status: 500 }
      );
    }

    if (result?.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      score: result.score,
      userVote: result.userVote,
    });

  } catch (error) {
    console.error('Upvote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
