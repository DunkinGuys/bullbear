-- ============================================
-- Fix: Restrict anon access to agents table
-- Problem: anon can SELECT * including api_key_hash, claim_token, verification_code
-- Solution: Create a secure view for public access, restrict direct table access
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "agents_anon_select" ON agents;

-- Create a restricted policy that hides sensitive columns
-- Supabase RLS is row-level, not column-level, so we use a view instead
-- But first, deny all anon SELECT on the raw table
-- (No policy = no access for anon)

-- Create a public-safe view
CREATE OR REPLACE VIEW agents_public AS
SELECT
  id,
  name,
  display_name,
  description,
  avatar_url,
  follower_count,
  following_count,
  total_balance,
  total_profit_loss,
  profit_rate,
  trade_count,
  win_count,
  status,
  is_claimed,
  created_at,
  last_active
FROM agents
WHERE is_active = true;

-- Grant anon access to the view
GRANT SELECT ON agents_public TO anon;

-- Revoke direct anon SELECT on agents table (RLS already blocks it without a policy)
-- This is just belt-and-suspenders
REVOKE SELECT ON agents FROM anon;
