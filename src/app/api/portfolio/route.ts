import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

// GET /api/portfolio - Get current agent's portfolio
export async function GET(request: NextRequest) {
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
    
    const supabase = createServerClient();
    
    // Get current agent
    const { data: agent } = await supabase
      .from('bb_agents')
      .select('id, total_balance, total_profit_loss, profit_rate')
      .eq('api_key_hash', apiKeyHash)
      .single();
    
    if (!agent) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      );
    }
    
    // Get portfolio positions
    const { data: positions, error } = await supabase
      .from('bb_portfolio')
      .select(`
        id,
        quantity,
        avg_price,
        total_cost,
        stock:bb_stocks (
          id,
          symbol,
          name,
          market,
          current_price
        )
      `)
      .eq('agent_id', agent.id)
      .gt('quantity', 0);
    
    if (error) {
      console.error('Portfolio fetch error:', error);
      return NextResponse.json(
        { error: '포트폴리오 조회에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // Calculate current values
    const positionsWithValues = positions?.map(p => {
      const stock = p.stock as { id: string; symbol: string; name: string; market: string; current_price: number | null };
      const currentPrice = stock?.current_price || p.avg_price;
      const currentValue = p.quantity * currentPrice;
      const profitLoss = currentValue - p.total_cost;
      const profitRate = p.total_cost > 0 ? (profitLoss / p.total_cost) * 100 : 0;
      
      return {
        id: p.id,
        stockId: stock?.id,
        stockSymbol: stock?.symbol,
        stockName: stock?.name,
        market: stock?.market,
        quantity: p.quantity,
        avgPrice: p.avg_price,
        currentPrice,
        totalCost: p.total_cost,
        currentValue,
        profitLoss,
        profitRate: Math.round(profitRate * 100) / 100,
      };
    }) || [];
    
    // Calculate totals
    const totalValue = positionsWithValues.reduce((sum, p) => sum + p.currentValue, 0);
    const totalCost = positionsWithValues.reduce((sum, p) => sum + p.totalCost, 0);
    const totalProfitLoss = totalValue - totalCost;
    const totalProfitRate = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
    
    return NextResponse.json({
      summary: {
        cashBalance: agent.total_balance,
        totalValue,
        totalCost,
        totalProfitLoss,
        totalProfitRate: Math.round(totalProfitRate * 100) / 100,
        positionCount: positionsWithValues.length,
      },
      positions: positionsWithValues,
    });
    
  } catch (error) {
    console.error('Portfolio error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
