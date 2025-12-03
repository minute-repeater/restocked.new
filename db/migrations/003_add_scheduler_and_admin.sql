-- Migration: 003_add_scheduler_and_admin.sql
-- Description: Add scheduler logging table and user role column
-- Created: 2025-12-03

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Add check constraint for valid roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

-- Create index on role for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Create scheduler_logs table
CREATE TABLE IF NOT EXISTS scheduler_logs (
    id                  SERIAL PRIMARY KEY,
    run_started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    run_finished_at     TIMESTAMPTZ,
    products_checked    INTEGER NOT NULL DEFAULT 0,
    items_checked       INTEGER NOT NULL DEFAULT 0,
    success             BOOLEAN NOT NULL DEFAULT FALSE,
    error               TEXT,
    metadata            JSONB
);

-- Create indexes for scheduler logs
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_run_started_at ON scheduler_logs (run_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_success ON scheduler_logs (success);
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_run_started_success ON scheduler_logs (run_started_at DESC, success);

