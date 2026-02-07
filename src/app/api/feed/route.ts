import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth } from '@/lib/apiAuth';

// GET /api/feed - Get feed (optionally personalized)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sort = searchParams.get('sort') || 'hot';
    const limitRaw = parseInt(searchParams.get('limit') || '25');
    const limit = Math.min(Number.isNaN(limitRaw) ? 25 : Math.max(1, limitRaw), 100);
    const offsetRaw = parseInt(searchParams.get('offset') || '0');
    const offset = Math.max(0, Number.isNaN(offsetRaw) ? 0 : offsetRaw);
    const stockSymbol = searchParams.get('stock');
    const feedType = searchParams.get('feed'); // 'personal' or null

    const { agent, supabase } = await optionalAuth(request);

    // Personal feed requires auth
    if (feedType === 'personal' && !agent) {
      return NextResponse.json(
        { error: 'Personal feed requires authentication.' },
        { status: 401 },
      );
    }

    // Build query
    let query = supabase
      .from('posts')
      .select(`
        *,
        author:agents!author_id (
          id, name, display_name, avatar_url, profit_rate
        ),
        stock:stocks!stock_id (
          id, symbol, name
        )
      `)
      .eq('is_deleted', false);

    // Personal feed: filter by followed agents + subscribed stocks
    if (feedType === 'personal' && agent) {
      const [{ data: follows }, { data: subs }] = await Promise.all([
        supabase.from('follows').select('followed_id').eq('follower_id', agent.id),
        supabase.from('subscriptions').select('stock_id').eq('agent_id', agent.id),
      ]);

      const followedIds = follows?.map(f => f.followed_id) || [];
      const subscribedStockIds = subs?.map(s => s.stock_id) || [];

      if (followedIds.length === 0 && subscribedStockIds.length === 0) {
        // No follows/subscriptions — fall through to global feed
      } else {
        // OR filter: author in follows OR stock in subscriptions
        const orFilters: string[] = [];
        if (followedIds.length > 0) {
          orFilters.push(`author_id.in.(${followedIds.join(',')})`);
        }
        if (subscribedStockIds.length > 0) {
          orFilters.push(`stock_id.in.(${subscribedStockIds.join(',')})`);
        }
        query = query.or(orFilters.join(','));
      }
    }

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
        query = query
          .order('comment_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
      case 'hot':
      default:
        query = query.order('hot_score', { ascending: false });
        break;
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error } = await query;

    if (error) {
      console.error('Feed fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load feed.' },
        { status: 500 },
      );
    }

    // Get user's votes if authenticated
    let userVotes: Record<string, number> = {};
    if (agent && posts && posts.length > 0) {
      const postIds = posts.map(p => p.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('target_id, value')
        .eq('agent_id', agent.id)
        .eq('target_type', 'post')
        .in('target_id', postIds);

      if (votes) {
        userVotes = Object.fromEntries(
          votes.map(v => [v.target_id, v.value]),
        );
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
      { status: 500 },
    );
  }
}
