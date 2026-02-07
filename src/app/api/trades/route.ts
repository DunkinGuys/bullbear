import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authenticateAndRateLimit, isNextResponse } from '@/lib/apiAuth';
import { getStockPrice } from '@/lib/stockPrice';

// POST /api/trades - Execute a trade (buy or sell) atomically
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAndRateLimit(request, 'trades');
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase } = authResult;

    const body = await request.json();
    const { stockSymbol, tradeType, quantity } = body;

    // Validate
    if (!stockSymbol) {
      return NextResponse.json(
        { error: 'Stock symbol is required.' },
        { status: 400 },
      );
    }

    if (!['buy', 'sell'].includes(tradeType)) {
      return NextResponse.json(
        { error: 'Trade type must be buy or sell.' },
        { status: 400 },
      );
    }

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: 'Quantity must be a positive integer.' },
        { status: 400 },
      );
    }

    // Fetch real-time price from Yahoo Finance
    const quote = await getStockPrice(stockSymbol);
    if (!quote) {
      return NextResponse.json(
        { error: `Could not fetch price for ${stockSymbol.toUpperCase()}.` },
        { status: 404 },
      );
    }

    const price = quote.price;

    // Get stock from DB (getStockPrice already upserts it)
    const { data: stock } = await supabase
      .from('stocks')
      .select('id, symbol')
      .eq('symbol', quote.symbol)
      .single();

    if (!stock) {
      return NextResponse.json(
        { error: 'Stock not found.' },
        { status: 500 },
      );
    }

    // Execute trade atomically via RPC
    const rpcName = tradeType === 'buy' ? 'execute_buy_trade' : 'execute_sell_trade';
    const { data: result, error: rpcError } = await supabase.rpc(rpcName, {
      p_agent_id: agent.id,
      p_stock_id: stock.id,
      p_stock_symbol: stock.symbol,
      p_quantity: quantity,
      p_price: price,
    });

    if (rpcError) {
      console.error('Trade RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Failed to execute trade.' },
        { status: 500 },
      );
    }

    // RPC returns JSON — check for business error
    if (result?.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    const response: Record<string, unknown> = {
      id: result.tradeId,
      tradeType,
      stockSymbol: stock.symbol,
      stockName: quote.name,
      quantity,
      price,
      totalAmount: result.totalAmount,
      newBalance: result.newBalance,
      marketState: quote.marketState,
    };

    if (tradeType === 'sell') {
      response.realizedProfit = result.realizedProfit;
      response.profitRate = result.profitRate;
      response.message = `Sold ${quantity} ${stock.symbol} @ $${price.toLocaleString()} (${result.realizedProfit >= 0 ? '+' : ''}$${Math.abs(result.realizedProfit).toLocaleString()})`;
    } else {
      response.message = `Bought ${quantity} ${stock.symbol} @ $${price.toLocaleString()}`;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Trade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET /api/trades - Get trade history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limitRaw = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(Number.isNaN(limitRaw) ? 50 : Math.max(1, limitRaw), 100);
    const offsetRaw = parseInt(searchParams.get('offset') || '0');
    const offset = Math.max(0, Number.isNaN(offsetRaw) ? 0 : offsetRaw);
    const agentName = searchParams.get('agent');
    const stockSymbol = searchParams.get('stock');

    const supabase = createServerClient();

    let query = supabase
      .from('trades')
      .select(`
        *,
        agent:agents!agent_id (
          id, name, display_name
        ),
        stock:stocks!stock_id (
          id, symbol, name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agentName) {
      const { data: agent } = await supabase
        .from('agents')
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
        { error: 'Failed to load trade history.' },
        { status: 500 },
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
      { status: 500 },
    );
  }
}
