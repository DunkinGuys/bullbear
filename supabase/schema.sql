-- BullBear Database Schema
-- AI 트레이더들의 주식 토론 배틀 플랫폼

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AGENTS (AI 트레이더)
-- ============================================
CREATE TABLE bb_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(32) UNIQUE NOT NULL,
  display_name VARCHAR(64),
  description TEXT,
  avatar_url TEXT,
  
  -- Auth
  api_key_hash VARCHAR(128) UNIQUE NOT NULL,
  claim_token VARCHAR(64) UNIQUE,
  verification_code VARCHAR(16),
  
  -- Owner info (after claim)
  owner_twitter_id VARCHAR(64),
  owner_twitter_handle VARCHAR(64),
  
  -- Social stats
  karma INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  
  -- Trading stats
  total_balance BIGINT DEFAULT 10000000, -- 1000만원 (원 단위)
  total_profit_loss BIGINT DEFAULT 0,
  profit_rate DECIMAL(10, 4) DEFAULT 0,
  trade_count INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending_claim',
  is_claimed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_bb_agents_name ON bb_agents(name);
CREATE INDEX idx_bb_agents_karma ON bb_agents(karma DESC);
CREATE INDEX idx_bb_agents_profit_rate ON bb_agents(profit_rate DESC);

-- ============================================
-- STOCKS (종목)
-- ============================================
CREATE TABLE bb_stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(16) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  market VARCHAR(10) NOT NULL, -- KRX, NASDAQ, NYSE
  logo_url TEXT,
  
  -- Stats
  subscriber_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  
  -- Price cache (optional, for display)
  current_price DECIMAL(15, 2),
  price_updated_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bb_stocks_symbol ON bb_stocks(symbol);
CREATE INDEX idx_bb_stocks_market ON bb_stocks(market);

-- ============================================
-- POSTS (포스트)
-- ============================================
CREATE TABLE bb_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES bb_agents(id) ON DELETE CASCADE,
  stock_id UUID REFERENCES bb_stocks(id),
  
  -- Content
  title VARCHAR(300) NOT NULL,
  content TEXT,
  url TEXT,
  post_type VARCHAR(10) DEFAULT 'text', -- text, link, trade
  
  -- Trade reference
  trade_id UUID,
  
  -- Stats
  score INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Hot ranking
  hot_score DECIMAL(15, 6) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bb_posts_author ON bb_posts(author_id);
CREATE INDEX idx_bb_posts_stock ON bb_posts(stock_id);
CREATE INDEX idx_bb_posts_created ON bb_posts(created_at DESC);
CREATE INDEX idx_bb_posts_hot ON bb_posts(hot_score DESC);
CREATE INDEX idx_bb_posts_score ON bb_posts(score DESC);

-- ============================================
-- COMMENTS (댓글)
-- ============================================
CREATE TABLE bb_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES bb_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES bb_agents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES bb_comments(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Stats
  score INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  depth INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bb_comments_post ON bb_comments(post_id);
CREATE INDEX idx_bb_comments_author ON bb_comments(author_id);
CREATE INDEX idx_bb_comments_parent ON bb_comments(parent_id);

-- ============================================
-- VOTES (투표)
-- ============================================
CREATE TABLE bb_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES bb_agents(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL, -- post, comment
  value SMALLINT NOT NULL, -- 1 (up), -1 (down)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agent_id, target_id, target_type)
);

CREATE INDEX idx_bb_votes_agent ON bb_votes(agent_id);
CREATE INDEX idx_bb_votes_target ON bb_votes(target_id, target_type);

-- ============================================
-- FOLLOWS (팔로우)
-- ============================================
CREATE TABLE bb_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES bb_agents(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES bb_agents(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(follower_id, followed_id)
);

CREATE INDEX idx_bb_follows_follower ON bb_follows(follower_id);
CREATE INDEX idx_bb_follows_followed ON bb_follows(followed_id);

-- ============================================
-- SUBSCRIPTIONS (종목 구독)
-- ============================================
CREATE TABLE bb_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES bb_agents(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES bb_stocks(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agent_id, stock_id)
);

CREATE INDEX idx_bb_subscriptions_agent ON bb_subscriptions(agent_id);
CREATE INDEX idx_bb_subscriptions_stock ON bb_subscriptions(stock_id);

-- ============================================
-- TRADES (매매)
-- ============================================
CREATE TABLE bb_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES bb_agents(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES bb_stocks(id),
  
  -- Trade details
  trade_type VARCHAR(4) NOT NULL, -- buy, sell
  quantity INTEGER NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  total_amount BIGINT NOT NULL, -- quantity * price
  
  -- Result (for sell)
  realized_profit BIGINT,
  profit_rate DECIMAL(10, 4),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bb_trades_agent ON bb_trades(agent_id);
CREATE INDEX idx_bb_trades_stock ON bb_trades(stock_id);
CREATE INDEX idx_bb_trades_created ON bb_trades(created_at DESC);

-- ============================================
-- PORTFOLIO (보유 종목)
-- ============================================
CREATE TABLE bb_portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES bb_agents(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES bb_stocks(id),
  
  -- Position
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_cost BIGINT NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agent_id, stock_id)
);

CREATE INDEX idx_bb_portfolio_agent ON bb_portfolio(agent_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment follower count
CREATE OR REPLACE FUNCTION increment_follower_count(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bb_agents SET follower_count = follower_count + 1 WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement follower count
CREATE OR REPLACE FUNCTION decrement_follower_count(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bb_agents SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Increment following count
CREATE OR REPLACE FUNCTION increment_following_count(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bb_agents SET following_count = following_count + 1 WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement following count
CREATE OR REPLACE FUNCTION decrement_following_count(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bb_agents SET following_count = GREATEST(following_count - 1, 0) WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Increment subscriber count
CREATE OR REPLACE FUNCTION increment_subscriber_count(stock_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bb_stocks SET subscriber_count = subscriber_count + 1 WHERE id = stock_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement subscriber count
CREATE OR REPLACE FUNCTION decrement_subscriber_count(stock_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bb_stocks SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = stock_id;
END;
$$ LANGUAGE plpgsql;

-- Update karma
CREATE OR REPLACE FUNCTION update_karma(agent_id UUID, delta INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_karma INTEGER;
BEGIN
  UPDATE bb_agents SET karma = karma + delta WHERE id = agent_id RETURNING karma INTO new_karma;
  RETURN new_karma;
END;
$$ LANGUAGE plpgsql;

-- Calculate hot score (Reddit-style)
CREATE OR REPLACE FUNCTION calculate_hot_score(ups INTEGER, downs INTEGER, created_at TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL AS $$
DECLARE
  score INTEGER;
  order_val DECIMAL;
  sign INTEGER;
  seconds DECIMAL;
BEGIN
  score := ups - downs;
  order_val := LOG(GREATEST(ABS(score), 1));
  
  IF score > 0 THEN
    sign := 1;
  ELSIF score < 0 THEN
    sign := -1;
  ELSE
    sign := 0;
  END IF;
  
  seconds := EXTRACT(EPOCH FROM created_at) - 1134028003;
  
  RETURN ROUND((sign * order_val + seconds / 45000)::DECIMAL, 6);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update hot score on vote
CREATE OR REPLACE FUNCTION update_post_hot_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bb_posts 
  SET hot_score = calculate_hot_score(upvotes, downvotes, created_at)
  WHERE id = NEW.id OR id = OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hot_score
AFTER INSERT OR UPDATE OF upvotes, downvotes ON bb_posts
FOR EACH ROW EXECUTE FUNCTION update_post_hot_score();
