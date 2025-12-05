-- Migration: 001_init.sql
-- Description: Initial schema for ReStocked product tracking system
-- Created: 2025-12-02

-- Enable UUID extension (if needed in future)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE PRODUCT TABLES
-- ============================================================================

-- products: Represents a logical product (one URL) - matches ProductShell
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    url             TEXT NOT NULL,
    canonical_url   TEXT,
    name            TEXT,
    description     TEXT,
    vendor          TEXT,                 -- store / brand / domain
    main_image_url  TEXT,
    metadata        JSONB,                -- extra data, raw notes, etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_canonical_url ON products (canonical_url);
CREATE INDEX idx_products_vendor ON products (vendor);
CREATE INDEX idx_products_url ON products (url);

-- variants: Represents a specific variant (size/color/length combo) - matches VariantShell
CREATE TABLE variants (
    id                  SERIAL PRIMARY KEY,
    product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku                 TEXT,
    attributes          JSONB NOT NULL,   -- e.g. { "size": "32", "color": "Black" }
    currency            TEXT,             -- latest known currency for this variant
    current_price       NUMERIC(12, 2),   -- latest known price
    current_stock_status TEXT,            -- e.g. 'in_stock', 'out_of_stock', 'unknown'
    is_available        BOOLEAN,          -- simplified availability flag
    last_checked_at     TIMESTAMPTZ,
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_variants_product_id ON variants (product_id);
CREATE INDEX idx_variants_sku ON variants (sku);
CREATE INDEX idx_variants_stock_status ON variants (current_stock_status);
CREATE INDEX idx_variants_attributes ON variants USING GIN (attributes);

-- variant_price_history: Time-series price history per variant
CREATE TABLE variant_price_history (
    id              SERIAL PRIMARY KEY,
    variant_id      INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    price           NUMERIC(12, 2),
    currency        TEXT,
    raw             TEXT,         -- raw price string from extraction
    metadata        JSONB         -- extra info: source strategy, notes, etc.
);

CREATE INDEX idx_price_history_variant_id ON variant_price_history (variant_id);
CREATE INDEX idx_price_history_recorded_at ON variant_price_history (recorded_at);
CREATE INDEX idx_price_history_variant_recorded ON variant_price_history (variant_id, recorded_at DESC);

-- variant_stock_history: Time-series stock/availability per variant
CREATE TABLE variant_stock_history (
    id              SERIAL PRIMARY KEY,
    variant_id      INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          TEXT NOT NULL,   -- 'in_stock', 'out_of_stock', 'low_stock', etc.
    raw             TEXT,            -- raw stock text / availability value
    metadata        JSONB
);

CREATE INDEX idx_stock_history_variant_id ON variant_stock_history (variant_id);
CREATE INDEX idx_stock_history_recorded_at ON variant_stock_history (recorded_at);
CREATE INDEX idx_stock_history_status ON variant_stock_history (status);
CREATE INDEX idx_stock_history_variant_recorded ON variant_stock_history (variant_id, recorded_at DESC);

-- ============================================================================
-- USER & TRACKING TABLES
-- ============================================================================

-- users: Basic user accounts
CREATE TABLE users (
    id                SERIAL PRIMARY KEY,
    email             TEXT NOT NULL UNIQUE,
    hashed_password   TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- tracked_items: Link between users and products/variants they want to monitor
CREATE TABLE tracked_items (
    id                    SERIAL PRIMARY KEY,
    user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id            INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id            INTEGER REFERENCES variants(id) ON DELETE CASCADE,
    alias                 TEXT,               -- user-friendly label
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure a user doesn't track the same product+variant combo twice
    UNIQUE(user_id, product_id, variant_id)
);

CREATE INDEX idx_tracked_items_user_id ON tracked_items (user_id);
CREATE INDEX idx_tracked_items_product_id ON tracked_items (product_id);
CREATE INDEX idx_tracked_items_variant_id ON tracked_items (variant_id);
CREATE INDEX idx_tracked_items_user_product ON tracked_items (user_id, product_id);

-- notifications: Log of notifications sent to users
CREATE TABLE notifications (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tracked_item_id   INTEGER NOT NULL REFERENCES tracked_items(id) ON DELETE CASCADE,
    variant_id        INTEGER REFERENCES variants(id) ON DELETE SET NULL,
    event_type        TEXT NOT NULL,     -- 'restock', 'price_drop', 'new_variant', etc.
    old_price         NUMERIC(12, 2),
    new_price         NUMERIC(12, 2),
    old_status        TEXT,
    new_status        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered         BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at      TIMESTAMPTZ,
    metadata          JSONB
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_tracked_item_id ON notifications (tracked_item_id);
CREATE INDEX idx_notifications_created_at ON notifications (created_at);
CREATE INDEX idx_notifications_delivered ON notifications (delivered, created_at);
CREATE INDEX idx_notifications_event_type ON notifications (event_type);

-- ============================================================================
-- SCHEDULER & JOB TRACKING
-- ============================================================================

-- check_runs: Track each "check" of a product/URL - useful for debugging and retries
CREATE TABLE check_runs (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    status          TEXT NOT NULL,      -- 'success', 'failed', 'partial'
    error_message   TEXT,
    metadata        JSONB               -- timing, which strategies ran, etc.
);

CREATE INDEX idx_check_runs_product_id ON check_runs (product_id);
CREATE INDEX idx_check_runs_started_at ON check_runs (started_at);
CREATE INDEX idx_check_runs_status ON check_runs (status);
CREATE INDEX idx_check_runs_product_started ON check_runs (product_id, started_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracked_items_updated_at BEFORE UPDATE ON tracked_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();





