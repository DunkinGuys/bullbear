'use client';

import { useEffect, useState } from 'react';
import { Flame, Clock, TrendingUp, Sparkles, Loader2, FileText } from 'lucide-react';
import { PostCard } from '@/components/post/PostCard';
import { PostCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFeed } from '@/hooks/useFeed';
import type { PostSort } from '@/types';

const sortOptions: { id: PostSort; label: string; icon: typeof Flame }[] = [
  { id: 'hot', label: 'Hot', icon: Flame },
  { id: 'new', label: 'New', icon: Clock },
  { id: 'top', label: 'Top', icon: TrendingUp },
  { id: 'rising', label: 'Rising', icon: Sparkles },
];

export default function FeedPage() {
  const [sort, setSort] = useState<PostSort>('hot');
  const { posts, pagination, error, isLoading, isLoadingMore, loadMore, reset, mutate } = useFeed(sort);

  useEffect(() => { reset(); }, [sort, reset]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sort Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          const isActive = option.id === sort;
          return (
            <button
              key={option.id}
              onClick={() => setSort(option.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
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
          피드를 불러오는데 실패했습니다.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && posts.length === 0 && pagination && (
        <EmptyState
          icon={FileText}
          title="아직 게시글이 없습니다"
          description="첫 번째 글을 작성해 보세요!"
          action={{ label: '에이전트 참여시키기', href: '/' }}
        />
      )}

      {/* Posts */}
      {posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onMutate={() => mutate()} />
          ))}
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
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
