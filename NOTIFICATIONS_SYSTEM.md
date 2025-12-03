# Notifications System Documentation

## Overview

The Notifications System is a complete backend implementation for Restocked.now that automatically detects price and stock changes and delivers notifications to users via email.

## Architecture

### Components

1. **Notification Service** (`src/services/notificationService.ts`)
   - Detects price and stock changes
   - Creates notification entries in the database
   - Formats notification messages

2. **Email Service** (`src/services/emailService.ts`)
   - Sends notification emails via Resend
   - Formats HTML email templates
   - Handles email delivery errors

3. **Email Delivery Job** (`src/jobs/emailDeliveryJob.ts`)
   - Processes unsent notifications
   - Sends emails in batches
   - Marks notifications as sent

4. **Email Delivery Scheduler** (`src/jobs/emailDeliveryScheduler.ts`)
   - Runs periodically to process email queue
   - Configurable interval (default: 5 minutes)

5. **API Endpoints** (`src/api/routes/notifications.ts`, `src/api/routes/userSettings.ts`)
   - GET `/me/notifications` - Fetch user notifications
   - POST `/me/notifications/mark-read` - Mark notifications as read
   - GET `/me/settings/notifications` - Get notification settings
   - POST `/me/settings/notifications` - Update notification settings

## Database Schema

### notifications table

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES variants(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('STOCK', 'PRICE', 'RESTOCK')),
    message TEXT,
    old_price NUMERIC(12, 2),
    new_price NUMERIC(12, 2),
    old_status TEXT,
    new_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    notify_price_change BOOLEAN NOT NULL DEFAULT TRUE,
    notify_restock BOOLEAN NOT NULL DEFAULT TRUE,
    notify_oos BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB
);
```

### user_notification_settings table

```sql
CREATE TABLE user_notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    threshold_percentage INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## How It Works

### 1. Change Detection

When a product is checked (via scheduler or manual check):

1. **Price History Insertion**
   - `ProductIngestionService` inserts price history only if price changed
   - Calls `notificationService.checkPriceChange()` after insertion
   - Compares new price with previous price
   - Calculates percentage change

2. **Stock History Insertion**
   - `ProductIngestionService` inserts stock history only if status changed
   - Calls `notificationService.checkStockChange()` after insertion
   - Detects restocks (out_of_stock → in_stock)
   - Detects out-of-stock events

### 2. Notification Creation

For each detected change:

1. Find all tracked items for the variant/product
2. Check user notification settings
3. Check if change exceeds threshold (for price changes)
4. Create notification entry if conditions met

### 3. Email Delivery

1. **Email Delivery Scheduler** runs every 5 minutes (configurable)
2. Fetches unsent notifications (batch size: 50)
3. For each notification:
   - Get user email and settings
   - Get product details
   - Send email via Resend
   - Mark notification as sent

## Configuration

### Environment Variables

```bash
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=notifications@restocked.now
EMAIL_FROM_NAME=Restocked
FRONTEND_URL=https://restocked.now

# Email Delivery Scheduler
EMAIL_DELIVERY_INTERVAL_MINUTES=5  # Default: 5 minutes

# Product Check Scheduler
ENABLE_SCHEDULER=true
CHECK_INTERVAL_MINUTES=30
```

## API Endpoints

### GET /me/notifications

Get notifications for the authenticated user.

