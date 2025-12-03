# Background Automated Product Checks Implementation

## ✅ Implementation Complete

All components for background automated product checks have been implemented and are ready for production use.

## Files Created

### Core Worker
1. **`src/jobs/checkWorker.ts`**
   - `CheckWorker` class - Core worker logic
   - Fetches tracked items grouped by product
   - Skips products checked too recently
   - Uses PostgreSQL advisory locks for concurrency safety
   - Runs extraction and updates variants
   - Creates check_runs entries

2. **`src/jobs/checkScheduler.ts`**
   - `CheckScheduler` class - Periodic scheduler
   - Runs checks on configurable interval
   - Prevents concurrent runs
   - Exports singleton instance

3. **`src/jobs/runChecks.ts`**
   - Standalone script for manual/cron execution
   - Can be run independently of the API server
   - Returns exit codes for monitoring

### Updated Files
4. **`src/api/routes/admin.ts`**
   - Added `GET /admin/checks/recent` - Recent check runs
   - Added `GET /admin/checks/stats` - Check statistics
   - Added `GET /admin/checks/slow` - Slowest checks
   - Added `POST /admin/checks/run-now` - Manual trigger

5. **`src/api/server.ts`**
   - Integrated check scheduler startup
   - Starts automatically with API server

## Features Implemented

### ✅ Check Worker (`CheckWorker`)
- **Product Selection**: Fetches products with tracked items
- **Skip Logic**: Skips products checked within `minCheckIntervalMinutes` (default: 30)
- **Concurrency Safety**: Uses PostgreSQL advisory locks (per-product)
- **Lock Timeout**: Configurable timeout (default: 5 minutes)
- **Batch Processing**: Processes up to `maxProductsPerRun` products (default: 50)
- **Error Handling**: Continues processing on individual failures
- **Check Runs**: Creates `check_runs` entries for all checks

### ✅ Concurrency-Safe Locking
- **PostgreSQL Advisory Locks**: Uses `pg_try_advisory_lock()` for non-blocking locks
- **Per-Product Locks**: Each product has its own lock key
- **Lock Timeout**: Prevents deadlocks with configurable timeout
- **Automatic Release**: Locks released even on errors
- **Race Condition Protection**: Double-checks recent checks after acquiring lock

### ✅ Check Scheduler (`CheckScheduler`)
- **Periodic Execution**: Runs on configurable interval (default: 30 minutes)
- **Prevents Duplicates**: Uses `isRunning` flag to prevent concurrent runs
- **Configurable**: Can be enabled/disabled via environment variable
- **Status API**: Provides status information

### ✅ Admin Endpoints

#### GET /admin/checks/recent
Get recent check runs with filtering.

**Query Parameters:**
- `limit` (optional): Number of checks (default: 50, max: 200)
- `product_id` (optional): Filter by product ID
- `status` (optional): Filter by status ('success', 'failed')

**Response:**
```json
{
  "checks": [
    {
      "id": 1,
      "product_id": 123,
      "product_name": "Product Name",
      "product_url": "https://example.com/product",
      "started_at": "2025-12-03T10:00:00Z",
      "finished_at": "2025-12-03T10:00:05Z",
      "status": "success",
      "error_message": null,
      "metadata": {...},
      "duration_ms": 5000
    }
  ],
  "count": 1,
  "limit": 50
}
```

#### GET /admin/checks/stats
Get check run statistics.

**Response:**
```json
{
  "overall": {
    "total_checks": 1000,
    "successful_checks": 950,
    "failed_checks": 50,
    "avg_duration_ms": 3500,
    "max_duration_ms": 15000,
    "min_duration_ms": 500
  },
  "recent": {
    "checks_last_24h": 100,
    "successful_last_24h": 95,
    "failed_last_24h": 5,
    "unique_products_checked": 50
  },
  "statusBreakdown": [
    { "status": "success", "count": 950 },
    { "status": "failed", "count": 50 }
  ]
}
```

#### GET /admin/checks/slow
Get slowest check runs.

**Query Parameters:**
- `limit` (optional): Number of checks (default: 20, max: 100)
- `min_duration_ms` (optional): Minimum duration in milliseconds

**Response:**
```json
{
  "checks": [
    {
      "id": 1,
      "product_id": 123,
      "product_name": "Product Name",
      "product_url": "https://example.com/product",
      "started_at": "2025-12-03T10:00:00Z",
      "finished_at": "2025-12-03T10:00:15Z",
      "status": "success",
      "duration_ms": 15000
    }
  ],
  "count": 1,
  "limit": 20
}
```

#### POST /admin/checks/run-now
Trigger a check run immediately.

**Response:**
```json
{
  "success": true,
  "message": "Check run triggered",
  "status": {
    "enabled": true,
    "isRunning": false,
    "intervalMinutes": 30,
    "cronJobActive": true
  }
}
```

## Configuration

### Environment Variables

```bash
# Check Worker Configuration
MIN_CHECK_INTERVAL_MINUTES=30      # Minimum minutes between checks for same product
MAX_PRODUCTS_PER_RUN=50            # Maximum products to check per run
CHECK_LOCK_TIMEOUT_SECONDS=300     # Lock timeout (5 minutes)

# Check Scheduler Configuration
ENABLE_CHECK_SCHEDULER=true        # Enable/disable check scheduler
CHECK_SCHEDULER_INTERVAL_MINUTES=30 # Interval between scheduler runs
```

