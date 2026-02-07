'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowBigUp, ArrowBigDown, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { mutate as apiMutate } from '@/lib/fetcher';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import type { CommentNode } from '@/hooks/usePost';

interface CommentCardProps {
  comment: CommentNode;
  postId: string;
  onReply?: (parentId: string, content: string) => Promise<void>;
}

export function CommentCard({ comment, postId, onReply }: CommentCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);

  const indent = Math.min(comment.depth, 6) * 24;

  const handleVote = async (direction: 'upvote' | 'downvote') => {
    try {
      await apiMutate(
        `/api/posts/${postId}/comments/${comment.id}/${direction}`,
        'POST',
      );
    } catch {
      addToast('투표에 실패했습니다.', 'error');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      if (onReply) {
        await onReply(comment.id, replyText);
      } else {
        await apiMutate(`/api/posts/${postId}/comments`, 'POST', {
          content: replyText,
          parentId: comment.id,
        });
      }
      setReplyText('');
      setReplying(false);
      addToast('답글이 작성되었습니다.', 'success');
    } catch {
      addToast('답글 작성에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div style={{ marginLeft: comment.depth > 0 ? `${indent}px` : 0 }}>
      <div className={`py-3 ${comment.depth > 0 ? 'border-l border-gray-800 pl-4' : ''}`}>
        {/* Collapse toggle for comments with replies */}
        <div className="flex items-center gap-2 text-sm mb-1">
          {hasReplies && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-0.5 text-gray-600 hover:text-gray-400"
            >
              {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
          <Link
            href={`/u/${comment.authorName}`}
            className="font-medium text-gray-300 hover:text-green-400"
          >
            {comment.authorDisplayName || comment.authorName}
          </Link>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
        </div>

        {/* Content (hidden when collapsed) */}
        {!collapsed && (
          <>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              {comment.content}
            </p>

            {/* Footer */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVote('upvote')}
                className={`p-0.5 rounded hover:bg-gray-800 ${
                  comment.userVote === 'up' ? 'text-green-400' : 'text-gray-600 hover:text-green-400'
                }`}
              >
                <ArrowBigUp className="h-4 w-4" />
              </button>
              <span className={`text-xs font-medium ${
                comment.score > 0 ? 'text-green-400' :
                comment.score < 0 ? 'text-red-400' : 'text-gray-500'
              }`}>
                {comment.score}
              </span>
              <button
                onClick={() => handleVote('downvote')}
                className={`p-0.5 rounded hover:bg-gray-800 ${
                  comment.userVote === 'down' ? 'text-red-400' : 'text-gray-600 hover:text-red-400'
                }`}
              >
                <ArrowBigDown className="h-4 w-4" />
              </button>

              {isAuthenticated && (
                <button
                  onClick={() => setReplying(!replying)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 ml-2"
                >
                  <MessageSquare className="h-3 w-3" />
                  답글
                </button>
              )}

              {hasReplies && collapsed && (
                <button
                  onClick={() => setCollapsed(false)}
                  className="text-xs text-gray-500 hover:text-gray-300 ml-2"
                >
                  {comment.replies!.length}개 답글 보기
                </button>
              )}
            </div>

            {/* Reply form */}
            {replying && (
              <div className="mt-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="답글을 작성하세요..."
                  className="w-full rounded-lg bg-gray-900 border border-gray-800 px-3 py-2 text-sm focus:border-green-500 focus:outline-none resize-none"
                  rows={2}
                />
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={handleReply}
                    disabled={submitting || !replyText.trim()}
                    className="px-3 py-1 rounded-lg bg-green-600 text-xs font-medium hover:bg-green-500 disabled:opacity-50"
                  >
                    {submitting ? '작성 중...' : '답글'}
                  </button>
                  <button
                    onClick={() => { setReplying(false); setReplyText(''); }}
                    className="px-3 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-300"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Replies */}
      {!collapsed && hasReplies && (
        comment.depth < 4 ? (
          comment.replies!.map((reply) => (
            <CommentCard key={reply.id} comment={reply} postId={postId} onReply={onReply} />
          ))
        ) : (
          <div className="ml-6 py-2">
            <Link
              href={`/post/${postId}`}
              className="text-xs text-gray-500 hover:text-green-400"
            >
              {comment.replies!.length}개의 답글 더 보기 →
            </Link>
          </div>
        )
      )}
    </div>
  );
}
