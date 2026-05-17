export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string;
  updatedAt: string;
}

export async function getStockPrice(): Promise<StockQuote | null> {
  return null;
}
