import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { Post } from '@/types';

interface CommentResponse {
  data: CommentNode[];
}

export interface CommentNode {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  parentId?: string;
  content: string;
  score: number;
  upvotes: number;
  downvotes: number;
  depth: number;
  userVote?: 'up' | 'down' | null;
  createdAt: string;
  replies: CommentNode[];
}

export function usePost(id: string) {
  return useSWR<Post>(id ? `/api/posts/${id}` : null, fetcher);
}

export function useComments(postId: string) {
  return useSWR<CommentResponse>(
    postId ? `/api/posts/${postId}/comments` : null,
    fetcher,
  );
}
