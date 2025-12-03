-- Migration: 002_update_users_auth.sql
-- Description: Update users table for authentication with UUID and password_hash
-- Created: 2025-12-03

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing users table and recreate with UUID primary key
-- This is safe because there are no users yet (verified)

-- Drop foreign key constraints first
ALTER TABLE tracked_items DROP CONSTRAINT IF EXISTS tracked_items_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Since there are no users yet, we can safely alter the columns directly
-- Change tracked_items.user_id from INTEGER to UUID
ALTER TABLE tracked_items ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;

-- Change notifications.user_id from INTEGER to UUID  
ALTER TABLE notifications ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;

-- Drop the old users table
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table with UUID primary key
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email             TEXT NOT NULL UNIQUE,
    password_hash     TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recreate indexes
CREATE INDEX idx_users_email ON users (email);

-- Ensure email is stored in lowercase (application will handle this, but add check constraint)
ALTER TABLE users ADD CONSTRAINT users_email_lowercase CHECK (email = LOWER(email));

-- Recreate foreign key constraints with UUID
ALTER TABLE tracked_items 
    ADD CONSTRAINT tracked_items_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications 
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Recreate updated_at trigger
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

