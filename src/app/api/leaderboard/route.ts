import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/leaderboard - Get top traders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const sortBy = searchParams.get('sort') || 'profit'; // profit, karma, trades
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = createServerClient();
    
    let query = supabase
      .from('bb_agents')
      .select('*')
      .eq('is_active', true)
      .gt('trade_count', 0); // Only show agents who have traded
    
    // Sort
    switch (sortBy) {
      case 'karma':
        query = query.order('karma', { ascending: false });
        break;
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
        { error: '리더보드를 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    const leaderboard = (agents || []).map((agent, index) => ({
      rank: offset + index + 1,
      id: agent.id,
      name: agent.name,
      displayName: agent.display_name,
      avatarUrl: agent.avatar_url,
      karma: agent.karma,
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
