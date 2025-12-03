-- Migration: 004_notifications_system.sql
-- Description: Add notification system tables and update notifications table
-- Created: 2025-12-03

-- Update notifications table to match new requirements
-- First, drop old foreign key constraints if they exist
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tracked_item_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_variant_id_fkey;

-- Add new columns first (before dropping old ones to preserve data)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notify_price_change BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notify_restock BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notify_oos BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate existing data: set product_id and type from tracked_item_id and event_type
UPDATE notifications n
SET product_id = ti.product_id,
    type = CASE 
      WHEN n.event_type LIKE '%restock%' OR n.event_type LIKE '%stock%' THEN 'RESTOCK'
      WHEN n.event_type LIKE '%price%' THEN 'PRICE'
      ELSE 'STOCK'
    END,
    message = CASE
      WHEN n.event_type LIKE '%restock%' THEN 'Product is back in stock!'
      WHEN n.event_type LIKE '%price%' THEN 'Price changed'
      ELSE 'Stock status changed'
    END
FROM tracked_items ti
WHERE n.tracked_item_id = ti.id
AND n.product_id IS NULL;

-- Now drop old columns
ALTER TABLE notifications DROP COLUMN IF EXISTS tracked_item_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS event_type;

-- Add foreign key constraints for new columns
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_variant_id_fkey 
  FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE SET NULL;

-- Update type constraint and set defaults
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ALTER COLUMN type SET DEFAULT 'STOCK';
ALTER TABLE notifications ALTER COLUMN type SET NOT NULL;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('STOCK', 'PRICE', 'RESTOCK'));

-- Set default type for any NULL values
UPDATE notifications SET type = 'STOCK' WHERE type IS NULL;

-- Create user_notification_settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    threshold_percentage INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON user_notification_settings (user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_product_id ON notifications (product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications (sent, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_sent ON notifications (user_id, sent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (read, created_at DESC);

