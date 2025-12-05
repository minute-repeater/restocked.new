# Database Schema Documentation

This directory contains PostgreSQL migrations for the ReStocked product tracking system.

## Overview

The schema is designed to support:
- Product extraction and storage
- Variant tracking with attributes
- Price history tracking
- Stock/availability history tracking
- User accounts and tracked items
- Notification logging
- Scheduler job tracking

## Running Migrations

### Using psql (PostgreSQL command-line)

```bash
# Connect to your database
psql -U your_user -d your_database

# Run the migration
\i db/migrations/001_init.sql
```

### Using a migration script

```bash
# If you have a migration runner script
npm run migrate
# or
node scripts/migrate.js
```

### Environment Variables

Ensure you have the following environment variables set:
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/restocked`)

## Table Descriptions

### Core Product Tables

#### `products`
Represents a logical product (one URL). Matches the `ProductShell` structure from the extraction engine.

**Key Fields:**
- `url` - Original product URL
- `canonical_url` - Normalized/canonical URL after redirects
- `name` - Product title/name
- `description` - Product description
- `vendor` - Store/brand/domain name
- `main_image_url` - Primary product image
- `metadata` - JSONB field for extra data, raw notes, extraction metadata

**Relationships:**
- One product has many variants
- One product has many check_runs

#### `variants`
Represents a specific product variant (size/color/length combination). Matches the `VariantShell` structure.

**Key Fields:**
- `product_id` - Foreign key to products
- `sku` - Stock keeping unit (if available)
- `attributes` - JSONB array of variant attributes (e.g., `[{"name": "size", "value": "32"}, {"name": "color", "value": "Black"}]`)
- `currency` - Latest known currency code
- `current_price` - Latest known price
- `current_stock_status` - Latest stock status ('in_stock', 'out_of_stock', 'low_stock', 'backorder', 'preorder', 'unknown')
- `is_available` - Simplified boolean availability flag
- `last_checked_at` - Timestamp of last check
- `metadata` - JSONB for variant-specific metadata

**Relationships:**
- Belongs to one product
- Has many price_history entries
- Has many stock_history entries

#### `variant_price_history`
Time-series table tracking price changes over time for each variant.

**Key Fields:**
- `variant_id` - Foreign key to variants
- `recorded_at` - When this price was recorded
- `price` - Numeric price value
- `currency` - Currency code
- `raw` - Original raw price string from extraction
- `metadata` - JSONB with extraction source, strategy used, notes, etc.

**Use Cases:**
- Price drop detection
- Price trend analysis
- Historical price queries

#### `variant_stock_history`
Time-series table tracking stock/availability changes over time for each variant.

**Key Fields:**
- `variant_id` - Foreign key to variants
- `recorded_at` - When this status was recorded
- `status` - Stock status ('in_stock', 'out_of_stock', 'low_stock', 'backorder', 'preorder', 'unknown')
- `raw` - Original raw stock text from extraction
- `metadata` - JSONB with extraction source, strategy used, notes, etc.

**Use Cases:**
- Restock detection
- Availability trend analysis
- Historical availability queries

### User & Tracking Tables

#### `users`
Basic user account information.

**Key Fields:**
- `email` - Unique user email address
- `hashed_password` - Password hash (use bcrypt or similar)

#### `tracked_items`
Links users to products/variants they want to monitor.

**Key Fields:**
- `user_id` - Foreign key to users
- `product_id` - Foreign key to products
- `variant_id` - Foreign key to variants (NULL = track any variant of the product)
- `alias` - User-friendly label for this tracked item
- `notifications_enabled` - Whether to send notifications for this item

**Relationships:**
- Belongs to one user
- Belongs to one product
- Optionally belongs to one variant (NULL means track all variants)

**Note:** If `variant_id` is NULL, the user tracks any variant of that product. If set, the user tracks that specific variant.

#### `notifications`
Log of all notifications sent to users about tracked items.

**Key Fields:**
- `user_id` - Foreign key to users
- `tracked_item_id` - Foreign key to tracked_items
- `variant_id` - Foreign key to variants (which variant triggered the notification)
- `event_type` - Type of event ('restock', 'price_drop', 'new_variant', etc.)
- `old_price` / `new_price` - Price change values
- `old_status` / `new_status` - Stock status change values
- `delivered` - Whether notification was successfully delivered
- `delivered_at` - When notification was delivered
- `metadata` - JSONB for notification-specific data

**Use Cases:**
- Notification history
- Delivery tracking
- User notification preferences

### Scheduler & Job Tracking

#### `check_runs`
Tracks each execution of a product check/scan. Useful for debugging, retries, and monitoring.

**Key Fields:**
- `product_id` - Foreign key to products
- `started_at` - When the check started
- `finished_at` - When the check completed (NULL if still running)
- `status` - Check status ('success', 'failed', 'partial')
- `error_message` - Error details if status is 'failed'
- `metadata` - JSONB with timing info, which strategies ran, extraction notes, etc.

**Use Cases:**
- Debugging failed extractions
- Monitoring check frequency
- Retry logic
- Performance analysis

## Indexes

All tables have appropriate indexes for:
- Foreign key lookups
- Common query patterns (user_id, product_id, variant_id)
- Time-series queries (recorded_at, started_at)
- Status filtering (stock_status, event_type, status)
- JSONB queries (GIN indexes on attributes and metadata fields)

## Constraints

- Foreign keys with appropriate CASCADE/SET NULL behavior
- Unique constraints on user email
- Unique constraint on tracked_items (user_id, product_id, variant_id)
- NOT NULL constraints on required fields

## Triggers

Automatic `updated_at` timestamp updates on:
- products
- variants
- users
- tracked_items

## Future Considerations

This schema supports:
- Multi-tenant architecture (vendor-based separation)
- Scalable time-series data (can partition history tables by date if needed)
- Flexible metadata storage (JSONB fields)
- Notification delivery tracking
- Scheduler job monitoring

## Notes

- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- Price values use `NUMERIC(12, 2)` for precision
- JSONB fields allow flexible schema evolution
- Foreign keys use appropriate CASCADE rules for data integrity





