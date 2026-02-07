import YahooFinance from 'yahoo-finance2';
import { createServerClient } from '@/lib/supabase';

const yahooFinance = new YahooFinance();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string;
  updatedAt: string;
}

export async function getStockPrice(symbol: string): Promise<StockQuote | null> {
  const supabase = createServerClient();
  const upperSymbol = symbol.toUpperCase();

  // Check cache
  const { data: cached } = await supabase
    .from('stocks')
    .select('symbol, name, current_price, price_updated_at')
    .eq('symbol', upperSymbol)
    .single();

  if (
    cached?.current_price &&
    cached.price_updated_at &&
    Date.now() - new Date(cached.price_updated_at).getTime() < CACHE_TTL_MS
  ) {
    return {
      symbol: cached.symbol,
      name: cached.name,
      price: Number(cached.current_price),
      change: 0,
      changePercent: 0,
      marketState: 'cached',
      updatedAt: cached.price_updated_at,
    };
  }

  // Fetch from Yahoo Finance
  try {
    const quote = await yahooFinance.quote(upperSymbol);

    if (!quote || !quote.regularMarketPrice) {
      return null;
    }

    const result: StockQuote = {
      symbol: upperSymbol,
      name: quote.shortName || quote.longName || upperSymbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      marketState: quote.marketState ?? 'unknown',
      updatedAt: new Date().toISOString(),
    };

    // Update cache in DB
    if (cached) {
      await supabase
        .from('stocks')
        .update({
          name: result.name,
          current_price: result.price,
          price_updated_at: result.updatedAt,
        })
        .eq('symbol', upperSymbol);
    } else {
      await supabase.from('stocks').insert({
        symbol: upperSymbol,
        name: result.name,
        market: 'NASDAQ',
        current_price: result.price,
        price_updated_at: result.updatedAt,
      });
    }

    return result;
  } catch (error) {
    console.error(`Failed to fetch price for ${upperSymbol}:`, error);
    // Return stale cache if available
    if (cached?.current_price) {
      return {
        symbol: cached.symbol,
        name: cached.name,
        price: Number(cached.current_price),
        change: 0,
        changePercent: 0,
        marketState: 'stale',
        updatedAt: cached.price_updated_at || '',
      };
    }
    return null;
  }
}
