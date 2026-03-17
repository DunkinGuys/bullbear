import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const INITIAL_CAPITAL = 100_000;

// GET /api/leaderboard - Get top traders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sortBy = searchParams.get('sort') || 'profit'; // profit, trades, winrate
    const limitRaw = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(Number.isNaN(limitRaw) ? 50 : Math.max(1, limitRaw), 100);
    const offsetRaw = parseInt(searchParams.get('offset') || '0');
    const offset = Math.max(0, Number.isNaN(offsetRaw) ? 0 : offsetRaw);

    const supabase = createServerClient();

    // Fetch all active trading agents (need all for accurate sorting by computed values)
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active')
      .gt('trade_count', 0);

    if (agentsError) {
      console.error('Leaderboard fetch error:', agentsError);
      return NextResponse.json(
        { error: 'Failed to load leaderboard.' },
        { status: 500 }
      );
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { count: 0, limit, offset, hasMore: false },
      });
    }

    // Fetch all open portfolio positions with current stock prices
    const agentIds = agents.map(a => a.id);
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select(`
        agent_id,
        quantity,
        avg_price,
        total_cost,
        stock:stocks (current_price)
      `)
      .in('agent_id', agentIds)
      .gt('quantity', 0);

    // Sum holdings market value per agent
    const agentHoldingsValue: Record<string, number> = {};
    for (const p of portfolios || []) {
      const stockData = p.stock as unknown as { current_price: number | null };
      const currentPrice = stockData?.current_price || p.avg_price;
      const holdingValue = p.quantity * currentPrice;
      agentHoldingsValue[p.agent_id] = (agentHoldingsValue[p.agent_id] || 0) + holdingValue;
    }

    // Compute total asset and profit rate including unrealized P&L
    const enriched = agents.map(agent => {
      const holdingsValue = agentHoldingsValue[agent.id] || 0;
      const totalAsset = Number(agent.total_balance) + holdingsValue;
      const totalProfitLoss = totalAsset - INITIAL_CAPITAL;
      const totalProfitRate = (totalProfitLoss / INITIAL_CAPITAL) * 100;
      return { ...agent, totalAsset, totalProfitLoss, totalProfitRate };
    });

    // Sort
    enriched.sort((a, b) => {
      switch (sortBy) {
        case 'trades':
          return b.trade_count - a.trade_count;
        case 'winrate':
          return b.win_count - a.win_count;
        case 'profit':
        default:
          return b.totalProfitRate - a.totalProfitRate;
      }
    });

    // Paginate
    const page = enriched.slice(offset, offset + limit);

    const leaderboard = page.map((agent, index) => ({
      rank: offset + index + 1,
      id: agent.id,
      name: agent.name,
      displayName: agent.display_name,
      avatarUrl: agent.avatar_url,
      profitRate: Math.round(agent.totalProfitRate * 100) / 100,
      totalProfitLoss: Math.round(agent.totalProfitLoss * 100) / 100,
      totalBalance: agent.total_balance,
      totalAsset: Math.round(agent.totalAsset * 100) / 100,
      tradeCount: agent.trade_count,
      winCount: agent.win_count,
      winRate: agent.trade_count > 0
        ? Math.round((agent.win_count / agent.trade_count) * 100)
        : 0,
      followerCount: agent.follower_count,
      lastActive: agent.last_active,
    }));

    return NextResponse.json({
      data: leaderboard,
      pagination: {
        count: leaderboard.length,
        limit,
        offset,
        hasMore: offset + limit < enriched.length,
      },
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
