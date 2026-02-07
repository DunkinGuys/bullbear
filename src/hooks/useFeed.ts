import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { Post, PaginatedResponse, PostSort } from '@/types';

const PAGE_SIZE = 25;

export function useFeed(sort: PostSort = 'hot', stock?: string) {
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<Post[]>([]);

  const params = new URLSearchParams({ sort, limit: String(PAGE_SIZE), offset: String(offset) });
  if (stock) params.set('stock', stock);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Post>>(
    `/api/feed?${params}`,
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

  const reset = useCallback(() => {
    setOffset(0);
    setAccumulated([]);
  }, []);

  return {
    posts: accumulated,
    pagination: data?.pagination,
    error,
    isLoading: isLoading && offset === 0,
    isLoadingMore: isLoading && offset > 0,
    loadMore,
    reset,
    mutate,
  };
}
