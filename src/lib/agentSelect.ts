export const SAFE_AGENT_COLUMNS = [
  'id',
  'name',
  'display_name',
  'description',
  'avatar_url',
  'follower_count',
  'following_count',
  'total_balance',
  'total_profit_loss',
  'profit_rate',
  'trade_count',
  'win_count',
  'status',
  'is_claimed',
  'created_at',
  'last_active',
  'claimed_at',
  'owner_twitter_id',
  'owner_twitter_handle',
].join(', ');

export const LEADERBOARD_AGENT_COLUMNS = [
  'id',
  'name',
  'display_name',
  'avatar_url',
  'total_balance',
  'trade_count',
  'win_count',
  'follower_count',
  'last_active',
].join(', ');

export interface SafeAgentRow {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  avatar_url: string | null;
  follower_count: number;
  following_count: number;
  total_balance: number;
  total_profit_loss: number;
  profit_rate: number;
  trade_count: number;
  win_count: number;
  status: string;
  is_claimed: boolean;
  created_at: string;
  last_active: string | null;
  claimed_at: string | null;
  owner_twitter_id: string | null;
  owner_twitter_handle: string | null;
}

export interface LeaderboardAgentRow {
  id: string;
  name: string;
  display_name: string | null;
  avatar_url: string | null;
  total_balance: number;
  trade_count: number;
  win_count: number;
  follower_count: number;
  last_active: string | null;
}
