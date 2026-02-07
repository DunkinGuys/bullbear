-- Add last_heartbeat column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE;
