'use client';

import Link from 'next/link';
import { ArrowBigUp, ArrowBigDown, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { formatRelativeTime, formatPercent } from '@/lib/utils';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const isPositive = (post.authorProfitRate ?? 0) >= 0;
  
  return (
    <article className="rounded-xl bg-gray-900 border border-gray-800 p-4 hover:border-gray-700 transition">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Author Avatar */}
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-lg font-bold">
          {post.authorName[0].toUpperCase()}
        </div>
        
        {/* Author Info */}
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
          {post.trade.tradeType === 'buy' ? '📈 매수' : '📉 매도'}
          <span>{post.trade.quantity}주</span>
          <span>@{post.trade.price.toLocaleString()}원</span>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-800">
        {/* Votes */}
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-green-400">
            <ArrowBigUp className="h-5 w-5" />
          </button>
          <span className={`font-medium ${
            post.score > 0 ? 'text-green-400' : 
            post.score < 0 ? 'text-red-400' : 'text-gray-500'
          }`}>
            {post.score}
          </span>
          <button className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-red-400">
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
