import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface PortfolioPosition {
  id: string;
  stockSymbol: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  profitLoss: number;
  profitRate: number;
}

interface PortfolioSummary {
  cashBalance: number;
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitRate: number;
  positionCount: number;
}

interface PortfolioResponse {
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
}

export function usePortfolio(agentName: string | null) {
  return useSWR<PortfolioResponse>(
    agentName ? `/api/portfolio?agent=${agentName}` : null,
    fetcher,
  );
}