## How It Works

### 1. Product Selection
- Queries `tracked_items` to find products with active tracking
- Joins with `check_runs` to find last check time
- Filters products not checked within `minCheckIntervalMinutes`
- Orders by last check time (oldest first)
- Limits to `maxProductsPerRun` products

### 2. Concurrency Safety
- Uses PostgreSQL advisory locks (`pg_try_advisory_lock`)
- Lock key: `1000000 + productId` (avoids conflicts)
- Non-blocking: If lock unavailable, skips product
- Lock timeout prevents deadlocks
- Double-checks recent checks after acquiring lock

### 3. Product Check Flow
1. Acquire advisory lock for product
2. Verify product hasn't been checked recently (race condition protection)
3. Fetch product page
4. Extract ProductShell
5. Ingest into database (updates variants, creates notifications)
6. Create `check_runs` entry
7. Release lock

### 4. Error Handling
- Individual product failures don't stop the run
- Failed checks create `check_runs` entries with error details
- Lock is always released, even on errors
- Errors are logged and returned in result

## Usage

### Standalone Script
```bash
# Build first
npm run build

# Run checks manually
node dist/jobs/runChecks.js
```

### Via Cron
```bash
# Run every 30 minutes
*/30 * * * * cd /path/to/project && node dist/jobs/runChecks.js
```

### Via Railway Scheduled Tasks
Create a scheduled task in Railway:
- Command: `node dist/jobs/runChecks.js`
- Schedule: Every 30 minutes

### Via API Server
The check scheduler starts automatically with the API server. It runs checks every 30 minutes (configurable).

### Manual Trigger (Admin)
```bash
curl -X POST http://localhost:3000/admin/checks/run-now \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Monitoring

### Check Recent Runs
```bash
curl http://localhost:3000/admin/checks/recent?limit=10 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Check Statistics
```bash
curl http://localhost:3000/admin/checks/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Check Slow Runs
```bash
curl http://localhost:3000/admin/checks/slow?min_duration_ms=10000 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Concurrency Safety

### Multiple Workers
- Multiple workers can run simultaneously
- Each product is locked individually
- Workers won't check the same product concurrently
- Lock timeout prevents deadlocks

### Lock Key Strategy
- Uses `1000000 + productId` as lock key
- Avoids conflicts with other application locks
- Each product has unique lock key

### Race Condition Protection
- Double-checks recent checks after acquiring lock
- Prevents checking products that were just checked by another worker
- Uses database-level locking for true concurrency safety

## Performance Considerations

### Batch Size
- Default: 50 products per run
- Configurable via `MAX_PRODUCTS_PER_RUN`
- Larger batches = longer runs but fewer database queries

### Check Interval
- Default: 30 minutes minimum between checks
- Configurable via `MIN_CHECK_INTERVAL_MINUTES`
- Shorter intervals = more frequent checks but more load

### Lock Timeout
- Default: 5 minutes
- Configurable via `CHECK_LOCK_TIMEOUT_SECONDS`
- Prevents deadlocks from stuck locks

## Testing

### Test Manual Run
```bash
node dist/jobs/runChecks.js
```

### Test Admin Endpoints
1. Get admin token
2. Call admin endpoints
3. Verify responses

### Test Concurrency
1. Start multiple workers simultaneously
2. Verify no duplicate checks
3. Check lock behavior

## Troubleshooting

### Checks Not Running
- Verify `ENABLE_CHECK_SCHEDULER=true`
- Check scheduler logs
- Verify database connection
- Check for lock conflicts

### Too Many Failed Checks
- Check product URLs are valid
- Verify network connectivity
- Check extraction logs
- Review error messages in `check_runs` table

### Slow Performance
- Reduce `MAX_PRODUCTS_PER_RUN`
- Increase `MIN_CHECK_INTERVAL_MINUTES`
- Check database indexes
- Monitor lock contention

### Lock Timeouts
- Increase `CHECK_LOCK_TIMEOUT_SECONDS`
- Check for stuck locks: `SELECT * FROM pg_locks WHERE locktype = 'advisory'`
- Verify workers are releasing locks

## Database Queries

### Find Products Needing Checks
```sql
SELECT p.id, p.url
FROM products p
INNER JOIN tracked_items ti ON p.id = ti.product_id
LEFT JOIN (
  SELECT product_id, MAX(finished_at) as last_check
  FROM check_runs
  GROUP BY product_id
) lc ON p.id = lc.product_id
WHERE lc.last_check IS NULL 
   OR lc.last_check < NOW() - INTERVAL '30 minutes'
ORDER BY COALESCE(lc.last_check, '1970-01-01') ASC
LIMIT 50;
```

### Check Lock Status
```sql
SELECT * FROM pg_locks 
WHERE locktype = 'advisory' 
  AND objid >= 1000000;
```

### Recent Check Runs
```sql
SELECT * FROM check_runs 
ORDER BY started_at DESC 
LIMIT 50;
```

## Next Steps

1. **Monitor Performance**: Track check durations and success rates
2. **Optimize Intervals**: Adjust based on actual usage patterns
3. **Add Retries**: Implement retry logic for failed checks
4. **Add Alerts**: Alert on high failure rates or slow checks
5. **Add Metrics**: Export metrics to monitoring system