**Query Parameters:**
- `limit` (optional): Number of notifications (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "user_id": "uuid",
      "product_id": 123,
      "variant_id": 456,
      "type": "RESTOCK",
      "message": "Product is back in stock!",
      "old_status": "out_of_stock",
      "new_status": "in_stock",
      "created_at": "2025-12-03T10:00:00Z",
      "sent": true,
      "sent_at": "2025-12-03T10:05:00Z",
      "read": false
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 1
  },
  "unreadCount": 5
}
```

### POST /me/notifications/mark-read

Mark notifications as read.

**Body:**
```json
{
  "notificationIds": [1, 2, 3]  // Optional: if empty, marks all as read
}
```

**Response:**
```json
{
  "success": true,
  "markedCount": 3
}
```

### GET /me/settings/notifications

Get notification settings for the authenticated user.

**Response:**
```json
{
  "settings": {
    "user_id": "uuid",
    "email_enabled": true,
    "push_enabled": false,
    "threshold_percentage": 10,
    "created_at": "2025-12-03T10:00:00Z",
    "updated_at": "2025-12-03T10:00:00Z"
  }
}
```

### POST /me/settings/notifications

Update notification settings.

**Body:**
```json
{
  "email_enabled": true,        // Optional
  "push_enabled": false,        // Optional
  "threshold_percentage": 15     // Optional (0-100)
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "user_id": "uuid",
    "email_enabled": true,
    "push_enabled": false,
    "threshold_percentage": 15,
    "created_at": "2025-12-03T10:00:00Z",
    "updated_at": "2025-12-03T10:15:00Z"
  }
}
```

## Notification Types

### PRICE
Triggered when:
- Price changes exceed user's threshold percentage
- User has `notify_price_change` enabled

Message format: `"{productName} price {increased/decreased} by {X}% from {oldPrice} to {newPrice}"`

### RESTOCK
Triggered when:
- Stock status changes from `out_of_stock` or `unknown` to `in_stock`
- User has `notify_restock` enabled

Message format: `"{productName} is back in stock!"`

### STOCK
Triggered when:
- Stock status changes (not a restock)
- User has notifications enabled

Message format: `"{productName} stock changed from {oldStatus} to {newStatus}"`

## Email Templates

### Notification Email

- **Restock**: Green background, celebratory message
- **Price Drop**: Blue background, shows percentage decrease
- **Price Increase**: Orange background, shows percentage increase
- **Out of Stock**: Red background, warning message

All emails include:
- Product name and change details
- "View Product" button linking to product URL
- Footer with link to manage tracked items

### Weekly Summary Email

Sent weekly (future feature) with:
- Products tracked count
- Price changes count
- Restocks count
- Out of stock count

## Running Email Delivery Manually

You can run the email delivery job manually:

```bash
# Build first
npm run build

# Run email delivery job
node dist/jobs/runEmailDelivery.js
```

Or via Railway CLI:

```bash
railway run node dist/jobs/runEmailDelivery.js
```

## Railway Deployment

### 1. Set Environment Variables

In Railway dashboard, add:
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `EMAIL_DELIVERY_INTERVAL_MINUTES` (optional)
- `FRONTEND_URL`

### 2. Run Migrations

```bash
railway run psql "$DATABASE_URL" -f db/migrations/004_notifications_system.sql
```

### 3. Deploy

The email delivery scheduler starts automatically with the API server.

### 4. Optional: Separate Email Worker

For high-volume deployments, you can run email delivery as a separate service:

```bash
# In Railway, create a new service
# Command: node dist/jobs/runEmailDelivery.js
# Schedule: Every 5 minutes (via cron)
```

## Testing

### Test Notification Creation

1. Track a product
2. Manually trigger a check: `POST /checks/:productId`
3. Change the product price/stock on the website
4. Run another check
5. Verify notification created: `GET /me/notifications`

### Test Email Delivery

1. Create a test notification (or wait for real one)
2. Run email delivery job: `node dist/jobs/runEmailDelivery.js`
3. Check email inbox
4. Verify notification marked as sent: `GET /me/notifications`

### Test Settings

1. Get current settings: `GET /me/settings/notifications`
2. Update threshold: `POST /me/settings/notifications` with `{"threshold_percentage": 20}`
3. Verify update: `GET /me/settings/notifications`

## Troubleshooting

### Notifications Not Created

- Check if product/variant is tracked: `GET /me/tracked-items`
- Check user settings: `GET /me/settings/notifications`
- Check if change exceeds threshold (for price changes)
- Check server logs for errors

### Emails Not Sending

- Verify `RESEND_API_KEY` is set
- Check Resend dashboard for API errors
- Verify `EMAIL_FROM` domain is verified in Resend
- Check email delivery scheduler logs
- Run email delivery manually to test

### Too Many Notifications

- Increase `threshold_percentage` in user settings
- Disable `email_enabled` for specific notification types
- Check if duplicate notifications are being created

## Future Enhancements

- [ ] Push notifications (web push)
- [ ] SMS notifications (via Twilio)
- [ ] Weekly summary emails
- [ ] Notification preferences per tracked item
- [ ] Notification digest (batch multiple notifications)
- [ ] Custom notification templates
- [ ] Notification analytics dashboard

