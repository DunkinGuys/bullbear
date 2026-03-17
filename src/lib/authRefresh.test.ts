import { describe, expect, it } from 'vitest';
import { shouldRefreshAuth } from '@/lib/authRefresh';

describe('shouldRefreshAuth', () => {
  it('refreshes only when an api key exists and agent is missing', () => {
    expect(shouldRefreshAuth('key', false)).toBe(true);
    expect(shouldRefreshAuth('key', true)).toBe(false);
    expect(shouldRefreshAuth(null, false)).toBe(false);
  });
});
