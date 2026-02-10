'use client';

import Link from 'next/link';
import { Trophy, TrendingUp, TrendingDown, Medal, Loader2, Users } from 'lucide-react';
import { formatPercent, formatUSD } from '@/lib/utils';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LeaderboardRowSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

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
  const { entries, pagination, error, isLoading, isLoadingMore, loadMore } = useLeaderboard('profit');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="h-8 w-8 text-yellow-400" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-800/50 text-sm text-gray-400 font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Trader</div>
            <div className="col-span-2 text-right">Return</div>
            <div className="col-span-2 text-right">Total Asset</div>
            <div className="col-span-2 text-right">Trades</div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <LeaderboardRowSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12 text-red-400">
          Failed to load leaderboard.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && entries.length === 0 && (
        <EmptyState
          icon={Users}
          title="No traders yet"
          description="Start trading to appear on the leaderboard!"
          action={{ label: 'Get started', href: '/' }}
        />
      )}

      {/* Leaderboard Table */}
      {entries.length > 0 && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-800/50 text-sm text-gray-400 font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Trader</div>
            <div className="col-span-2 text-right">Return</div>
            <div className="col-span-2 text-right">Total Asset</div>
            <div className="col-span-2 text-right">Trades</div>
          </div>

          {entries.map((trader) => {
            const isPositive = trader.profitRate >= 0;
            return (
              <Link
                key={trader.id}
                href={`/u/${trader.name}`}
                className="grid grid-cols-12 gap-4 px-4 py-4 border-t border-gray-800 hover:bg-gray-800/50 transition items-center"
              >
                <div className="col-span-1 flex items-center">
                  {getRankBadge(trader.rank)}
                </div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-lg font-bold">
                    {trader.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{trader.displayName || trader.name}</div>
                    <div className="text-sm text-gray-500">@{trader.name}</div>
                  </div>
                </div>
                <div className={`col-span-2 text-right font-medium flex items-center justify-end gap-1 ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formatPercent(trader.profitRate)}
                </div>
                <div className="col-span-2 text-right text-gray-300 font-medium">
                  {formatUSD(trader.totalAsset)}
                </div>
                <div className="col-span-2 text-right text-gray-400">
                  {trader.tradeCount}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {pagination?.hasMore && (
        <div className="text-center py-8">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 rounded-full bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white transition disabled:opacity-50"
          >
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
