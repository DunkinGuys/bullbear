'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowBigUp, ArrowBigDown, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { formatRelativeTime, formatPercent } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { mutate as apiMutate } from '@/lib/fetcher';
import type { Post, VoteDirection } from '@/types';

interface PostCardProps {
  post: Post;
  onMutate?: () => void;
}

export function PostCard({ post, onMutate }: PostCardProps) {
  const isPositive = (post.authorProfitRate ?? 0) >= 0;
  const { isAuthenticated } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [localVote, setLocalVote] = useState<VoteDirection | undefined>(undefined);
  const [localScore, setLocalScore] = useState<number | undefined>(undefined);

  const vote = localVote !== undefined ? localVote : post.userVote;
  const score = localScore !== undefined ? localScore : post.score;

  const handleVote = async (direction: 'upvote' | 'downvote') => {
    if (!isAuthenticated) {
      addToast('Log in required to vote.', 'error');
      return;
    }
    const dirVal: VoteDirection = direction === 'upvote' ? 'up' : 'down';
    const isUndo = vote === dirVal;

    // optimistic
    const prevVote = vote;
    const prevScore = score;
    let scoreDelta = 0;
    if (isUndo) {
      scoreDelta = dirVal === 'up' ? -1 : 1;
      setLocalVote(null);
    } else {
      scoreDelta = dirVal === 'up' ? (prevVote === 'down' ? 2 : 1) : (prevVote === 'up' ? -2 : -1);
      setLocalVote(dirVal);
    }
    setLocalScore((prevScore ?? post.score) + scoreDelta);

    try {
      await apiMutate(`/api/posts/${post.id}/${direction}`, 'POST');
      onMutate?.();
    } catch {
      setLocalVote(prevVote ?? undefined);
      setLocalScore(prevScore ?? undefined);
      addToast('Failed to vote.', 'error');
    }
  };

  return (
    <article className="rounded-xl bg-gray-900 border border-gray-800 p-4 hover:border-gray-700 transition">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-lg font-bold">
          {post.authorName[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/u/${post.authorName}`}
              className="font-medium hover:text-green-400 truncate"
            >
              {post.authorDisplayName || post.authorName}
            </Link>
            {post.authorProfitRate !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isPositive
                  ? 'bg-green-900/50 text-green-400'
                  : 'bg-red-900/50 text-red-400'
              }`}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPercent(post.authorProfitRate)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {post.stockSymbol && (
              <>
                <Link
                  href={`/s/${post.stockSymbol}`}
                  className="hover:text-green-400"
                >
                  ${post.stockSymbol}
                </Link>
                <span>·</span>
              </>
            )}
            <span>{formatRelativeTime(post.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <Link href={`/post/${post.id}`}>
        <h2 className="text-lg font-semibold mb-2 hover:text-green-400">
          {post.title}
        </h2>
        {post.content && (
          <p className="text-gray-400 text-sm line-clamp-3 mb-3">
            {post.content}
          </p>
        )}
      </Link>

      {/* Trade Badge */}
      {post.postType === 'trade' && post.trade && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-3 ${
          post.trade.tradeType === 'buy'
            ? 'bg-green-900/50 text-green-400'
            : 'bg-red-900/50 text-red-400'
        }`}>
          {post.trade.tradeType === 'buy' ? '📈 Buy' : '📉 Sell'}
          <span>{post.trade.quantity} shares</span>
          <span>@${post.trade.price.toLocaleString()}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-800">
        {/* Votes */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleVote('upvote')}
            className={`p-1 rounded hover:bg-gray-800 ${
              vote === 'up' ? 'text-green-400' : 'text-gray-500 hover:text-green-400'
            }`}
          >
            <ArrowBigUp className="h-5 w-5" />
          </button>
          <span className={`font-medium ${
            score > 0 ? 'text-green-400' :
            score < 0 ? 'text-red-400' : 'text-gray-500'
          }`}>
            {score}
          </span>
          <button
            onClick={() => handleVote('downvote')}
            className={`p-1 rounded hover:bg-gray-800 ${
              vote === 'down' ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
            }`}
          >
            <ArrowBigDown className="h-5 w-5" />
          </button>
        </div>

        {/* Comments */}
        <Link
          href={`/post/${post.id}`}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm">{post.commentCount}</span>
        </Link>
      </div>
    </article>
  );
}
