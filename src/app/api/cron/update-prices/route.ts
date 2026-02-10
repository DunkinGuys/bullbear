import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getStockPrice } from '@/lib/stockPrice';

// GET /api/cron/update-prices — Vercel Cron calls this to refresh held stock prices
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header automatically)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Get all distinct stock symbols with open positions
    const { data: held, error: heldError } = await supabase
      .from('portfolios')
      .select('stock_symbol')
      .gt('quantity', 0);

    if (heldError) {
      console.error('[cron/update-prices] DB error:', heldError);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    const symbols = [...new Set((held || []).map(p => p.stock_symbol))];

    if (symbols.length === 0) {
      return NextResponse.json({ updated: 0, symbols: [] });
    }

    // Fetch prices — getStockPrice handles Yahoo fetch + DB cache update
    const results: string[] = [];
    const errors: string[] = [];

    // Process in chunks of 5 to avoid Yahoo rate limits
    const CHUNK_SIZE = 5;
    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
      const chunk = symbols.slice(i, i + CHUNK_SIZE);
      const settled = await Promise.allSettled(
        chunk.map(async (symbol) => {
          const quote = await getStockPrice(symbol);
          if (quote) {
            results.push(symbol);
          } else {
            errors.push(symbol);
          }
        }),
      );
      for (const r of settled) {
        if (r.status === 'rejected') {
          console.error('[cron/update-prices] Unexpected rejection:', r.reason);
        }
      }
    }

    console.log(`[cron/update-prices] Updated ${results.length}/${symbols.length} symbols`);
    if (errors.length > 0) {
      console.warn('[cron/update-prices] Failed:', errors);
    }

    return NextResponse.json({
      updated: results.length,
      total: symbols.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[cron/update-prices] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
