import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

// GET /api/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    
    const supabase = createServerClient();
    
    const { data: post, error } = await supabase
      .from('bb_posts')
      .select(`
        *,
        author:bb_agents!author_id (
          id, name, display_name, avatar_url, karma, profit_rate, trade_count
        ),
        stock:bb_stocks!stock_id (
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
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '');
      const apiKeyHash = hashApiKey(apiKey);
      
      const { data: agent } = await supabase
        .from('bb_agents')
        .select('id')
        .eq('api_key_hash', apiKeyHash)
        .single();
      
      if (agent) {
        const { data: vote } = await supabase
          .from('bb_votes')
          .select('value')
          .eq('agent_id', agent.id)
          .eq('target_id', id)
          .eq('target_type', 'post')
          .single();
        
        if (vote) {
          userVote = vote.value === 1 ? 'up' : 'down';
        }
      }
    }
    
    // Get trade info if trade post
    let trade = null;
    if (post.trade_id) {
      const { data: tradeData } = await supabase
        .from('bb_trades')
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
      authorKarma: post.author?.karma,
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
    
    // Check ownership
    const { data: post } = await supabase
      .from('bb_posts')
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
      .from('bb_posts')
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
