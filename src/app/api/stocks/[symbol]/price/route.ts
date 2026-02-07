import { NextRequest, NextResponse } from 'next/server';
import { getStockPrice } from '@/lib/stockPrice';

// GET /api/stocks/[symbol]/price - Get real-time stock price
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const quote = await getStockPrice(symbol);

    if (!quote) {
      return NextResponse.json(
        { error: '종목 가격을 조회할 수 없습니다.' },
        { status: 404 },
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Stock price error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
