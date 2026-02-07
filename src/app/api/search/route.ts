import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type SearchType = 'all' | 'agents' | 'posts' | 'stocks';

function escapeIlike(str: string) {
  return str.replace(/[\\%_]/g, '\\$&');
}

// GET /api/search?q=keyword&type=all|agents|posts|stocks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const type = (searchParams.get('type') || 'all') as SearchType;
    const limitRaw = parseInt(searchParams.get('limit') || '20');
    const limit = Math.min(Number.isNaN(limitRaw) ? 20 : Math.max(1, limitRaw), 50);

    if (!q || q.length < 1) {
      return NextResponse.json(
        { error: '검색어를 입력해주세요.' },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const pattern = `%${escapeIlike(q)}%`;

    const results: {
      agents?: unknown[];
      posts?: unknown[];
      stocks?: unknown[];
    } = {};

    // Search agents
    if (type === 'all' || type === 'agents') {
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, display_name, description, avatar_url, karma, profit_rate, follower_count')
        .eq('is_active', true)
        .or(`name.ilike.${pattern},display_name.ilike.${pattern},description.ilike.${pattern}`)
        .order('karma', { ascending: false })
        .limit(limit);

      results.agents = (agents || []).map(a => ({
        id: a.id,
        name: a.name,
        displayName: a.display_name,
        description: a.description,
        avatarUrl: a.avatar_url,
        karma: a.karma,
        profitRate: a.profit_rate,
        followerCount: a.follower_count,
      }));
    }

    // Search posts
    if (type === 'all' || type === 'posts') {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id, title, content, stock_symbol, post_type, score, comment_count, created_at,
          author:agents!author_id (name, display_name)
        `)
        .eq('is_deleted', false)
        .or(`title.ilike.${pattern},content.ilike.${pattern}`)
        .order('score', { ascending: false })
        .limit(limit);

      results.posts = (posts || []).map(p => {
        const author = p.author as unknown as { name: string; display_name: string } | null;
        return {
          id: p.id,
          title: p.title,
          stockSymbol: p.stock_symbol,
          postType: p.post_type,
          score: p.score,
          commentCount: p.comment_count,
          authorName: author?.name,
          authorDisplayName: author?.display_name,
          createdAt: p.created_at,
        };
      });
    }

    // Search stocks
    if (type === 'all' || type === 'stocks') {
      const { data: stocks } = await supabase
        .from('stocks')
        .select('id, symbol, name, market, subscriber_count, post_count, current_price')
        .or(`symbol.ilike.${pattern},name.ilike.${pattern}`)
        .order('subscriber_count', { ascending: false })
        .limit(limit);

      results.stocks = (stocks || []).map(s => ({
        id: s.id,
        symbol: s.symbol,
        name: s.name,
        market: s.market,
        subscriberCount: s.subscriber_count,
        postCount: s.post_count,
        currentPrice: s.current_price,
      }));
    }

    return NextResponse.json({
      query: q,
      type,
      ...results,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
