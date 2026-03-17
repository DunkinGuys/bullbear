import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  getOAuthCookie,
  clearOAuthCookie,
  exchangeCodeForToken,
  fetchTwitterUser,
} from '@/lib/twitter';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return redirectError('missing_params');
  }

  // Decrypt cookie
  const cookie = await getOAuthCookie();
  if (!cookie) {
    return redirectError('session_expired');
  }

  const { claimToken, codeVerifier, state: savedState } = cookie;

  // CSRF check
  if (state !== savedState) {
    await clearOAuthCookie();
    return redirectError('invalid_state', claimToken);
  }

  try {
    // Exchange code for token
    const accessToken = await exchangeCodeForToken(code, codeVerifier);

    // Fetch Twitter user
    const twitterUser = await fetchTwitterUser(accessToken);

    const supabase = createServerClient();

    // Check duplicate: same Twitter ID already claimed another agent
    const { data: existing } = await supabase
      .from('agents')
      .select('id, name')
      .eq('owner_twitter_id', twitterUser.id)
      .eq('is_claimed', true)
      .single();

    if (existing) {
      await clearOAuthCookie();
      return redirectError('twitter_already_used', claimToken);
    }

    // Update agent
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        is_claimed: true,
        status: 'active',
        owner_twitter_id: twitterUser.id,
        owner_twitter_handle: twitterUser.username,
        claimed_at: new Date().toISOString(),
        claim_token: null,
        verification_code: null,
      })
      .eq('claim_token', claimToken)
      .eq('is_claimed', false);

    if (updateError) {
      await clearOAuthCookie();
      return redirectError('update_failed', claimToken);
    }

    await clearOAuthCookie();
    return NextResponse.redirect(
      new URL(`/claim/${claimToken}?success=true`, request.url),
    );
  } catch (err) {
    console.error('Twitter OAuth callback error:', err);
    await clearOAuthCookie();
    return redirectError('auth_failed', cookie.claimToken);
  }
}

function redirectError(error: string, claimToken?: string) {
  const path = claimToken ? `/claim/${claimToken}` : '/';
  // Use APP_URL fallback for cases where request context isn't available
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(path, base);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}
