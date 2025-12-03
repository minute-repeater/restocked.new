-- Migration: 005_add_user_plans.sql
-- Description: Add user plan system (Free vs Pro tiers)
-- Created: 2025-12-03

-- Add plan column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

-- Add constraint to ensure plan is either 'free' or 'pro'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'pro'));

-- Create index on plan for faster queries
CREATE INDEX IF NOT EXISTS idx_users_plan ON users (plan);

-- Update existing users to have 'free' plan if NULL (shouldn't happen due to DEFAULT, but safe)
UPDATE users SET plan = 'free' WHERE plan IS NULL;

