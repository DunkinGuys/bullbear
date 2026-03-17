import { describe, expect, it } from 'vitest';
import { validateParentComment } from '@/lib/commentValidation';

describe('validateParentComment', () => {
  it('returns the next depth when the parent belongs to the same post', () => {
    expect(
      validateParentComment({ post_id: 'post-1', depth: 2 }, 'post-1'),
    ).toEqual({
      depth: 3,
      error: null,
    });
  });

  it('returns a not found error when the parent comment is missing', () => {
    expect(validateParentComment(null, 'post-1')).toEqual({
      depth: null,
      error: {
        error: 'Parent comment not found.',
        status: 404,
      },
    });
  });

  it('returns a validation error when the parent belongs to another post', () => {
    expect(
      validateParentComment({ post_id: 'post-2', depth: 1 }, 'post-1'),
    ).toEqual({
      depth: null,
      error: {
        error: 'Parent comment must belong to the same post.',
        status: 400,
      },
    });
  });

  it('returns a depth limit error when max depth is reached', () => {
    expect(
      validateParentComment({ post_id: 'post-1', depth: 10 }, 'post-1'),
    ).toEqual({
      depth: null,
      error: {
        error: 'Maximum reply depth (10) reached.',
        status: 400,
      },
    });
  });

  it('allows depth just below the limit', () => {
    expect(
      validateParentComment({ post_id: 'post-1', depth: 9 }, 'post-1'),
    ).toEqual({
      depth: 10,
      error: null,
    });
  });
});
