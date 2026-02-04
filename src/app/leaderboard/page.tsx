import Link from 'next/link';
import { Trophy, TrendingUp, TrendingDown, Medal } from 'lucide-react';
import { formatPercent, formatKRW } from '@/lib/utils';

// Mock data for now
const mockLeaderboard = [
  {
    rank: 1,
    name: 'BullMaster',
    displayName: '불마스터',
    profitRate: 45.2,
    totalProfitLoss: 4520000,
    totalBalance: 14520000,
    tradeCount: 28,
    winRate: 71,
    karma: 5420,
  },
  {
    rank: 2,
    name: 'QuantFox',
    displayName: '퀀트여우',
    profitRate: 32.8,
    totalProfitLoss: 3280000,
    totalBalance: 13280000,
    tradeCount: 45,
    winRate: 62,
    karma: 3210,
  },
  {
    rank: 3,
    name: 'ValueHunter',
    displayName: '가치사냥꾼',
    profitRate: 28.5,
    totalProfitLoss: 2850000,
    totalBalance: 12850000,
    tradeCount: 15,
    winRate: 80,
    karma: 2890,
  },
  {
    rank: 4,
    name: 'TechBull',
    displayName: '테크불',
    profitRate: 22.1,
    totalProfitLoss: 2210000,
    totalBalance: 12210000,
    tradeCount: 52,
    winRate: 54,
    karma: 4120,
  },
  {
    rank: 5,
    name: 'DividendKing',
    displayName: '배당왕',
    profitRate: 18.7,
    totalProfitLoss: 1870000,
    totalBalance: 11870000,
    tradeCount: 8,
    winRate: 88,
    karma: 1560,
  },
];

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return <Medal className="h-6 w-6 text-yellow-400" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-300" />;
    case 3:
      return <Medal className="h-6 w-6 text-amber-600" />;
    default:
      return <span className="text-gray-500 font-mono w-6 text-center">{rank}</span>;
  }
}

export default function LeaderboardPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="h-8 w-8 text-yellow-400" />
        <h1 className="text-2xl font-bold">리더보드</h1>
      </div>
      
      {/* Sort Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['수익률', '카르마', '거래수', '승률'].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              i === 0
                ? 'bg-green-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Leaderboard Table */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-800/50 text-sm text-gray-400 font-medium">
          <div className="col-span-1">#</div>
          <div className="col-span-4">트레이더</div>
          <div className="col-span-2 text-right">수익률</div>
          <div className="col-span-2 text-right">총손익</div>
          <div className="col-span-1 text-right">거래</div>
          <div className="col-span-1 text-right">승률</div>
          <div className="col-span-1 text-right">카르마</div>
        </div>
        
        {/* Rows */}
        {mockLeaderboard.map((trader) => {
          const isPositive = trader.profitRate >= 0;
          
          return (
            <Link
              key={trader.name}
              href={`/u/${trader.name}`}
              className="grid grid-cols-12 gap-4 px-4 py-4 border-t border-gray-800 hover:bg-gray-800/50 transition items-center"
            >
              {/* Rank */}
              <div className="col-span-1 flex items-center">
                {getRankBadge(trader.rank)}
              </div>
              
              {/* Name */}
              <div className="col-span-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-lg font-bold">
                  {trader.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{trader.displayName || trader.name}</div>
                  <div className="text-sm text-gray-500">@{trader.name}</div>
                </div>
              </div>
              
              {/* Profit Rate */}
              <div className={`col-span-2 text-right font-medium flex items-center justify-end gap-1 ${
                isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {formatPercent(trader.profitRate)}
              </div>
              
              {/* Total P/L */}
              <div className={`col-span-2 text-right ${
                isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {trader.totalProfitLoss >= 0 ? '+' : ''}{formatKRW(trader.totalProfitLoss)}
              </div>
              
              {/* Trade Count */}
              <div className="col-span-1 text-right text-gray-400">
                {trader.tradeCount}
              </div>
              
              {/* Win Rate */}
              <div className="col-span-1 text-right text-gray-400">
                {trader.winRate}%
              </div>
              
              {/* Karma */}
              <div className="col-span-1 text-right text-gray-400">
                {trader.karma.toLocaleString()}
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* Load More */}
      <div className="text-center py-8">
        <button className="px-6 py-2 rounded-full bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white transition">
          더 보기
        </button>
      </div>
    </div>
  );
}
