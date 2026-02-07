'use client';

import { use, useState, useEffect } from 'react';
import { Loader2, Bell, BellOff, TrendingUp, TrendingDown } from 'lucide-react';
import { useStockPosts, useStockPrice } from '@/hooks/useStock';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { fetcher, mutate as apiMutate } from '@/lib/fetcher';
import { PostCard } from '@/components/post/PostCard';
import { PostCardSkeleton } from '@/components/ui/Skeleton';

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const { posts, pagination, error, isLoading, isLoadingMore, loadMore, mutate } = useStockPosts(symbol);
  const { data: quote } = useStockPrice(symbol);
  const { isAuthenticated, apiKey } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [subscribed, setSubscribed] = useState(false);

  // Check subscription status on mount
  useEffect(() => {
    if (!isAuthenticated || !apiKey) return;
    fetcher<{ subscribed?: boolean }>(`/api/stocks/${symbol}/subscribe`)
      .then((res) => {
        if (res?.subscribed) setSubscribed(true);
      })
      .catch(() => {/* ignore */});
  }, [isAuthenticated, apiKey, symbol]);

  const handleSubscribe = async () => {
    try {
      if (subscribed) {
        await apiMutate(`/api/stocks/${symbol}/subscribe`, 'DELETE');
        setSubscribed(false);
        addToast('구독을 취소했습니다.', 'info');
      } else {
        await apiMutate(`/api/stocks/${symbol}/subscribe`, 'POST');
        setSubscribed(true);
        addToast('구독했습니다.', 'success');
      }
    } catch {
      addToast('구독에 실패했습니다.', 'error');
    }
  };

  const pricePositive = (quote?.change ?? 0) >= 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stock Header */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">${symbol.toUpperCase()}</h1>
              {quote && (
                <span className="text-sm text-gray-400">{quote.name}</span>
              )}
            </div>

            {/* Price */}
            {quote ? (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl font-bold">
                  ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${
                  pricePositive
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-red-900/50 text-red-400'
                }`}>
                  {pricePositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {pricePositive ? '+' : ''}{quote.change.toFixed(2)} ({pricePositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                </span>
                {quote.marketState && quote.marketState !== 'cached' && (
                  <span className="text-xs text-gray-600">
                    {quote.marketState === 'REGULAR' ? 'Market Open' :
                     quote.marketState === 'PRE' ? 'Pre-Market' :
                     quote.marketState === 'POST' ? 'After Hours' :
                     quote.marketState === 'CLOSED' ? 'Market Closed' : ''}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mt-1">종목 토론</p>
            )}
          </div>
          {isAuthenticated && (
            <button
              onClick={handleSubscribe}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                subscribed
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-green-600 hover:bg-green-500'
              }`}
            >
              {subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {subscribed ? '구독 중' : '구독'}
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12 text-red-400">
          게시글을 불러오는데 실패했습니다.
        </div>
      )}

      {/* Posts */}
      {!isLoading && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onMutate={() => mutate()} />
          ))}
        </div>
      ) : (
        !isLoading && !error && (
          <div className="text-center py-12 text-gray-500">
            아직 이 종목에 대한 게시글이 없습니다.
          </div>
        )
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
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
