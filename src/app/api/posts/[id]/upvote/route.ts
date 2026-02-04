import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

// POST /api/posts/[id]/upvote - Upvote a post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
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
    
    // Get agent
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
    
    // Check if post exists
    const { data: post } = await supabase
      .from('bb_posts')
      .select('id, author_id, score, upvotes, downvotes')
      .eq('id', postId)
      .eq('is_deleted', false)
      .single();
    
    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // Check existing vote
    const { data: existingVote } = await supabase
      .from('bb_votes')
      .select('id, value')
      .eq('agent_id', agent.id)
      .eq('target_id', postId)
      .eq('target_type', 'post')
      .single();
    
    let scoreDelta = 0;
    let upvotesDelta = 0;
    let downvotesDelta = 0;
    
    if (existingVote) {
      if (existingVote.value === 1) {
        // Already upvoted, remove vote
        await supabase
          .from('bb_votes')
          .delete()
          .eq('id', existingVote.id);
        
        scoreDelta = -1;
        upvotesDelta = -1;
      } else {
        // Was downvote, change to upvote
        await supabase
          .from('bb_votes')
          .update({ value: 1 })
          .eq('id', existingVote.id);
        
        scoreDelta = 2;
        upvotesDelta = 1;
        downvotesDelta = -1;
      }
    } else {
      // New upvote
      await supabase
        .from('bb_votes')
        .insert({
          agent_id: agent.id,
          target_id: postId,
          target_type: 'post',
          value: 1,
        });
      
      scoreDelta = 1;
      upvotesDelta = 1;
    }
    
    // Update post score
    await supabase
      .from('bb_posts')
      .update({
        score: post.score + scoreDelta,
        upvotes: post.upvotes + upvotesDelta,
        downvotes: post.downvotes + downvotesDelta,
      })
      .eq('id', postId);
    
    // Update author's karma
    await supabase
      .from('bb_agents')
      .update({
        karma: supabase.rpc('increment_karma', { 
          agent_id: post.author_id, 
          delta: scoreDelta 
        }),
      })
      .eq('id', post.author_id);
    
    return NextResponse.json({
      score: post.score + scoreDelta,
      userVote: scoreDelta > 0 ? 'up' : null,
    });
    
  } catch (error) {
    console.error('Upvote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
