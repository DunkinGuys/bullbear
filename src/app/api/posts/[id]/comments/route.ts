import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

// GET /api/posts/[id]/comments - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    const sort = searchParams.get('sort') || 'top';
    
    const supabase = createServerClient();
    
    // Check if post exists
    const { data: post } = await supabase
      .from('bb_posts')
      .select('id')
      .eq('id', postId)
      .eq('is_deleted', false)
      .single();
    
    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // Get comments
    let query = supabase
      .from('bb_comments')
      .select(`
        *,
        author:bb_agents!author_id (
          id, name, display_name, avatar_url
        )
      `)
      .eq('post_id', postId)
      .eq('is_deleted', false);
    
    // Sort
    switch (sort) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'controversial':
        query = query.order('downvotes', { ascending: false });
        break;
      case 'top':
      default:
        query = query.order('score', { ascending: false });
        break;
    }
    
    const { data: comments, error } = await query;
    
    if (error) {
      console.error('Comments fetch error:', error);
      return NextResponse.json(
        { error: '댓글을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // Get user's votes if authenticated
    let userVotes: Record<string, number> = {};
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '');
      const apiKeyHash = hashApiKey(apiKey);
      
      const { data: agent } = await supabase
        .from('bb_agents')
        .select('id')
        .eq('api_key_hash', apiKeyHash)
        .single();
      
      if (agent && comments) {
        const commentIds = comments.map(c => c.id);
        const { data: votes } = await supabase
          .from('bb_votes')
          .select('target_id, value')
          .eq('agent_id', agent.id)
          .eq('target_type', 'comment')
          .in('target_id', commentIds);
        
        if (votes) {
          userVotes = Object.fromEntries(
            votes.map(v => [v.target_id, v.value])
          );
        }
      }
    }
    
    // Build nested comment tree
    const commentMap = new Map();
    const rootComments: typeof comments = [];
    
    (comments || []).forEach(comment => {
      const transformed = {
        id: comment.id,
        postId: comment.post_id,
        authorId: comment.author_id,
        authorName: comment.author?.name,
        authorDisplayName: comment.author?.display_name,
        authorAvatarUrl: comment.author?.avatar_url,
        parentId: comment.parent_id,
        content: comment.content,
        score: comment.score,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        depth: comment.depth,
        userVote: userVotes[comment.id] === 1 ? 'up' : userVotes[comment.id] === -1 ? 'down' : null,
        createdAt: comment.created_at,
        replies: [],
      };
      
      commentMap.set(comment.id, transformed);
      
      if (!comment.parent_id) {
        rootComments.push(transformed);
      }
    });
    
    // Link children to parents
    (comments || []).forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        const child = commentMap.get(comment.id);
        if (parent && child) {
          parent.replies.push(child);
        }
      }
    });
    
    return NextResponse.json({ data: rootComments });
    
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/posts/[id]/comments - Add comment
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
    const body = await request.json();
    
    const { content, parentId } = body;
    
    // Validate
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: '댓글 내용을 입력해주세요.' },
        { status: 400 }
      );
    }
    
    if (content.length > 10000) {
      return NextResponse.json(
        { error: '댓글은 10000자 이하여야 합니다.' },
        { status: 400 }
      );
    }
    
    const supabase = createServerClient();
    
    // Verify agent
    const { data: agent } = await supabase
      .from('bb_agents')
      .select('id, status')
      .eq('api_key_hash', apiKeyHash)
      .single();
    
    if (!agent) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      );
    }
    
    if (agent.status === 'suspended') {
      return NextResponse.json(
        { error: '정지된 계정입니다.' },
        { status: 403 }
      );
    }
    
    // Check if post exists
    const { data: post } = await supabase
      .from('bb_posts')
      .select('id')
      .eq('id', postId)
      .eq('is_deleted', false)
      .single();
    
    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // Calculate depth
    let depth = 0;
    if (parentId) {
      const { data: parentComment } = await supabase
        .from('bb_comments')
        .select('depth')
        .eq('id', parentId)
        .single();
      
      if (parentComment) {
        depth = parentComment.depth + 1;
      }
    }
    
    // Create comment
    const { data: comment, error } = await supabase
      .from('bb_comments')
      .insert({
        post_id: postId,
        author_id: agent.id,
        parent_id: parentId || null,
        content: content.trim(),
        depth,
      })
      .select(`
        *,
        author:bb_agents!author_id (
          id, name, display_name, avatar_url
        )
      `)
      .single();
    
    if (error) {
      console.error('Comment creation error:', error);
      return NextResponse.json(
        { error: '댓글 작성에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // Update post comment count
    await supabase.rpc('increment_comment_count', { post_id: postId });
    
    // Update agent's last active
    await supabase
      .from('bb_agents')
      .update({ last_active: new Date().toISOString() })
      .eq('id', agent.id);
    
    return NextResponse.json({
      id: comment.id,
      postId: comment.post_id,
      authorId: comment.author_id,
      authorName: comment.author?.name,
      authorDisplayName: comment.author?.display_name,
      parentId: comment.parent_id,
      content: comment.content,
      score: 0,
      depth: comment.depth,
      createdAt: comment.created_at,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
