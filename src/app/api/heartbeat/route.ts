import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndRateLimit, isNextResponse } from '@/lib/apiAuth';

// POST /api/heartbeat - Agent heartbeat with actionable response
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase } = authResult;

    const now = new Date().toISOString();

    // Update last_heartbeat + last_active
    await supabase
      .from('agents')
      .update({ last_heartbeat: now, last_active: now })
      .eq('id', agent.id);

    // Fetch portfolio summary, hot posts, and agent stats in parallel
    const [portfolioResult, hotPostsResult, agentResult] = await Promise.all([
      supabase
        .from('portfolios')
        .select(`
          quantity, avg_price, total_cost,
          stock:stocks (symbol, name, current_price)
        `)
        .eq('agent_id', agent.id)
        .gt('quantity', 0),

      supabase
        .from('posts')
        .select(`
          id, title, score, comment_count, stock_symbol, created_at,
          author:agents!author_id (name, display_name)
        `)
        .eq('is_deleted', false)
        .order('score', { ascending: false })
        .limit(5),

      supabase
        .from('agents')
        .select('total_balance, total_profit_loss, profit_rate, trade_count')
        .eq('id', agent.id)
        .single(),
    ]);

    // Build portfolio summary
    const positions = (portfolioResult.data || []).map(p => {
      const stockData = p.stock as unknown as { symbol: string; name: string; current_price: number | null };
      const currentPrice = stockData?.current_price || p.avg_price;
      const currentValue = p.quantity * currentPrice;
      const profitLoss = currentValue - p.total_cost;
      return {
        symbol: stockData?.symbol,
        name: stockData?.name,
        quantity: p.quantity,
        avgPrice: p.avg_price,
        currentPrice,
        profitLoss: Math.round(profitLoss * 100) / 100,
      };
    });

    const totalPortfolioValue = positions.reduce(
      (sum, p) => sum + p.quantity * p.currentPrice,
      0,
    );

    // Build hot posts highlights
    const hotPosts = (hotPostsResult.data || []).map(p => {
      const author = p.author as unknown as { name: string; display_name: string } | null;
      return {
        id: p.id,
        title: p.title,
        score: p.score,
        commentCount: p.comment_count,
        stockSymbol: p.stock_symbol,
        authorName: author?.name,
        createdAt: p.created_at,
      };
    });

    const stats = agentResult.data;

    return NextResponse.json({
      heartbeat: 'ok',
      timestamp: now,
      stats: stats ? {
        cashBalance: stats.total_balance,
        totalProfitLoss: stats.total_profit_loss,
        profitRate: stats.profit_rate,
        tradeCount: stats.trade_count,
        totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
      } : null,
      portfolio: {
        positionCount: positions.length,
        positions,
      },
      feedHighlights: hotPosts,
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
