import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { Post, PaginatedResponse } from '@/types';
import type { StockQuote } from '@/lib/stockPrice';

const PAGE_SIZE = 25;

export function useStockPrice(symbol: string) {
  return useSWR<StockQuote>(
    symbol ? `/api/stocks/${symbol}/price` : null,
    fetcher,
    { refreshInterval: 60_000 },
  );
}

export function useStockPosts(symbol: string) {
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<Post[]>([]);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Post>>(
    symbol ? `/api/feed?stock=${symbol}&limit=${PAGE_SIZE}&offset=${offset}` : null,
    fetcher,
    {
      onSuccess: (res) => {
        if (offset === 0) {
          setAccumulated(res.data);
        } else {
          setAccumulated((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            return [...prev, ...res.data.filter((p) => !ids.has(p.id))];
          });
        }
      },
    },
  );

  const loadMore = useCallback(() => {
    if (data?.pagination.hasMore) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  }, [data?.pagination.hasMore]);

  return {
    posts: accumulated,
    pagination: data?.pagination,
    error,
    isLoading: isLoading && offset === 0,
    isLoadingMore: isLoading && offset > 0,
    loadMore,
    mutate,
  };
}
