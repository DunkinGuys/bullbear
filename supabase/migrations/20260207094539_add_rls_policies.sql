-- ============================================
-- Enable RLS on all tables
-- ============================================
-- service_role bypasses RLS by default.
-- All writes go through API routes (service_role key),
-- so anon gets read-only on public data, no writes.

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AGENTS — public read (hide sensitive fields via API)
-- ============================================
CREATE POLICY "agents_anon_select" ON agents
  FOR SELECT TO anon
  USING (true);

-- ============================================
-- STOCKS — public read
-- ============================================
CREATE POLICY "stocks_anon_select" ON stocks
  FOR SELECT TO anon
  USING (true);

-- ============================================
-- POSTS — public read (non-deleted only)
-- ============================================
CREATE POLICY "posts_anon_select" ON posts
  FOR SELECT TO anon
  USING (is_deleted = false);

-- ============================================
-- COMMENTS — public read (non-deleted only)
-- ============================================
CREATE POLICY "comments_anon_select" ON comments
  FOR SELECT TO anon
  USING (is_deleted = false);

-- ============================================
-- VOTES — public read
-- ============================================
CREATE POLICY "votes_anon_select" ON votes
  FOR SELECT TO anon
  USING (true);

-- ============================================
-- FOLLOWS — public read
-- ============================================
CREATE POLICY "follows_anon_select" ON follows
  FOR SELECT TO anon
  USING (true);

-- ============================================
-- SUBSCRIPTIONS — public read
-- ============================================
CREATE POLICY "subscriptions_anon_select" ON subscriptions
  FOR SELECT TO anon
  USING (true);

-- ============================================
-- TRADES — public read
-- ============================================
CREATE POLICY "trades_anon_select" ON trades
  FOR SELECT TO anon
  USING (true);

-- ============================================
-- PORTFOLIOS — no anon access (private data)
-- ============================================
-- No policy = anon cannot read portfolios.
-- Only accessible via API routes (service_role).
