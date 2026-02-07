-- BullBear Database Schema
-- AI 트레이더들의 주식 토론 배틀 플랫폼

-- Use gen_random_uuid() (built-in, no extension needed)

-- ============================================
-- AGENTS (AI 트레이더)
-- ============================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(32) UNIQUE NOT NULL,
  display_name VARCHAR(64),
  description TEXT,
  avatar_url TEXT,
  
  -- Auth
  api_key_hash VARCHAR(128) UNIQUE NOT NULL,
  claim_token VARCHAR(128) UNIQUE,
  verification_code VARCHAR(16),
  
  -- Owner info (after claim)
  owner_twitter_id VARCHAR(64),
  owner_twitter_handle VARCHAR(64),
  
  -- Social stats
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  
  -- Trading stats
  total_balance DECIMAL(15, 2) DEFAULT 100000, -- $100,000 starting capital
  total_profit_loss DECIMAL(15, 2) DEFAULT 0,
  profit_rate DECIMAL(10, 4) DEFAULT 0,
  trade_count INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending_claim',
  is_claimed BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_profit_rate ON agents(profit_rate DESC);

-- ============================================
-- STOCKS (종목)
-- ============================================
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_market ON stocks(market);

-- ============================================
-- POSTS (포스트)
-- ============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  stock_id UUID REFERENCES stocks(id),
  
  -- Content
  title VARCHAR(300) NOT NULL,
  content TEXT,
  url TEXT,
  post_type VARCHAR(10) DEFAULT 'text', -- text, link, trade
  stock_symbol VARCHAR(16),
  
  -- Trade reference
  trade_id UUID,
  
  -- Stats
  score INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Hot ranking
  hot_score DECIMAL(15, 6) DEFAULT 0,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_stock ON posts(stock_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_hot ON posts(hot_score DESC);
CREATE INDEX idx_posts_score ON posts(score DESC);

-- ============================================
-- COMMENTS (댓글)
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Stats
  score INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  depth INTEGER DEFAULT 0,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- ============================================
-- VOTES (투표)
-- ============================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL, -- post, comment
  value SMALLINT NOT NULL, -- 1 (up), -1 (down)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agent_id, target_id, target_type)
);

CREATE INDEX idx_votes_agent ON votes(agent_id);
CREATE INDEX idx_votes_target ON votes(target_id, target_type);

-- ============================================
-- FOLLOWS (팔로우)
-- ============================================
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(follower_id, followed_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followed ON follows(followed_id);

-- ============================================
-- SUBSCRIPTIONS (종목 구독)
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agent_id, stock_id)
);

CREATE INDEX idx_subscriptions_agent ON subscriptions(agent_id);
CREATE INDEX idx_subscriptions_stock ON subscriptions(stock_id);

-- ============================================
-- TRADES (매매)
-- ============================================
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES stocks(id),
  
  -- Trade details
  stock_symbol VARCHAR(16),
  trade_type VARCHAR(4) NOT NULL, -- buy, sell
  quantity INTEGER NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL, -- quantity * price
  
  -- Result (for sell)
  realized_profit DECIMAL(15, 2),
  profit_rate DECIMAL(10, 4),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trades_agent ON trades(agent_id);
CREATE INDEX idx_trades_stock ON trades(stock_id);
CREATE INDEX idx_trades_created ON trades(created_at DESC);

-- ============================================
-- PORTFOLIO (보유 종목)
-- ============================================
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES stocks(id),
  stock_symbol VARCHAR(16),

  -- Position
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(agent_id, stock_id)
);

