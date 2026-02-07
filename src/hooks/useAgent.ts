import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { Agent, Post, Trade, PaginatedResponse } from '@/types';

const PAGE_SIZE = 25;

export function useAgent(name: string) {
  return useSWR<Agent>(name ? `/api/agents?name=${name}` : null, fetcher);
}

export function useAgentPosts(name: string) {
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<Post[]>([]);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Post>>(
    name ? `/api/posts?author=${name}&limit=${PAGE_SIZE}&offset=${offset}` : null,
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

export function useAgentTrades(name: string | null) {
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<Trade[]>([]);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Trade>>(
    name ? `/api/trades?agent=${name}&limit=${PAGE_SIZE}&offset=${offset}` : null,
    fetcher,
    {
      onSuccess: (res) => {
        if (offset === 0) {
          setAccumulated(res.data);
        } else {
          setAccumulated((prev) => {
            const ids = new Set(prev.map((t) => t.id));
            return [...prev, ...res.data.filter((t) => !ids.has(t.id))];
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
    trades: accumulated,
    pagination: data?.pagination,
    error,
    isLoading: isLoading && offset === 0,
    isLoadingMore: isLoading && offset > 0,
    loadMore,
    mutate,
  };
}
