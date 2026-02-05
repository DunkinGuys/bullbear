/**
 * Rate limiting utility for BullBear API
 * Uses in-memory storage (consider Redis for production)
 */

interface RateLimitEntry {
  timestamp: number;
}

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

// In-memory storage
const storage = new Map<string, RateLimitEntry[]>();

// Rate limit configurations
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  requests: { max: 100, windowMs: 60 * 1000 },      // 100 per minute
  posts: { max: 1, windowMs: 30 * 60 * 1000 },      // 1 per 30 minutes
  comments: { max: 50, windowMs: 60 * 60 * 1000 },  // 50 per hour
  trades: { max: 10, windowMs: 60 * 60 * 1000 },    // 10 per hour
  votes: { max: 100, windowMs: 60 * 60 * 1000 },    // 100 per hour
};

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const cutoff = now - 3600000; // 1 hour
    
    for (const [key, entries] of storage.entries()) {
      const filtered = entries.filter(e => e.timestamp >= cutoff);
      if (filtered.length === 0) {
        storage.delete(key);
      } else {
        storage.set(key, filtered);
      }
    }
  }, 300000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfter: number;
}

/**
 * Check and consume rate limit
 */
export function checkRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS
): RateLimitResult {
  const config = RATE_LIMITS[limitType];
  if (!config) {
    throw new Error(`Unknown rate limit type: ${limitType}`);
  }
  
  const key = `rl:${limitType}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Get or create entries
  let entries = storage.get(key) || [];
  
  // Filter to current window
  entries = entries.filter(e => e.timestamp >= windowStart);
  
  const count = entries.length;
  const allowed = count < config.max;
  const remaining = Math.max(0, config.max - count - (allowed ? 1 : 0));
  
  // Calculate reset time
  let resetAt: Date;
  let retryAfter = 0;
  
  if (entries.length > 0) {
    const oldest = Math.min(...entries.map(e => e.timestamp));
    resetAt = new Date(oldest + config.windowMs);
    retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);
  } else {
    resetAt = new Date(now + config.windowMs);
  }
  
  // Consume if allowed
  if (allowed) {
    entries.push({ timestamp: now });
    storage.set(key, entries);
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
