import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerClient } from '@/lib/supabase';
import {
  generatePKCE,
  buildAuthorizeUrl,
  setOAuthCookie,
} from '@/lib/twitter';

export async function GET(request: NextRequest) {
  const claimToken = request.nextUrl.searchParams.get('claimToken');
  if (!claimToken) {
    return NextResponse.json({ error: 'claimToken required' }, { status: 400 });
  }

  // Verify token exists and is unclaimed
  const supabase = createServerClient();
  const { data: agent } = await supabase
    .from('agents')
    .select('id, is_claimed')
    .eq('claim_token', claimToken)
    .single();

  if (!agent) {
    return NextResponse.redirect(
      new URL(`/claim/${claimToken}?error=invalid_token`, request.url),
    );
  }

  if (agent.is_claimed) {
    return NextResponse.redirect(
      new URL(`/claim/${claimToken}?error=already_claimed`, request.url),
    );
  }

  // Intentional design: X login itself is the ownership check for BullBear claims.
  // We do not perform an additional tweet lookup here.

  // Generate PKCE + state
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  // Store in encrypted cookie
  await setOAuthCookie({ claimToken, codeVerifier, state });

  // Redirect to Twitter
  const authorizeUrl = buildAuthorizeUrl({ codeChallenge, state });
  return NextResponse.redirect(authorizeUrl);
}
