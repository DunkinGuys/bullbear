import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

// POST /api/trades - Execute a trade (buy or sell)
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
    
    const { stockSymbol, tradeType, quantity, price } = body;
    
    // Validate
    if (!stockSymbol) {
      return NextResponse.json(
        { error: '종목 심볼을 입력해주세요.' },
        { status: 400 }
      );
    }
    
    if (!['buy', 'sell'].includes(tradeType)) {
      return NextResponse.json(
        { error: '거래 유형은 buy 또는 sell이어야 합니다.' },
        { status: 400 }
      );
    }
    
    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: '수량은 1 이상이어야 합니다.' },
        { status: 400 }
      );
    }
    
    if (!price || price <= 0) {
      return NextResponse.json(
        { error: '가격을 입력해주세요.' },
        { status: 400 }
      );
    }
    
    const supabase = createServerClient();
    
    // Get agent
    const { data: agent } = await supabase
      .from('bb_agents')
      .select('*')
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
    
    // Get or create stock
    let { data: stock } = await supabase
      .from('bb_stocks')
      .select('*')
      .eq('symbol', stockSymbol.toUpperCase())
      .single();
    
    if (!stock) {
      // Create stock if not exists
      const { data: newStock, error: stockError } = await supabase
        .from('bb_stocks')
        .insert({
          symbol: stockSymbol.toUpperCase(),
          name: stockSymbol.toUpperCase(), // TODO: Fetch from API
          market: stockSymbol.length <= 5 ? 'NASDAQ' : 'KRX',
        })
        .select()
        .single();
      
      if (stockError) {
        return NextResponse.json(
          { error: '종목 생성에 실패했습니다.' },
          { status: 500 }
        );
      }
      stock = newStock;
    }
    
    const totalAmount = quantity * price;
    
    // Get current portfolio position
    const { data: portfolio } = await supabase
      .from('bb_portfolios')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('stock_id', stock.id)
      .single();
    
    if (tradeType === 'buy') {
      // Check balance
      if (agent.total_balance < totalAmount) {
        return NextResponse.json(
          { error: `잔고가 부족합니다. (필요: ${totalAmount.toLocaleString()}원, 보유: ${agent.total_balance.toLocaleString()}원)` },
          { status: 400 }
        );
      }
      
      // Create trade record
      const { data: trade, error: tradeError } = await supabase
        .from('bb_trades')
        .insert({
          agent_id: agent.id,
          stock_id: stock.id,
          stock_symbol: stock.symbol,
          trade_type: 'buy',
          quantity,
          price,
          total_amount: totalAmount,
        })
        .select()
        .single();
      
      if (tradeError) {
        return NextResponse.json(
          { error: '거래 기록에 실패했습니다.' },
          { status: 500 }
        );
      }
      
      // Update or create portfolio
      if (portfolio) {
        const newQuantity = portfolio.quantity + quantity;
        const newAvgPrice = Math.floor(
          (portfolio.avg_price * portfolio.quantity + price * quantity) / newQuantity
        );
        
        await supabase
          .from('bb_portfolios')
          .update({
            quantity: newQuantity,
            avg_price: newAvgPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', portfolio.id);
      } else {
        await supabase
          .from('bb_portfolios')
          .insert({
            agent_id: agent.id,
            stock_id: stock.id,
            stock_symbol: stock.symbol,
            quantity,
            avg_price: price,
          });
      }
      
      // Update agent balance
      await supabase
        .from('bb_agents')
        .update({
          total_balance: agent.total_balance - totalAmount,
          trade_count: agent.trade_count + 1,
          last_active: new Date().toISOString(),
        })
        .eq('id', agent.id);
      
      return NextResponse.json({
        id: trade.id,
        tradeType: 'buy',
        stockSymbol: stock.symbol,
        quantity,
        price,
        totalAmount,
        newBalance: agent.total_balance - totalAmount,
        message: `${stock.symbol} ${quantity}주를 ${price.toLocaleString()}원에 매수했습니다.`,
      }, { status: 201 });
      
    } else {
      // Sell
      if (!portfolio || portfolio.quantity < quantity) {
        const held = portfolio?.quantity || 0;
        return NextResponse.json(
          { error: `보유 수량이 부족합니다. (보유: ${held}주, 매도 요청: ${quantity}주)` },
          { status: 400 }
        );
      }
      
      // Calculate realized profit
      const realizedProfit = (price - portfolio.avg_price) * quantity;
      const profitRate = ((price - portfolio.avg_price) / portfolio.avg_price) * 100;
      
      // Create trade record
      const { data: trade, error: tradeError } = await supabase
        .from('bb_trades')
        .insert({
          agent_id: agent.id,
          stock_id: stock.id,
          stock_symbol: stock.symbol,
          trade_type: 'sell',
          quantity,
          price,
          total_amount: totalAmount,
          realized_profit: realizedProfit,
          profit_rate: profitRate,
        })
        .select()
        .single();
      
      if (tradeError) {
        return NextResponse.json(
          { error: '거래 기록에 실패했습니다.' },
          { status: 500 }
        );
      }
      
      // Update portfolio
      const newQuantity = portfolio.quantity - quantity;
      if (newQuantity === 0) {
        await supabase
          .from('bb_portfolios')
          .delete()
          .eq('id', portfolio.id);
      } else {
        await supabase
          .from('bb_portfolios')
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', portfolio.id);
      }
      
      // Update agent
      const isWin = realizedProfit > 0;
      const newProfitLoss = agent.total_profit_loss + realizedProfit;
      const newProfitRate = (newProfitLoss / 10000000) * 100; // Based on initial 10M
      
      await supabase
        .from('bb_agents')
        .update({
          total_balance: agent.total_balance + totalAmount,
          total_profit_loss: newProfitLoss,
          profit_rate: newProfitRate,
          trade_count: agent.trade_count + 1,
          win_count: isWin ? agent.win_count + 1 : agent.win_count,
          last_active: new Date().toISOString(),
        })
        .eq('id', agent.id);
      
      return NextResponse.json({
        id: trade.id,
        tradeType: 'sell',
        stockSymbol: stock.symbol,
        quantity,
        price,
        totalAmount,
        realizedProfit,
        profitRate,
        newBalance: agent.total_balance + totalAmount,
        message: `${stock.symbol} ${quantity}주를 ${price.toLocaleString()}원에 매도했습니다. (${realizedProfit >= 0 ? '+' : ''}${realizedProfit.toLocaleString()}원)`,
      }, { status: 201 });
    }
    
  } catch (error) {
    console.error('Trade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/trades - Get trade history
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const agentName = searchParams.get('agent');
    const stockSymbol = searchParams.get('stock');
    
    const supabase = createServerClient();
    
    let query = supabase
      .from('bb_trades')
      .select(`
        *,
        agent:bb_agents!agent_id (
          id, name, display_name
        ),
        stock:bb_stocks!stock_id (
          id, symbol, name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (agentName) {
      const { data: agent } = await supabase
        .from('bb_agents')
        .select('id')
        .eq('name', agentName.toLowerCase())
        .single();
      
      if (agent) {
        query = query.eq('agent_id', agent.id);
      }
    }
    
    if (stockSymbol) {
      query = query.eq('stock_symbol', stockSymbol.toUpperCase());
    }
    
    const { data: trades, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: '거래 내역을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    const transformedTrades = (trades || []).map(trade => ({
      id: trade.id,
      agentId: trade.agent_id,
      agentName: trade.agent?.name,
      agentDisplayName: trade.agent?.display_name,
      stockId: trade.stock_id,
      stockSymbol: trade.stock_symbol,
      stockName: trade.stock?.name,
      tradeType: trade.trade_type,
      quantity: trade.quantity,
      price: trade.price,
      totalAmount: trade.total_amount,
      realizedProfit: trade.realized_profit,
      profitRate: trade.profit_rate,
      createdAt: trade.created_at,
    }));
    
    return NextResponse.json({
      data: transformedTrades,
      pagination: {
        count: transformedTrades.length,
        limit,
        offset,
        hasMore: transformedTrades.length === limit,
      },
    });
    
  } catch (error) {
    console.error('Get trades error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
