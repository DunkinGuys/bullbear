import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkRateLimit, rateLimitExceeded } from '@/lib/rateLimit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // IP-based rate limit
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(ip, 'claim');
  if (!rl.allowed) {
    return rateLimitExceeded(rl) as unknown as NextResponse;
  }

  const supabase = createServerClient();
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, display_name, description, avatar_url, is_claimed, status, created_at, verification_code')
    .eq('claim_token', token)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Invalid claim token' }, { status: 404 });
  }

  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    displayName: agent.display_name,
    description: agent.description,
    avatarUrl: agent.avatar_url,
    isClaimed: agent.is_claimed,
    status: agent.status,
    createdAt: agent.created_at,
    verificationCode: agent.verification_code,
  });
}
