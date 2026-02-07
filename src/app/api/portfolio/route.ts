import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authenticateAndRateLimit, isNextResponse } from '@/lib/apiAuth';

// GET /api/portfolio - Get portfolio (own or other agent's)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agent');

    const supabase = createServerClient();
    let agentId: string;
    let cashBalance: number;

    if (agentName) {
      // Public: view another agent's portfolio
      const { data: target } = await supabase
        .from('agents')
        .select('id, total_balance')
        .eq('name', agentName.toLowerCase())
        .single();

      if (!target) {
        return NextResponse.json(
          { error: '에이전트를 찾을 수 없습니다.' },
          { status: 404 },
        );
      }

      agentId = target.id;
      cashBalance = Number(target.total_balance) || 0;
    } else {
      // Private: view own portfolio (requires auth)
      const authResult = await authenticateAndRateLimit(request, 'requests');
      if (isNextResponse(authResult)) return authResult;

      agentId = authResult.agent.id as string;
      cashBalance = Number(authResult.agent.total_balance) || 0;
    }

    // Get portfolio positions
    const { data: positions, error } = await supabase
      .from('portfolios')
      .select(`
        id,
        quantity,
        avg_price,
        total_cost,
        stock:stocks (
          id,
          symbol,
          name,
          market,
          current_price
        )
      `)
      .eq('agent_id', agentId)
      .gt('quantity', 0);

    if (error) {
      console.error('Portfolio fetch error:', error);
      return NextResponse.json(
        { error: '포트폴리오 조회에 실패했습니다.' },
        { status: 500 },
      );
    }

    // Calculate current values
    const positionsWithValues = (positions || []).map(p => {
      const stockData = p.stock as unknown as { id: string; symbol: string; name: string; market: string; current_price: number | null };
      const currentPrice = stockData?.current_price || p.avg_price;
      const currentValue = p.quantity * currentPrice;
      const profitLoss = currentValue - p.total_cost;
      const profitRate = p.total_cost > 0 ? (profitLoss / p.total_cost) * 100 : 0;

      return {
        id: p.id,
        stockId: stockData?.id,
        stockSymbol: stockData?.symbol,
        stockName: stockData?.name,
        market: stockData?.market,
        quantity: p.quantity,
        avgPrice: p.avg_price,
        currentPrice,
        totalCost: p.total_cost,
        currentValue,
        profitLoss,
        profitRate: Math.round(profitRate * 100) / 100,
      };
    });

    // Calculate totals
    const totalValue = positionsWithValues.reduce((sum, p) => sum + p.currentValue, 0);
    const totalCost = positionsWithValues.reduce((sum, p) => sum + p.totalCost, 0);
    const totalProfitLoss = totalValue - totalCost;
    const totalProfitRate = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    return NextResponse.json({
      summary: {
        cashBalance,
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
      { status: 500 },
    );
  }
}
