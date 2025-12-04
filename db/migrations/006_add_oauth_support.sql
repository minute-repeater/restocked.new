-- Migration: 006_add_oauth_support.sql
-- Description: Add OAuth support by making password_hash nullable and adding provider fields
-- Created: 2025-12-04

-- Make password_hash nullable to support OAuth users (who don't have passwords)
-- This is idempotent: if already nullable, the statement will succeed (no-op)
DO $$
BEGIN
  -- Check if column is NOT NULL before attempting to drop constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'password_hash' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END $$;

-- Add OAuth provider tracking fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT;

-- Add constraint to ensure valid provider values
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_oauth_provider_check;
ALTER TABLE users ADD CONSTRAINT users_oauth_provider_check 
  CHECK (oauth_provider IS NULL OR oauth_provider IN ('google', 'apple', 'local'));

-- Create index for OAuth provider lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider ON users (oauth_provider, oauth_provider_id) 
  WHERE oauth_provider IS NOT NULL;

-- Add unique constraint for OAuth provider + provider_id combination
-- This ensures one account per OAuth provider ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_unique 
  ON users (oauth_provider, oauth_provider_id) 
  WHERE oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL;

