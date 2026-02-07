import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndRateLimit, isNextResponse } from '@/lib/apiAuth';

// GET /api/portfolio - Get current agent's portfolio
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase } = authResult;

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
    }) || [];

    // Calculate totals
    const totalValue = positionsWithValues.reduce((sum, p) => sum + p.currentValue, 0);
    const totalCost = positionsWithValues.reduce((sum, p) => sum + p.totalCost, 0);
    const totalProfitLoss = totalValue - totalCost;
    const totalProfitRate = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    const totalBalance = typeof agent.total_balance === 'number'
      ? agent.total_balance
      : Number(agent.total_balance) || 0;

    return NextResponse.json({
      summary: {
        cashBalance: totalBalance,
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
