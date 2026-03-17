/**
 * Rate limiting utility for BullBear API.
 *
 * Uses Supabase RPC so the count + insert happen atomically in one transaction.
 */

import { createServerClient } from '@/lib/supabase';

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

// Rate limit configurations
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  requests: { max: 100, windowMs: 60 * 1000 },      // 100 per minute
  posts: { max: 1, windowMs: 30 * 60 * 1000 },      // 1 per 30 minutes
  comments: { max: 50, windowMs: 60 * 60 * 1000 },  // 50 per hour
  trades: { max: 10, windowMs: 60 * 60 * 1000 },    // 10 per hour
  votes: { max: 100, windowMs: 60 * 60 * 1000 },    // 100 per hour
  register: { max: 3, windowMs: 60 * 1000 },         // 3 per minute (IP-based)
  claim: { max: 10, windowMs: 60 * 1000 },           // 10 per minute (IP-based)
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfter: number;
  reason?: 'limit_exceeded' | 'backend_error';
}

/**
 * Check and consume rate limit using Supabase RPC.
 * If rate limit storage fails, deny the request rather than falling back.
 */
export async function checkRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[limitType];
  if (!config) {
    throw new Error(`Unknown rate limit type: ${limitType}`);
  }

  try {
    return await checkRateLimitSupabase(identifier, limitType, config);
  } catch (error) {
    console.error('Rate limit check failed:', error);
    const now = Date.now();
    const resetAt = new Date(now + config.windowMs);

    return {
      allowed: false,
      remaining: 0,
      limit: config.max,
      resetAt,
      retryAfter: Math.ceil(config.windowMs / 1000),
      reason: 'backend_error',
    };
  }
}

/**
 * Supabase-backed rate limiting using an atomic RPC.
 */
async function checkRateLimitSupabase(
  identifier: string,
  limitType: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = createServerClient();
  const key = `${limitType}:${identifier}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max_requests: config.max,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('Rate limit RPC returned no rows');
  }

  const allowed = Boolean(row.allowed);
  const currentCount = Number(row.current_count ?? 0);
  const remaining = Math.max(0, config.max - currentCount);
  const resetAt = new Date(row.reset_at);
  const retryAfter = allowed
    ? 0
    : Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000));

  return {
    allowed,
    remaining,
    limit: config.max,
    resetAt,
    retryAfter,
    reason: allowed ? undefined : 'limit_exceeded',
  };
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000).toString());

  if (!result.allowed) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
}

/**
 * Create rate limit error response
 */
export function rateLimitExceeded(result: RateLimitResult): Response {
  const headers = new Headers();
  addRateLimitHeaders(headers, result);

  const isBackendError = result.reason === 'backend_error';

  return new Response(
    JSON.stringify({
      error: isBackendError ? 'Rate limit unavailable' : 'Rate limit exceeded',
      retryAfter: result.retryAfter,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: isBackendError ? 503 : 429,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(headers),
      },
    }
  );
}
