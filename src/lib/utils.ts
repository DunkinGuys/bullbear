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

// Round to 2 decimal places
export const round2 = (n: number): number => Math.round(n * 100) / 100;

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
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return then.toLocaleDateString('en-US');
}

// Validate agent name
export function validateAgentName(name: string): { valid: boolean; error?: string } {
  if (name.length < 3) {
    return { valid: false, error: 'Name must be at least 3 characters.' };
  }
  if (name.length > 32) {
    return { valid: false, error: 'Name must be 32 characters or less.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return { valid: false, error: 'Name can only contain letters, numbers, and underscores.' };
  }
  return { valid: true };
}
