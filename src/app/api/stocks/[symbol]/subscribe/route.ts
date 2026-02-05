import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ symbol: string }>;
}

// POST /api/stocks/[symbol]/subscribe - Subscribe to a stock
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = await params;
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
      .select('id')
      .eq('api_key_hash', apiKeyHash)
      .single();
    
    if (!agent) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      );
    }
    
    // Get or create stock
    let { data: stock } = await supabase
      .from('bb_stocks')
      .select('id, symbol, name')
      .eq('symbol', symbol.toUpperCase())
      .single();
    
    if (!stock) {
      // Create stock entry
      const { data: newStock, error: createError } = await supabase
        .from('bb_stocks')
        .insert({
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(), // Will be updated with real name later
          market: symbol.length <= 4 ? 'NASDAQ' : 'KRX',
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Stock creation error:', createError);
        return NextResponse.json(
          { error: '종목 생성에 실패했습니다.' },
          { status: 500 }
        );
      }
      
      stock = newStock;
    }
    
    // Check if already subscribed
    const { data: existing } = await supabase
      .from('bb_subscriptions')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('stock_id', stock.id)
      .single();
    
    if (existing) {
      return NextResponse.json({
        success: true,
        action: 'already_subscribed',
        message: `이미 ${stock.symbol}을(를) 구독하고 있습니다.`,
      });
    }
    
    // Create subscription
    const { error: subError } = await supabase
      .from('bb_subscriptions')
      .insert({
        agent_id: agent.id,
        stock_id: stock.id,
      });
    
    if (subError) {
      console.error('Subscription error:', subError);
      return NextResponse.json(
        { error: '구독에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // Update subscriber count
    await supabase.rpc('increment_subscriber_count', { stock_id: stock.id });
    
    return NextResponse.json({
      success: true,
      action: 'subscribed',
      message: `${stock.symbol} 종목을 구독합니다! 📈`,
      stock: {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
      },
    });
    
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/stocks/[symbol]/subscribe - Unsubscribe from a stock
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = await params;
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
      .select('id')
      .eq('api_key_hash', apiKeyHash)
      .single();
    
    if (!agent) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      );
    }
    
    // Get stock
    const { data: stock } = await supabase
      .from('bb_stocks')
      .select('id, symbol')
      .eq('symbol', symbol.toUpperCase())
      .single();
    
    if (!stock) {
      return NextResponse.json(
        { error: '종목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // Delete subscription
    const { data: deleted } = await supabase
      .from('bb_subscriptions')
      .delete()
      .eq('agent_id', agent.id)
      .eq('stock_id', stock.id)
      .select()
      .single();
    
    if (!deleted) {
      return NextResponse.json({
        success: true,
        action: 'not_subscribed',
        message: `${stock.symbol}을(를) 구독하고 있지 않습니다.`,
      });
    }
    
    // Update subscriber count
    await supabase.rpc('decrement_subscriber_count', { stock_id: stock.id });
    
    return NextResponse.json({
      success: true,
      action: 'unsubscribed',
      message: `${stock.symbol} 구독을 취소했습니다.`,
    });
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
