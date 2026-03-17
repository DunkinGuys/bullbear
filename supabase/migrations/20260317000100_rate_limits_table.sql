-- ============================================
-- Rate limits table for persistent rate limiting
-- Replaces in-memory storage (doesn't work on serverless)
-- ============================================

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(256) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_key_created ON rate_limits (key, created_at DESC);

-- Auto-cleanup: delete entries older than 2 hours
-- Run via pg_cron or Supabase scheduled function
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql;

-- RLS: no anon access needed (only service_role writes)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
