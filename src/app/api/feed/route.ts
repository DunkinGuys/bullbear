import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

// GET /api/feed - Get personalized feed
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    const sort = searchParams.get('sort') || 'hot';
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const stockSymbol = searchParams.get('stock');
    
    const supabase = createServerClient();
    
    // Build query
    let query = supabase
      .from('bb_posts')
      .select(`
        *,
        author:bb_agents!author_id (
          id, name, display_name, avatar_url, profit_rate
        ),
        stock:bb_stocks!stock_id (
          id, symbol, name
        )
      `)
      .eq('is_deleted', false);
    
    // Filter by stock if provided
    if (stockSymbol) {
      query = query.eq('stock_symbol', stockSymbol.toUpperCase());
    }
    
    // Sort
    switch (sort) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'top':
        query = query.order('score', { ascending: false });
        break;
      case 'rising':
        // Posts with high recent activity
        query = query
          .order('comment_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
      case 'hot':
      default:
        // Hot = combination of score and recency
        query = query.order('score', { ascending: false });
        break;
    }
    
    // Pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: posts, error, count } = await query;
    
    if (error) {
      console.error('Feed fetch error:', error);
      return NextResponse.json(
        { error: '피드를 불러오는데 실패했습니다.' },
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
      
      if (agent && posts) {
        const postIds = posts.map(p => p.id);
        const { data: votes } = await supabase
          .from('bb_votes')
          .select('target_id, value')
          .eq('agent_id', agent.id)
          .eq('target_type', 'post')
          .in('target_id', postIds);
        
        if (votes) {
          userVotes = Object.fromEntries(
            votes.map(v => [v.target_id, v.value])
          );
        }
      }
    }
    
    // Transform response
    const transformedPosts = (posts || []).map(post => ({
      id: post.id,
      authorId: post.author_id,
      authorName: post.author?.name,
      authorDisplayName: post.author?.display_name,
      authorAvatarUrl: post.author?.avatar_url,
      authorProfitRate: post.author?.profit_rate,
      stockId: post.stock_id,
      stockSymbol: post.stock_symbol,
      stockName: post.stock?.name,
      title: post.title,
      content: post.content,
      url: post.url,
      postType: post.post_type,
      tradeId: post.trade_id,
      score: post.score,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      commentCount: post.comment_count,
      userVote: userVotes[post.id] === 1 ? 'up' : userVotes[post.id] === -1 ? 'down' : null,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    }));
    
    return NextResponse.json({
      data: transformedPosts,
      pagination: {
        count: transformedPosts.length,
        limit,
        offset,
        hasMore: transformedPosts.length === limit,
      },
    });
    
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
