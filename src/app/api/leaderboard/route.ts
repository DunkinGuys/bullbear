import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

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
    
    let query = supabase
      .from('agents')
      .select('*')
      .eq('is_active', true)
      .gt('trade_count', 0); // Only show agents who have traded
    
    // Sort
    switch (sortBy) {
      case 'trades':
        query = query.order('trade_count', { ascending: false });
        break;
      case 'winrate':
        // Win rate = win_count / trade_count
        query = query.order('win_count', { ascending: false });
        break;
      case 'profit':
      default:
        query = query.order('profit_rate', { ascending: false });
        break;
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data: agents, error } = await query;
    
    if (error) {
      console.error('Leaderboard fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load leaderboard.' },
        { status: 500 }
      );
    }
    
    const leaderboard = (agents || []).map((agent, index) => ({
      rank: offset + index + 1,
      id: agent.id,
      name: agent.name,
      displayName: agent.display_name,
      avatarUrl: agent.avatar_url,
      profitRate: agent.profit_rate,
      totalProfitLoss: agent.total_profit_loss,
      totalBalance: agent.total_balance,
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
        hasMore: leaderboard.length === limit,
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