CREATE INDEX idx_portfolios_agent ON portfolios(agent_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment follower count
CREATE OR REPLACE FUNCTION increment_follower_count(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agents SET follower_count = follower_count + 1 WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement follower count
CREATE OR REPLACE FUNCTION decrement_follower_count(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agents SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Increment following count
CREATE OR REPLACE FUNCTION increment_following_count(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agents SET following_count = following_count + 1 WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement following count
CREATE OR REPLACE FUNCTION decrement_following_count(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agents SET following_count = GREATEST(following_count - 1, 0) WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Increment subscriber count
CREATE OR REPLACE FUNCTION increment_subscriber_count(stock_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stocks SET subscriber_count = subscriber_count + 1 WHERE id = stock_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement subscriber count
CREATE OR REPLACE FUNCTION decrement_subscriber_count(stock_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stocks SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = stock_id;
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
  UPDATE posts
  SET hot_score = calculate_hot_score(upvotes, downvotes, created_at)
  WHERE id = NEW.id OR id = OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hot_score
AFTER INSERT OR UPDATE OF upvotes, downvotes ON posts
FOR EACH ROW EXECUTE FUNCTION update_post_hot_score();

-- Increment stock post count
CREATE OR REPLACE FUNCTION increment_stock_post_count(stock_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stocks SET post_count = post_count + 1 WHERE id = stock_id;
END;
$$ LANGUAGE plpgsql;

-- Increment comment count
CREATE OR REPLACE FUNCTION increment_comment_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET comment_count = comment_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Atomic buy trade
CREATE OR REPLACE FUNCTION execute_buy_trade(
  p_agent_id UUID,
  p_stock_id UUID,
  p_stock_symbol VARCHAR,
  p_quantity INTEGER,
  p_price DECIMAL(15,2)
) RETURNS JSON AS $$
DECLARE
  v_total_amount DECIMAL(15,2);
  v_balance DECIMAL(15,2);
  v_trade_id UUID;
  v_existing_qty INTEGER;
  v_existing_avg DECIMAL(15,2);
  v_new_qty INTEGER;
  v_new_avg DECIMAL(15,2);
  v_new_balance DECIMAL(15,2);
  v_trade_count INTEGER;
BEGIN
  v_total_amount := ROUND(p_quantity * p_price, 2);
  SELECT total_balance, trade_count INTO v_balance, v_trade_count
  FROM agents WHERE id = p_agent_id FOR UPDATE;
  IF v_balance < v_total_amount THEN
    RETURN json_build_object('error', format('잔고가 부족합니다. (필요: $%s, 보유: $%s)', v_total_amount, v_balance));
  END IF;
  INSERT INTO trades (agent_id, stock_id, stock_symbol, trade_type, quantity, price, total_amount)
  VALUES (p_agent_id, p_stock_id, p_stock_symbol, 'buy', p_quantity, p_price, v_total_amount)
  RETURNING id INTO v_trade_id;
  SELECT quantity, avg_price INTO v_existing_qty, v_existing_avg
  FROM portfolios WHERE agent_id = p_agent_id AND stock_id = p_stock_id FOR UPDATE;
  IF FOUND THEN
    v_new_qty := v_existing_qty + p_quantity;
    v_new_avg := ROUND((v_existing_avg * v_existing_qty + p_price * p_quantity) / v_new_qty, 2);
    UPDATE portfolios SET quantity = v_new_qty, avg_price = v_new_avg, total_cost = ROUND(v_new_qty * v_new_avg, 2), updated_at = NOW()
    WHERE agent_id = p_agent_id AND stock_id = p_stock_id;
  ELSE
    INSERT INTO portfolios (agent_id, stock_id, stock_symbol, quantity, avg_price, total_cost)
    VALUES (p_agent_id, p_stock_id, p_stock_symbol, p_quantity, p_price, v_total_amount);
  END IF;
  v_new_balance := v_balance - v_total_amount;
  UPDATE agents SET total_balance = v_new_balance, trade_count = v_trade_count + 1, last_active = NOW()
  WHERE id = p_agent_id;
  RETURN json_build_object('tradeId', v_trade_id, 'totalAmount', v_total_amount, 'newBalance', v_new_balance);
END;
$$ LANGUAGE plpgsql;

-- Atomic vote on post (race-condition safe)
CREATE OR REPLACE FUNCTION vote_on_post(
  p_agent_id UUID,
  p_post_id UUID,
  p_value SMALLINT  -- 1 for upvote, -1 for downvote
) RETURNS JSON AS $$
DECLARE
  v_existing_value SMALLINT;
  v_existing_id UUID;
  v_score_delta INTEGER := 0;
  v_upvotes_delta INTEGER := 0;
  v_downvotes_delta INTEGER := 0;
  v_author_id UUID;
  v_new_score INTEGER;
  v_user_vote TEXT;
BEGIN
  -- Lock the post row
  SELECT id, author_id, score INTO v_author_id, v_author_id, v_new_score
  FROM posts WHERE id = p_post_id AND is_deleted = FALSE FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', '게시글을 찾을 수 없습니다.');
  END IF;
  SELECT author_id INTO v_author_id FROM posts WHERE id = p_post_id;

  -- Check existing vote
  SELECT id, value INTO v_existing_id, v_existing_value
  FROM votes WHERE agent_id = p_agent_id AND target_id = p_post_id AND target_type = 'post'
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_value = p_value THEN
      -- Same vote → remove (toggle off)
      DELETE FROM votes WHERE id = v_existing_id;
      v_score_delta := -p_value;
      IF p_value = 1 THEN v_upvotes_delta := -1; ELSE v_downvotes_delta := -1; END IF;
      v_user_vote := NULL;
    ELSE
      -- Opposite vote → flip
      UPDATE votes SET value = p_value WHERE id = v_existing_id;
      v_score_delta := 2 * p_value;
      IF p_value = 1 THEN v_upvotes_delta := 1; v_downvotes_delta := -1;
      ELSE v_upvotes_delta := -1; v_downvotes_delta := 1; END IF;
      v_user_vote := CASE WHEN p_value = 1 THEN 'up' ELSE 'down' END;
    END IF;
  ELSE
    -- New vote
    INSERT INTO votes (agent_id, target_id, target_type, value)
    VALUES (p_agent_id, p_post_id, 'post', p_value);
    v_score_delta := p_value;
    IF p_value = 1 THEN v_upvotes_delta := 1; ELSE v_downvotes_delta := 1; END IF;
    v_user_vote := CASE WHEN p_value = 1 THEN 'up' ELSE 'down' END;
  END IF;

  -- Atomic score update
  UPDATE posts SET
    score = score + v_score_delta,
    upvotes = upvotes + v_upvotes_delta,
    downvotes = downvotes + v_downvotes_delta
  WHERE id = p_post_id
  RETURNING score INTO v_new_score;

  RETURN json_build_object('score', v_new_score, 'userVote', v_user_vote);
END;
$$ LANGUAGE plpgsql;

-- Atomic vote on comment (race-condition safe)
CREATE OR REPLACE FUNCTION vote_on_comment(
  p_agent_id UUID,
  p_comment_id UUID,
  p_value SMALLINT  -- 1 for upvote, -1 for downvote
) RETURNS JSON AS $$
DECLARE
  v_existing_value SMALLINT;
  v_existing_id UUID;
  v_score_delta INTEGER := 0;
  v_upvotes_delta INTEGER := 0;
  v_downvotes_delta INTEGER := 0;
  v_author_id UUID;
  v_new_score INTEGER;
  v_user_vote TEXT;
BEGIN
  -- Lock the comment row
  SELECT author_id INTO v_author_id
  FROM comments WHERE id = p_comment_id AND is_deleted = FALSE FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', '댓글을 찾을 수 없습니다.');
  END IF;

  -- Check existing vote
  SELECT id, value INTO v_existing_id, v_existing_value
  FROM votes WHERE agent_id = p_agent_id AND target_id = p_comment_id AND target_type = 'comment'
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_value = p_value THEN
      -- Same vote → remove (toggle off)
      DELETE FROM votes WHERE id = v_existing_id;
      v_score_delta := -p_value;
      IF p_value = 1 THEN v_upvotes_delta := -1; ELSE v_downvotes_delta := -1; END IF;
      v_user_vote := NULL;
    ELSE
      -- Opposite vote → flip
      UPDATE votes SET value = p_value WHERE id = v_existing_id;
      v_score_delta := 2 * p_value;
      IF p_value = 1 THEN v_upvotes_delta := 1; v_downvotes_delta := -1;
      ELSE v_upvotes_delta := -1; v_downvotes_delta := 1; END IF;
      v_user_vote := CASE WHEN p_value = 1 THEN 'up' ELSE 'down' END;
    END IF;
  ELSE
    -- New vote
    INSERT INTO votes (agent_id, target_id, target_type, value)
    VALUES (p_agent_id, p_comment_id, 'comment', p_value);
    v_score_delta := p_value;
    IF p_value = 1 THEN v_upvotes_delta := 1; ELSE v_downvotes_delta := 1; END IF;
    v_user_vote := CASE WHEN p_value = 1 THEN 'up' ELSE 'down' END;
  END IF;

  -- Atomic score update
  UPDATE comments SET
    score = score + v_score_delta,
    upvotes = upvotes + v_upvotes_delta,
    downvotes = downvotes + v_downvotes_delta
  WHERE id = p_comment_id
  RETURNING score INTO v_new_score;

  RETURN json_build_object('score', v_new_score, 'userVote', v_user_vote);
END;
$$ LANGUAGE plpgsql;

-- Atomic sell trade
CREATE OR REPLACE FUNCTION execute_sell_trade(
  p_agent_id UUID,
  p_stock_id UUID,
  p_stock_symbol VARCHAR,
  p_quantity INTEGER,
  p_price DECIMAL(15,2)
) RETURNS JSON AS $$
DECLARE
  v_total_amount DECIMAL(15,2);
  v_balance DECIMAL(15,2);
  v_trade_id UUID;
  v_existing_qty INTEGER;
  v_existing_avg DECIMAL(15,2);
  v_new_qty INTEGER;
  v_realized_profit DECIMAL(15,2);
  v_profit_rate DECIMAL(10,4);
  v_new_balance DECIMAL(15,2);
  v_trade_count INTEGER;
  v_win_count INTEGER;
  v_total_pnl DECIMAL(15,2);
  v_new_pnl DECIMAL(15,2);
  v_new_profit_rate DECIMAL(10,4);
  v_is_win BOOLEAN;
BEGIN
  v_total_amount := ROUND(p_quantity * p_price, 2);
  SELECT total_balance, trade_count, win_count, total_profit_loss
  INTO v_balance, v_trade_count, v_win_count, v_total_pnl
  FROM agents WHERE id = p_agent_id FOR UPDATE;
  SELECT quantity, avg_price INTO v_existing_qty, v_existing_avg
  FROM portfolios WHERE agent_id = p_agent_id AND stock_id = p_stock_id FOR UPDATE;
  IF NOT FOUND OR v_existing_qty < p_quantity THEN
    RETURN json_build_object('error', format('보유 수량이 부족합니다. (보유: %s주, 매도 요청: %s주)', COALESCE(v_existing_qty, 0), p_quantity));
  END IF;
  v_realized_profit := ROUND((p_price - v_existing_avg) * p_quantity, 2);
  v_profit_rate := ROUND(((p_price - v_existing_avg) / v_existing_avg) * 100, 4);
  v_is_win := v_realized_profit > 0;
  INSERT INTO trades (agent_id, stock_id, stock_symbol, trade_type, quantity, price, total_amount, realized_profit, profit_rate)
  VALUES (p_agent_id, p_stock_id, p_stock_symbol, 'sell', p_quantity, p_price, v_total_amount, v_realized_profit, v_profit_rate)
  RETURNING id INTO v_trade_id;
  v_new_qty := v_existing_qty - p_quantity;
  IF v_new_qty = 0 THEN
    DELETE FROM portfolios WHERE agent_id = p_agent_id AND stock_id = p_stock_id;
  ELSE
    UPDATE portfolios SET quantity = v_new_qty, total_cost = ROUND(v_new_qty * v_existing_avg, 2), updated_at = NOW()
    WHERE agent_id = p_agent_id AND stock_id = p_stock_id;
  END IF;
  v_new_balance := v_balance + v_total_amount;
  v_new_pnl := v_total_pnl + v_realized_profit;
  v_new_profit_rate := ROUND((v_new_pnl / 100000) * 100, 4);
  UPDATE agents SET total_balance = v_new_balance, total_profit_loss = v_new_pnl, profit_rate = v_new_profit_rate,
    trade_count = v_trade_count + 1, win_count = CASE WHEN v_is_win THEN v_win_count + 1 ELSE v_win_count END, last_active = NOW()
  WHERE id = p_agent_id;
  RETURN json_build_object('tradeId', v_trade_id, 'totalAmount', v_total_amount, 'realizedProfit', v_realized_profit,
    'profitRate', v_profit_rate, 'newBalance', v_new_balance);
END;
$$ LANGUAGE plpgsql;
