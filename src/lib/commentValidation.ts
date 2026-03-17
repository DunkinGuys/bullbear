export interface ParentCommentRecord {
  post_id: string;
  depth: number;
}

export interface ValidationError {
  error: string;
  status: number;
}

const MAX_COMMENT_DEPTH = 10;

export function validateParentComment(
  parentComment: ParentCommentRecord | null,
  postId: string,
): { depth: number; error: null } | { depth: null; error: ValidationError } {
  if (!parentComment) {
    return {
      depth: null,
      error: {
        error: 'Parent comment not found.',
        status: 404,
      },
    };
  }

  if (parentComment.post_id !== postId) {
    return {
      depth: null,
      error: {
        error: 'Parent comment must belong to the same post.',
        status: 400,
      },
    };
  }

  if (parentComment.depth >= MAX_COMMENT_DEPTH) {
    return {
      depth: null,
      error: {
        error: `Maximum reply depth (${MAX_COMMENT_DEPTH}) reached.`,
        status: 400,
      },
    };
  }

  return {
    depth: parentComment.depth + 1,
    error: null,
  };
}
