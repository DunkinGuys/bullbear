'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowBigUp, ArrowBigDown, MessageSquare } from 'lucide-react';
import { formatRelativeTime, formatPercent } from '@/lib/utils';
import { usePost, useComments } from '@/hooks/usePost';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { mutate as apiMutate } from '@/lib/fetcher';
import { CommentCard } from '@/components/comment/CommentCard';
import { PostDetailSkeleton } from '@/components/ui/Skeleton';

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: post, error, isLoading, mutate } = usePost(id);
  const { data: commentsData, mutate: mutateComments } = useComments(id);
  const { isAuthenticated } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleVote = async (direction: 'upvote' | 'downvote') => {
    if (!post) return;
    const isUp = direction === 'upvote';
    const currentVote = post.userVote;
    const toggling = (isUp && currentVote === 'up') || (!isUp && currentVote === 'down');

    // Optimistic update
    const scoreDelta = toggling ? (isUp ? -1 : 1) : currentVote ? (isUp ? 2 : -2) : (isUp ? 1 : -1);
    const optimisticVote = toggling ? null : (isUp ? 'up' : 'down') as 'up' | 'down' | null;
    mutate(
      { ...post, score: post.score + scoreDelta, userVote: optimisticVote },
      false,
    );

    try {
      await apiMutate(`/api/posts/${id}/${direction}`, 'POST');
      mutate();
    } catch {
      // Revert on error
      mutate();
      addToast('Failed to vote.', 'error');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await apiMutate(`/api/posts/${id}/comments`, 'POST', {
        content: commentText,
      });
      setCommentText('');
      mutateComments();
      addToast('Comment posted.', 'success');
    } catch {
      addToast('Failed to post comment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6" />
        <PostDetailSkeleton />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-gray-500 text-lg mb-4">Post not found.</p>
        <Link href="/feed" className="text-green-400 hover:underline">Back to feed</Link>
      </div>
    );
  }

  const isPositive = (post.authorProfitRate ?? 0) >= 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <Link href="/feed" className="flex items-center gap-1 text-gray-500 hover:text-white mb-6 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      {/* Post */}
      <article className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-lg font-bold">
            {post.authorName[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/u/${post.authorName}`} className="font-medium hover:text-green-400">
                {post.authorDisplayName || post.authorName}
              </Link>
              {post.authorProfitRate !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isPositive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {formatPercent(post.authorProfitRate)}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {post.stockSymbol && (
                <>
                  <Link href={`/s/${post.stockSymbol}`} className="hover:text-green-400">${post.stockSymbol}</Link>
                  {' · '}
                </>
              )}
              {formatRelativeTime(post.createdAt)}
            </div>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-xl font-bold mb-3">{post.title}</h1>
        {post.content && (
          <p className="text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
        )}

        {/* Trade Badge */}
        {post.trade && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 ${
            post.trade.tradeType === 'buy'
              ? 'bg-green-900/50 text-green-400'
              : 'bg-red-900/50 text-red-400'
          }`}>
            {post.trade.tradeType === 'buy' ? '📈 Buy' : '📉 Sell'}
            <span>{post.trade.quantity} shares</span>
            <span>@${post.trade.price.toLocaleString()}</span>
          </div>
        )}

        {/* Votes */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote('upvote')}
              className={`p-1 rounded hover:bg-gray-800 ${
                post.userVote === 'up' ? 'text-green-400' : 'text-gray-500 hover:text-green-400'
              }`}
            >
              <ArrowBigUp className="h-6 w-6" />
            </button>
            <span className={`text-lg font-medium ${
              post.score > 0 ? 'text-green-400' :
              post.score < 0 ? 'text-red-400' : 'text-gray-500'
            }`}>
              {post.score}
            </span>
            <button
              onClick={() => handleVote('downvote')}
              className={`p-1 rounded hover:bg-gray-800 ${
                post.userVote === 'down' ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
              }`}
            >
              <ArrowBigDown className="h-6 w-6" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <MessageSquare className="h-5 w-5" />
            <span>{post.commentCount}</span>
          </div>
        </div>
      </article>

      {/* Comment Form */}
      {isAuthenticated && (
        <form onSubmit={handleComment} className="mt-6">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 text-sm focus:border-green-500 focus:outline-none resize-none"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="px-4 py-2 rounded-lg bg-green-600 text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}

      {/* Comments */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">
          Comments {post.commentCount > 0 && `(${post.commentCount})`}
        </h2>
        {commentsData?.data && commentsData.data.length > 0 ? (
          <div className="space-y-1">
            {commentsData.data.map((comment) => (
              <CommentCard key={comment.id} comment={comment} postId={id} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No comments yet.</p>
        )}
      </div>
    </div>
  );
}
