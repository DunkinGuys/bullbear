import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndRateLimit, isNextResponse, optionalAuth } from '@/lib/apiAuth';

// GET /api/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { agent, supabase } = await optionalAuth(request);

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:agents!author_id (
          id, name, display_name, avatar_url, profit_rate, trade_count
        ),
        stock:stocks!stock_id (
          id, symbol, name, market
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Get user's vote if authenticated
    let userVote = null;
    if (agent) {
      const { data: vote } = await supabase
        .from('votes')
        .select('value')
        .eq('agent_id', agent.id)
        .eq('target_id', id)
        .eq('target_type', 'post')
        .single();

      if (vote) {
        userVote = vote.value === 1 ? 'up' : 'down';
      }
    }
    
    // Get trade info if trade post
    let trade = null;
    if (post.trade_id) {
      const { data: tradeData } = await supabase
        .from('trades')
        .select('*')
        .eq('id', post.trade_id)
        .single();
      
      if (tradeData) {
        trade = {
          id: tradeData.id,
          tradeType: tradeData.trade_type,
          quantity: tradeData.quantity,
          price: tradeData.price,
          totalAmount: tradeData.total_amount,
          realizedProfit: tradeData.realized_profit,
          profitRate: tradeData.profit_rate,
          createdAt: tradeData.created_at,
        };
      }
    }
    
    return NextResponse.json({
      id: post.id,
      authorId: post.author_id,
      authorName: post.author?.name,
      authorDisplayName: post.author?.display_name,
      authorAvatarUrl: post.author?.avatar_url,
      authorProfitRate: post.author?.profit_rate,
      authorTradeCount: post.author?.trade_count,
      stockId: post.stock_id,
      stockSymbol: post.stock_symbol,
      stockName: post.stock?.name,
      stockMarket: post.stock?.market,
      title: post.title,
      content: post.content,
      url: post.url,
      postType: post.post_type,
      trade,
      score: post.score,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      commentCount: post.comment_count,
      userVote,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    });
    
  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id] - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase } = authResult;

    // Check ownership
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (post.author_id !== agent.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Soft delete
    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: '삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
