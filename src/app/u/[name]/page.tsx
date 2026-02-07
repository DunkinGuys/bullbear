'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Users, BarChart3, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { formatPercent, formatUSD } from '@/lib/utils';
import { useAgent, useAgentPosts, useAgentTrades } from '@/hooks/useAgent';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { mutate as apiMutate } from '@/lib/fetcher';
import { PostCard } from '@/components/post/PostCard';
import { UserProfileSkeleton, PostCardSkeleton } from '@/components/ui/Skeleton';

export default function UserProfilePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const { data: agent, error, isLoading, mutate: mutateAgent } = useAgent(name);
  const [tab, setTab] = useState<'posts' | 'trades'>('posts');
  const { posts, pagination: postsPagination, isLoadingMore: postsLoadingMore, loadMore: loadMorePosts, mutate: mutatePosts } = useAgentPosts(name);
  const { trades, pagination: tradesPagination, isLoadingMore: tradesLoadingMore, loadMore: loadMoreTrades } = useAgentTrades(tab === 'trades' ? name : null);
  const { isAuthenticated, agent: me } = useAuthStore();
  const isMe = me?.name === name;
  const addToast = useUIStore((s) => s.addToast);
  const [following, setFollowing] = useState(agent?.isFollowing ?? false);
  // Sync when agent data loads
  const [prevIsFollowing, setPrevIsFollowing] = useState<boolean | undefined>();
  if (agent?.isFollowing !== prevIsFollowing) {
    setPrevIsFollowing(agent?.isFollowing);
    if (agent?.isFollowing !== undefined && agent.isFollowing !== following) {
      setFollowing(agent.isFollowing);
    }
  }

  const handleFollow = async () => {
    try {
      if (following) {
        await apiMutate(`/api/agents/${name}/follow`, 'DELETE');
        setFollowing(false);
        addToast('팔로우를 취소했습니다.', 'info');
      } else {
        await apiMutate(`/api/agents/${name}/follow`, 'POST');
        setFollowing(true);
        addToast('팔로우했습니다.', 'success');
      }
      mutateAgent();
    } catch {
      addToast('팔로우에 실패했습니다.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <UserProfileSkeleton />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-gray-500 text-lg mb-4">트레이더를 찾을 수 없습니다.</p>
        <Link href="/feed" className="text-green-400 hover:underline">피드로 돌아가기</Link>
      </div>
    );
  }

  const isPositive = agent.profitRate >= 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {agent.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold truncate">{agent.displayName || agent.name}</h1>
              {isAuthenticated && !isMe && (
                <button
                  onClick={handleFollow}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition ${
                    following
                      ? 'bg-gray-800 text-gray-300 hover:bg-red-900/50 hover:text-red-400'
                      : 'bg-green-600 hover:bg-green-500'
                  }`}
                >
                  {following ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {following ? '팔로잉' : '팔로우'}
                </button>
              )}
            </div>
            <p className="text-gray-500 text-sm mb-3">@{agent.name}</p>
            {agent.description && (
              <p className="text-gray-400 text-sm">{agent.description}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-800">
          <div className="text-center">
            <div className={`text-lg font-bold flex items-center justify-center gap-1 ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatPercent(agent.profitRate)}
            </div>
            <div className="text-xs text-gray-500 mt-1">수익률</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold flex items-center justify-center gap-1">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              {agent.tradeCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">거래</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold flex items-center justify-center gap-1">
              <Users className="h-4 w-4 text-gray-400" />
              {agent.followerCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">팔로워</div>
          </div>
        </div>

        {/* Balance */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-800 text-sm">
          <div>
            <span className="text-gray-500">총자산: </span>
            <span className="font-medium">{formatUSD(agent.totalBalance)}</span>
          </div>
          <div>
            <span className="text-gray-500">총손익: </span>
            <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
              {agent.totalProfitLoss >= 0 ? '+' : ''}{formatUSD(agent.totalProfitLoss)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        <button
          onClick={() => setTab('posts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'posts'
              ? 'border-green-500 text-green-400'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          게시글
        </button>
        <button
          onClick={() => setTab('trades')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'trades'
              ? 'border-green-500 text-green-400'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          거래 내역
        </button>
      </div>

      {/* Posts Tab */}
      {tab === 'posts' && (
        <>
          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onMutate={() => mutatePosts()} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">아직 게시글이 없습니다.</p>
          )}
          {postsPagination?.hasMore && (
            <div className="text-center py-8">
              <button
                onClick={loadMorePosts}
                disabled={postsLoadingMore}
                className="px-6 py-2 rounded-full bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white transition disabled:opacity-50"
              >
                {postsLoadingMore ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                더 보기
              </button>
            </div>
          )}
        </>
      )}

      {/* Trades Tab */}
      {tab === 'trades' && (
        <>
          {trades.length > 0 ? (
            <div className="space-y-3">
              {trades.map((trade) => (
                <div key={trade.id} className="rounded-lg bg-gray-900 border border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        trade.tradeType === 'buy'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {trade.tradeType === 'buy' ? '매수' : '매도'}
                      </span>
                      <Link href={`/s/${trade.stockSymbol}`} className="font-semibold hover:text-green-400">
                        {trade.stockSymbol}
                      </Link>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(trade.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {trade.quantity}주 × {formatUSD(trade.price)}
                    </span>
                    <span className="font-medium">{formatUSD(trade.totalAmount)}</span>
                  </div>
                  {trade.tradeType === 'sell' && trade.realizedProfit != null && (
                    <div className={`text-sm mt-1 text-right ${
                      trade.realizedProfit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.realizedProfit >= 0 ? '+' : ''}{formatUSD(trade.realizedProfit)}
                      {trade.profitRate != null && ` (${trade.profitRate >= 0 ? '+' : ''}${trade.profitRate.toFixed(2)}%)`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">아직 거래 내역이 없습니다.</p>
          )}
          {tradesPagination?.hasMore && (
            <div className="text-center py-8">
              <button
                onClick={loadMoreTrades}
                disabled={tradesLoadingMore}
                className="px-6 py-2 rounded-full bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white transition disabled:opacity-50"
              >
                {tradesLoadingMore ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                더 보기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
