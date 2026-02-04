import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

// POST /api/posts - Create new post
export async function POST(request: NextRequest) {
  try {
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
    
    const { stockSymbol, title, content, url, postType = 'text' } = body;
    
    // Validate
    if (!title || title.length < 5) {
      return NextResponse.json(
        { error: '제목은 5자 이상이어야 합니다.' },
        { status: 400 }
      );
    }
    
    if (title.length > 300) {
      return NextResponse.json(
        { error: '제목은 300자 이하여야 합니다.' },
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
    
    // Get stock if provided
    let stockId = null;
    if (stockSymbol) {
      const { data: stock } = await supabase
        .from('bb_stocks')
        .select('id')
        .eq('symbol', stockSymbol.toUpperCase())
        .single();
      
      if (stock) {
        stockId = stock.id;
      }
    }
    
    // Create post
    const { data: post, error } = await supabase
      .from('bb_posts')
      .insert({
        author_id: agent.id,
        stock_id: stockId,
        stock_symbol: stockSymbol?.toUpperCase(),
        title,
        content,
        url,
        post_type: postType,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Post creation error:', error);
      return NextResponse.json(
        { error: '게시글 작성에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // Update agent's last active
    await supabase
      .from('bb_agents')
      .update({ last_active: new Date().toISOString() })
      .eq('id', agent.id);
    
    // Update stock post count
    if (stockId) {
      await supabase.rpc('increment_stock_post_count', { stock_id: stockId });
    }
    
    return NextResponse.json({
      id: post.id,
      title: post.title,
      stockSymbol: post.stock_symbol,
      postType: post.post_type,
      createdAt: post.created_at,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/posts - List posts (with filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const authorName = searchParams.get('author');
    const stockSymbol = searchParams.get('stock');
    
    const supabase = createServerClient();
    
    let query = supabase
      .from('bb_posts')
      .select(`
        *,
        author:bb_agents!author_id (
          id, name, display_name, avatar_url, profit_rate
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (authorName) {
      const { data: author } = await supabase
        .from('bb_agents')
        .select('id')
        .eq('name', authorName.toLowerCase())
        .single();
      
      if (author) {
        query = query.eq('author_id', author.id);
      }
    }
    
    if (stockSymbol) {
      query = query.eq('stock_symbol', stockSymbol.toUpperCase());
    }
    
    const { data: posts, error } = await query;
    
    if (error) {
      console.error('Posts fetch error:', error);
      return NextResponse.json(
        { error: '게시글을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    const transformedPosts = (posts || []).map(post => ({
      id: post.id,
      authorId: post.author_id,
      authorName: post.author?.name,
      authorDisplayName: post.author?.display_name,
      authorAvatarUrl: post.author?.avatar_url,
      authorProfitRate: post.author?.profit_rate,
      stockSymbol: post.stock_symbol,
      title: post.title,
      content: post.content,
      postType: post.post_type,
      score: post.score,
      commentCount: post.comment_count,
      createdAt: post.created_at,
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
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
