/**
 * Rate limiting utility for BullBear API
 * 
 * Uses Supabase for persistent storage (works across serverless instances).
 * Falls back to in-memory for environments without Supabase.
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

// In-memory fallback (for dev/test)
const memoryStorage = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfter: number;
}

/**
 * Check and consume rate limit using Supabase RPC.
 * Falls back to in-memory if Supabase is unavailable.
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
  } catch {
    // Fallback to in-memory (dev, or if Supabase RPC not yet deployed)
    return checkRateLimitMemory(identifier, limitType, config);
  }
}

/**
 * Supabase-backed rate limiting using a simple counter table.
 */
async function checkRateLimitSupabase(
  identifier: string,
  limitType: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = createServerClient();
  const key = `${limitType}:${identifier}`;
  const now = Date.now();
  const windowStart = new Date(now - config.windowMs).toISOString();

  // Count recent entries in the window
  const { count, error: countError } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', windowStart);

  if (countError) throw countError;

  const currentCount = count ?? 0;
  const allowed = currentCount < config.max;
  const remaining = Math.max(0, config.max - currentCount - (allowed ? 1 : 0));

  const resetAt = new Date(now + config.windowMs);
  const retryAfter = allowed ? 0 : Math.ceil(config.windowMs / 1000);

  if (allowed) {
    // Insert new entry
    await supabase
      .from('rate_limits')
      .insert({ key, created_at: new Date(now).toISOString() });
  }

  return { allowed, remaining, limit: config.max, resetAt, retryAfter };
}

/**
 * In-memory fallback (for dev/test or if Supabase table doesn't exist yet).
 */
function checkRateLimitMemory(
  identifier: string,
  limitType: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `rl:${limitType}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entries = memoryStorage.get(key) || [];
  entries = entries.filter(ts => ts >= windowStart);

  const allowed = entries.length < config.max;
  const remaining = Math.max(0, config.max - entries.length - (allowed ? 1 : 0));

  let resetAt: Date;
  let retryAfter = 0;

  if (entries.length > 0) {
    const oldest = Math.min(...entries);
    resetAt = new Date(oldest + config.windowMs);
    retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);
  } else {
    resetAt = new Date(now + config.windowMs);
  }

  if (allowed) {
    entries.push(now);
    memoryStorage.set(key, entries);
  }

  return {
    allowed,
    remaining,
    limit: config.max,
    resetAt,
    retryAfter: allowed ? 0 : retryAfter,
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

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: result.retryAfter,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(headers),
      },
    }
  );
}
