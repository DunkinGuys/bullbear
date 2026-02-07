import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';

// GET /api/stocks - List stocks
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    const market = searchParams.get('market');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'popular'; // popular, name, new
    
    const supabase = createServerClient();
    
    // Get agent for subscription status
    let agentId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '');
      const apiKeyHash = hashApiKey(apiKey);
      
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('api_key_hash', apiKeyHash)
        .single();
      
      agentId = agent?.id || null;
    }
    
    // Build query
    let query = supabase
      .from('stocks')
      .select('*', { count: 'exact' });
    
    if (market) {
      query = query.eq('market', market.toUpperCase());
    }
    
    // Sort
    switch (sort) {
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
      default:
        query = query.order('subscriber_count', { ascending: false });
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data: stocks, count, error } = await query;
    
    if (error) {
      console.error('Stocks fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load stocks.' },
        { status: 500 }
      );
    }
    
    // Get subscriptions if authenticated
    let subscriptions: Set<string> = new Set();
    if (agentId && stocks && stocks.length > 0) {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('stock_id')
        .eq('agent_id', agentId)
        .in('stock_id', stocks.map(s => s.id));
      
      subscriptions = new Set(subs?.map(s => s.stock_id) || []);
    }
    
    const stocksWithStatus = stocks?.map(stock => ({
      id: stock.id,
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      logoUrl: stock.logo_url,
      subscriberCount: stock.subscriber_count,
      postCount: stock.post_count,
      currentPrice: stock.current_price,
      isSubscribed: subscriptions.has(stock.id),
    })) || [];
    
    return NextResponse.json({
      data: stocksWithStatus,
      pagination: {
        count: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
    
  } catch (error) {
    console.error('Stocks list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
