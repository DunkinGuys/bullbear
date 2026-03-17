import { NextRequest, NextResponse } from 'next/server';
import { SAFE_AGENT_COLUMNS, type SafeAgentRow } from '@/lib/agentSelect';
import { createServerClient } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';
import { checkRateLimit, rateLimitExceeded, RATE_LIMITS } from '@/lib/rateLimit';

interface AuthResult {
  agent: SafeAgentRow;
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

  const { data } = await supabase
    .from('agents')
    .select(SAFE_AGENT_COLUMNS)
    .eq('api_key_hash', apiKeyHash)
    .single();
  const agent = data as unknown as SafeAgentRow | null;

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
  agent: SafeAgentRow | null;
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

  const { data } = await supabase
    .from('agents')
    .select(SAFE_AGENT_COLUMNS)
    .eq('api_key_hash', apiKeyHash)
    .single();
  const agent = data as unknown as SafeAgentRow | null;

  return { agent: agent ?? null, supabase };
}
