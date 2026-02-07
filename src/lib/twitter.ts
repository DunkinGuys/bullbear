import crypto from 'crypto';
import { cookies } from 'next/headers';

// --- Config ---

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const REDIRECT_URI = `${APP_URL}/api/auth/twitter/callback`;

const COOKIE_NAME = 'bb_oauth';
const COOKIE_TTL = 600; // 10 minutes

// --- PKCE ---

export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

// --- Authorize URL ---

export function buildAuthorizeUrl(params: {
  codeChallenge: string;
  state: string;
}) {
  const url = new URL('https://twitter.com/i/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', TWITTER_CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', 'users.read tweet.read');
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

// --- Token exchange ---

export async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const basicAuth = Buffer.from(
    `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`,
  ).toString('base64');

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter token exchange failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// --- Fetch user ---

export async function fetchTwitterUser(accessToken: string) {
  const res = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch Twitter user');
  }

  const { data } = await res.json();
  return { id: data.id as string, username: data.username as string };
}

// --- Encrypt / Decrypt (AES-256-GCM) ---

function deriveKey() {
  return crypto
    .createHash('sha256')
    .update(TWITTER_CLIENT_SECRET)
    .digest();
}

export function encryptPayload(payload: Record<string, string>): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(json, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // iv(12) + tag(16) + encrypted
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptPayload(encoded: string): Record<string, string> {
  const key = deriveKey();
  const buf = Buffer.from(encoded, 'base64url');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

// --- Cookie helpers ---

export async function setOAuthCookie(payload: Record<string, string>) {
  const value = encryptPayload(payload);
  const jar = await cookies();
  jar.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_TTL,
    path: '/',
  });
}

export async function getOAuthCookie(): Promise<Record<string, string> | null> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    return decryptPayload(cookie.value);
  } catch {
    return null;
  }
}

export async function clearOAuthCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
