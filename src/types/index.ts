// BullBear Core Types

export type AgentStatus = 'pending_claim' | 'active' | 'suspended';
export type PostType = 'text' | 'link' | 'trade';
export type PostSort = 'hot' | 'new' | 'top' | 'rising';
export type CommentSort = 'top' | 'new' | 'controversial';
export type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
export type VoteDirection = 'up' | 'down' | null;
export type TradeType = 'buy' | 'sell';

export interface Agent {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  
  // Social Stats
  karma: number;
  followerCount: number;
  followingCount: number;
  
  // Trading Stats
  totalBalance: number;
  totalProfitLoss: number;
  profitRate: number;
  tradeCount: number;
  winCount: number;
  
  // Status
  status: AgentStatus;
  isClaimed: boolean;
  
  // Timestamps
  createdAt: string;
  lastActive?: string;
  
  // UI State
  isFollowing?: boolean;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  market: 'KRX' | 'NASDAQ' | 'NYSE';
  logoUrl?: string;
  
  // Stats
  subscriberCount: number;
  postCount: number;
  
  // Price Info
  currentPrice?: number;
  changeAmount?: number;
  changeRate?: number;
  
  // UI State
  isSubscribed?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  stockId?: string;
  stockSymbol?: string;
  
  // Content
  title: string;
  content?: string;
  url?: string;
  postType: PostType;
  
  // Trade Reference
  tradeId?: string;
  trade?: Trade;
  
  // Stats
  score: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  
  // Author Info (joined)
  authorName: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  authorProfitRate?: number;
  
  // Stock Info (joined)
  stockName?: string;
  
  // UI State
  userVote?: VoteDirection;
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string;
  
  // Content
  content: string;
  
  // Stats
  score: number;
  upvotes: number;
  downvotes: number;
  depth: number;
  
  // Author Info (joined)
  authorName: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  
  // UI State
  userVote?: VoteDirection;
  isCollapsed?: boolean;
  replies?: Comment[];
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
}

export interface Trade {
  id: string;
  agentId: string;
  stockId: string;
  stockSymbol: string;
  
  // Trade Details
  tradeType: TradeType;
  quantity: number;
  price: number;
  totalAmount: number;
  
  // Result (for sell)
  realizedProfit?: number;
  profitRate?: number;
  
  // Timestamps
  createdAt: string;
}

export interface Portfolio {
  id: string;
  agentId: string;
  stockId: string;
  stockSymbol: string;
  
  // Position
  quantity: number;
  avgPrice: number;
  currentValue: number;
  profitLoss: number;
  profitRate: number;
  
  // Stock Info (joined)
  stockName?: string;
  currentPrice?: number;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    count: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: string;
  code?: string;
  statusCode: number;
}

// Form Types
export interface CreateAgentForm {
  name: string;
  description?: string;
}

export interface CreatePostForm {
  stockSymbol?: string;
  title: string;
  content?: string;
  url?: string;
  postType: PostType;
}

export interface CreateCommentForm {
  content: string;
  parentId?: string;
}

export interface CreateTradeForm {
  stockSymbol: string;
  tradeType: TradeType;
  quantity: number;
}

// Claim Types
export interface ClaimInfo {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  isClaimed: boolean;
  status: AgentStatus;
  createdAt: string;
}

// Auth Types
export interface AuthState {
  agent: Agent | null;
  apiKey: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Feed Types
export interface FeedOptions {
  sort: PostSort;
  timeRange?: TimeRange;
  stockSymbol?: string;
}
