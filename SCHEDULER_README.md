# Scheduler Service Documentation

## Overview

The Scheduler Service is an automated system that periodically checks tracked products for price and stock changes. It runs in the background and processes all tracked items at regular intervals.

## How It Works

### Architecture

1. **Scheduler Service** (`src/scheduler/schedulerService.ts`)
   - Uses `node-cron` to run checks on a schedule
   - Groups tracked items by product_id to avoid duplicate checks
   - Processes each product using the same logic as `POST /checks/run`
   - Logs all runs to `scheduler_logs` table

2. **Configuration** (`src/scheduler/schedulerConfig.ts`)
   - `ENABLE_SCHEDULER`: Enable/disable scheduler (default: `true`)
   - `CHECK_INTERVAL_MINUTES`: Interval between runs (default: `30`)

3. **Logging** (`scheduler_logs` table)
   - Records every scheduler run
   - Tracks products checked, items checked, success/failure
   - Stores errors and metadata

### Process Flow

1. **Scheduled Trigger**: Cron job triggers at configured interval
2. **Fetch Tracked Items**: Query all tracked items grouped by product_id
3. **Process Each Product**:
   - Fetch product page
   - Extract product data
   - Ingest into database (updates existing product/variants)
   - Create `check_runs` entry
4. **Log Results**: Record run details in `scheduler_logs`

### Duplicate Prevention

- Uses `isRunning` flag to prevent concurrent runs
- If a run is already in progress, new triggers are skipped
- Each run processes unique products only (grouped by product_id)

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Enable/disable scheduler (default: true)
ENABLE_SCHEDULER=true

# Interval between checks in minutes (default: 30)
CHECK_INTERVAL_MINUTES=30
```

### Examples

**Disable scheduler:**
```bash
ENABLE_SCHEDULER=false
```

**Run checks every hour:**
```bash
CHECK_INTERVAL_MINUTES=60
```

**Run checks every 15 minutes:**
```bash
CHECK_INTERVAL_MINUTES=15
```

## Admin Routes

All admin routes require authentication and admin role.

### GET /admin/scheduler/status

Get current scheduler status and latest run details.

**Response:**
```json
{
  "enabled": true,
  "isRunning": false,
  "lastRun": "2025-12-03T14:01:08.019Z",
  "nextRun": "2025-12-03T14:30:00.910Z",
  "intervalMinutes": 30,
  "currentRunId": null,
  "processed_products": 1,
  "lastRunDetails": {
    "run_started_at": "2025-12-03T14:01:08.019Z",
    "run_finished_at": "2025-12-03T14:01:11.718Z",
    "products_checked": 1,
    "items_checked": 4,
    "success": true,
    "error": null
  }
}
```

### POST /admin/scheduler/run-now

Trigger a scheduler run immediately (manual trigger).

**Response:**
```json
{
  "success": true,
  "message": "Scheduler run triggered",
  "status": { ... }
}
```

**Error if already running:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Scheduler is already running a check"
  }
}
```

## Admin Promotion Workflow

### Step 1: Create Admin User

Users start with role `'user'` by default. To promote a user to admin:

**POST /admin/users/:id/promote**

