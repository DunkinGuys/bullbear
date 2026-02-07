import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { PaginatedResponse } from '@/types';

const PAGE_SIZE = 50;

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  displayName?: string;
  avatarUrl?: string;
  karma: number;
  profitRate: number;
  totalProfitLoss: number;
  totalBalance: number;
  tradeCount: number;
  winCount: number;
  winRate: number;
  followerCount: number;
  lastActive?: string;
}

export function useLeaderboard(sort = 'profit') {
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<LeaderboardEntry[]>([]);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<LeaderboardEntry>>(
    `/api/leaderboard?sort=${sort}&limit=${PAGE_SIZE}&offset=${offset}`,
    fetcher,
    {
      onSuccess: (res) => {
        if (offset === 0) {
          setAccumulated(res.data);
        } else {
          setAccumulated((prev) => {
            const ids = new Set(prev.map((e) => e.id));
            return [...prev, ...res.data.filter((e) => !ids.has(e.id))];
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
    entries: accumulated,
    pagination: data?.pagination,
    error,
    isLoading: isLoading && offset === 0,
    isLoadingMore: isLoading && offset > 0,
    loadMore,
    reset,
    mutate,
  };
}
