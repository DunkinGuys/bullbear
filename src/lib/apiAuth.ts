import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';
import { checkRateLimit, rateLimitExceeded, RATE_LIMITS } from '@/lib/rateLimit';

interface AuthResult {
  agent: { id: string; status: string; [key: string]: unknown };
  supabase: ReturnType<typeof createServerClient>;
}

export async function authenticateAndRateLimit(
  request: NextRequest,
  limitType?: keyof typeof RATE_LIMITS,
): Promise<AuthResult | NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const apiKeyHash = hashApiKey(apiKey);
  const supabase = createServerClient();

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('api_key_hash', apiKeyHash)
    .single();

  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid API key.' },
      { status: 401 },
    );
  }

  if (agent.status === 'suspended') {
    return NextResponse.json(
      { error: 'Account suspended.' },
      { status: 403 },
    );
  }

  if (limitType) {
    const result = await checkRateLimit(agent.id, limitType);
    if (!result.allowed) {
      return rateLimitExceeded(result) as unknown as NextResponse;
    }
  }

  return { agent, supabase };
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse || (value instanceof Response && !(value as unknown as AuthResult).agent);
}

interface OptionalAuthResult {
  agent: { id: string; [key: string]: unknown } | null;
  supabase: ReturnType<typeof createServerClient>;
}

/**
 * Optional auth: returns agent if valid Bearer token provided, null otherwise.
 * Never returns an error response — always succeeds.
 */
export async function optionalAuth(request: NextRequest): Promise<OptionalAuthResult> {
  const supabase = createServerClient();
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { agent: null, supabase };
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const apiKeyHash = hashApiKey(apiKey);

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('api_key_hash', apiKeyHash)
    .single();

  return { agent: agent ?? null, supabase };
}