```bash
curl -X POST http://localhost:3000/admin/users/{user_id}/promote \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "success": true,
  "message": "User promoted to admin",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### Step 2: First Admin

If no admins exist, you can promote a user directly via SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Step 3: Access Admin Routes

Once promoted, the user can access all `/admin/*` routes with their JWT token.

## Manual Check Execution

### Via API (Admin Only)

```bash
# Trigger immediate scheduler run
curl -X POST http://localhost:3000/admin/scheduler/run-now \
  -H "Authorization: Bearer <admin_token>"
```

### Via Existing Check Endpoints

You can also manually check individual products:

```bash
# Check a product by URL
curl -X POST http://localhost:3000/checks/run \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/product"}'

# Re-check existing product
curl -X POST http://localhost:3000/checks/{product_id}
```

## Logs Storage

### Scheduler Logs Table

The `scheduler_logs` table stores:

- `id`: Log entry ID
- `run_started_at`: When the run started
- `run_finished_at`: When the run completed
- `products_checked`: Number of unique products checked
- `items_checked`: Total number of tracked items processed
- `success`: Whether the run succeeded
- `error`: Error message if failed
- `metadata`: JSONB with additional details (product IDs, errors, duration)

### Querying Logs

```sql
-- Get latest run
SELECT * FROM scheduler_logs 
ORDER BY run_started_at DESC 
LIMIT 1;

-- Get failed runs
SELECT * FROM scheduler_logs 
WHERE success = false 
ORDER BY run_started_at DESC;

-- Get runs in last 24 hours
SELECT * FROM scheduler_logs 
WHERE run_started_at > NOW() - INTERVAL '24 hours'
ORDER BY run_started_at DESC;
```

### Check Runs Table

Each product check also creates a `check_runs` entry:

```sql
-- Get check runs for a product
SELECT * FROM check_runs 
WHERE product_id = 3 
ORDER BY started_at DESC;
```

## Monitoring

### Check Scheduler Status

```bash
curl http://localhost:3000/admin/scheduler/status \
  -H "Authorization: Bearer <admin_token>"
```

### View Recent Logs

```sql
SELECT 
  run_started_at,
  run_finished_at,
  products_checked,
  items_checked,
  success,
  error
FROM scheduler_logs
ORDER BY run_started_at DESC
LIMIT 10;
```

### Monitor Check Runs

```sql
SELECT 
  cr.product_id,
  p.name,
  cr.started_at,
  cr.finished_at,
  cr.status,
  cr.error_message
FROM check_runs cr
JOIN products p ON cr.product_id = p.id
ORDER BY cr.started_at DESC
LIMIT 20;
```

## Troubleshooting

### Scheduler Not Starting

1. Check `ENABLE_SCHEDULER` is not `false`
2. Check server logs for scheduler startup messages
3. Verify database connection is working

### Scheduler Not Running Checks

1. Check if there are any tracked items:
   ```sql
   SELECT COUNT(*) FROM tracked_items;
   ```
2. Check scheduler status endpoint
3. Review scheduler logs for errors

### Admin Routes Returning 403

1. Verify user has `role = 'admin'`:
   ```sql
   SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
   ```
2. Ensure JWT token is valid and not expired
3. Check that `requireAuth` middleware is working

### Concurrent Run Prevention

If a run is already in progress, new triggers are skipped. This is intentional to prevent:
- Duplicate processing
- Resource conflicts
- Database contention

Wait for the current run to complete before triggering a new one.

## Best Practices

1. **Interval Selection**: 
   - 30 minutes: Good balance for most use cases
   - 15 minutes: More frequent checks (higher load)
   - 60+ minutes: Less frequent checks (lower load)

2. **Monitoring**:
   - Set up alerts for failed scheduler runs
   - Monitor `scheduler_logs` for errors
   - Track `check_runs` success rate

3. **Performance**:
   - Group tracked items by product_id (already implemented)
   - Process products sequentially to avoid overwhelming servers
   - Monitor database query performance

4. **Error Handling**:
   - Errors are logged but don't stop the scheduler
   - Individual product failures don't affect other products
   - Review logs regularly for patterns

## Future Enhancements

- **Notifications**: Send alerts when price/stock changes detected
- **Rate Limiting**: Per-domain rate limiting for checks
- **Retry Logic**: Automatic retry for failed checks
- **Priority Queue**: Prioritize certain products/variants
- **Distributed Processing**: Support for multiple scheduler instances

## API Reference

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/scheduler/status` | Get scheduler status | Admin |
| POST | `/admin/scheduler/run-now` | Trigger immediate run | Admin |
| POST | `/admin/users/:id/promote` | Promote user to admin | Admin |

### Database Tables

| Table | Purpose |
|-------|---------|
| `scheduler_logs` | Scheduler run history |
| `check_runs` | Individual product check history |
| `users` | User accounts (includes `role` column) |
| `tracked_items` | Products/variants users are tracking |

## Support

For issues or questions:
1. Check server logs for error messages
2. Review `scheduler_logs` table for run details
3. Verify configuration in `.env` file
4. Test admin routes with valid admin token

