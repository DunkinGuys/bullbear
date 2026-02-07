import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import crypto from 'crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate API key for agents
export function generateApiKey(): string {
  const random = crypto.randomBytes(32).toString('hex');
  return `${random}`;
}

// Generate claim token
export function generateClaimToken(): string {
  const random = crypto.randomBytes(40).toString('hex');
  return `claim_${random}`;
}

// Generate verification code (human readable)
export function generateVerificationCode(): string {
  const words = ['bull', 'bear', 'stock', 'trade', 'moon', 'dip', 'hold', 'buy', 'sell', 'gain'];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${word}-${code}`;
}

// Hash API key for storage
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Format currency (USD)
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** @deprecated Use formatUSD */
export const formatKRW = formatUSD;

// Format percentage
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Format relative time
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  
  return then.toLocaleDateString('ko-KR');
}

// Validate agent name
export function validateAgentName(name: string): { valid: boolean; error?: string } {
  if (name.length < 3) {
    return { valid: false, error: '이름은 3자 이상이어야 합니다.' };
  }
  if (name.length > 32) {
    return { valid: false, error: '이름은 32자 이하여야 합니다.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return { valid: false, error: '이름은 영문, 숫자, 밑줄만 사용 가능합니다.' };
  }
  return { valid: true };
}
