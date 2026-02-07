import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndRateLimit, isNextResponse } from '@/lib/apiAuth';

interface RouteParams {
  params: Promise<{ symbol: string }>;
}

// GET /api/stocks/[symbol]/subscribe - Check subscription status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = await params;

    const authResult = await authenticateAndRateLimit(request);
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase } = authResult;

    const { data: stock } = await supabase
      .from('stocks')
      .select('id')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (!stock) {
      return NextResponse.json({ subscribed: false });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('stock_id', stock.id)
      .single();

    return NextResponse.json({ subscribed: !!sub });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json({ subscribed: false });
  }
}

// POST /api/stocks/[symbol]/subscribe - Subscribe to a stock
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = await params;

    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase } = authResult;

    // Get or create stock
    let { data: stock } = await supabase
      .from('stocks')
      .select('id, symbol, name')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (!stock) {
      // Create stock entry
      const { data: newStock, error: createError } = await supabase
        .from('stocks')
        .insert({
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(),
          market: symbol.length <= 4 ? 'NASDAQ' : 'KRX',
        })
        .select()
        .single();

      if (createError) {
        console.error('Stock creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create stock.' },
          { status: 500 }
        );
      }

      stock = newStock;
    }

    if (!stock) {
      return NextResponse.json(
        { error: 'Failed to process stock.' },
        { status: 500 }
      );
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('stock_id', stock.id)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        action: 'already_subscribed',
        message: `Already subscribed to ${stock.symbol}.`,
      });
    }

    // Create subscription
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        agent_id: agent.id,
        stock_id: stock.id,
      });

    if (subError) {
      console.error('Subscription error:', subError);
      return NextResponse.json(
        { error: 'Failed to subscribe.' },
        { status: 500 }
      );
    }

    // Update subscriber count
    await supabase.rpc('increment_subscriber_count', { stock_id: stock.id });

    return NextResponse.json({
      success: true,
      action: 'subscribed',
      message: `Subscribed to ${stock.symbol}!`,
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

    const authResult = await authenticateAndRateLimit(request, 'requests');
    if (isNextResponse(authResult)) return authResult;
    const { agent, supabase } = authResult;

    // Get stock
    const { data: stock } = await supabase
      .from('stocks')
      .select('id, symbol')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (!stock) {
      return NextResponse.json(
        { error: 'Stock not found.' },
        { status: 404 }
      );
    }

    // Delete subscription
    const { data: deleted } = await supabase
      .from('subscriptions')
      .delete()
      .eq('agent_id', agent.id)
      .eq('stock_id', stock.id)
      .select()
      .single();

    if (!deleted) {
      return NextResponse.json({
        success: true,
        action: 'not_subscribed',
        message: `Not subscribed to ${stock.symbol}.`,
      });
    }

    // Update subscriber count
    await supabase.rpc('decrement_subscriber_count', { stock_id: stock.id });

    return NextResponse.json({
      success: true,
      action: 'unsubscribed',
      message: `Unsubscribed from ${stock.symbol}.`,
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
