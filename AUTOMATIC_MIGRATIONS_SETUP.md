# Automatic Migrations Setup - Railway Deployment

**Status:** ✅ Configured for automatic execution  
**Date:** December 2025

---

## ✅ Changes Made

### 1. Startup Script Created
- **File:** `src/db/runMigrationsAndStart.ts`
- **Compiled to:** `dist/db/runMigrationsAndStart.js`
- **Purpose:** Runs migrations before starting the Express server

### 2. Package.json Updated
- **Start command changed from:** `node dist/api/server.js`
- **Start command changed to:** `node dist/db/runMigrationsAndStart.js`
- **New script added:** `start:server-only` (for manual server start without migrations)

### 3. Migration Script Verified
- **File:** `src/db/migrate.ts` → `dist/db/migrate.js`
- **Uses:** `process.env.DATABASE_URL` (set automatically by Railway)
- **Behavior:** Checks `schema_migrations` table and skips already-applied migrations

---

## 🚀 How It Works

### Railway Deployment Flow

1. **Railway builds the project:**
   ```bash
   npm install && npm run build
   ```

2. **Railway starts the service:**
   ```bash
   npm start
   ```

3. **Start command executes:**
   ```bash
   node dist/db/runMigrationsAndStart.js
   ```

4. **Startup script:**
   - ✅ Runs `node dist/db/migrate.js`
   - ✅ Waits for migrations to complete
   - ✅ Starts Express server: `node dist/api/server.js`

### Migration Execution

The migration script (`dist/db/migrate.js`):
- ✅ Checks if `DATABASE_URL` is set (Railway sets this automatically)
- ✅ Tests database connection
- ✅ Creates `schema_migrations` table if needed
- ✅ Checks each migration file (001-005)
- ✅ Runs only migrations that haven't been applied
- ✅ Marks migrations as complete in `schema_migrations` table

---

## ✅ Expected Tables After Migration

After successful deployment, these tables will exist:

- ✅ `users` - User accounts (UUID primary key)
- ✅ `products` - Product information
- ✅ `variants` - Product variants
- ✅ `notifications` - User notifications
- ✅ `check_runs` - Product check history
- ✅ `tracked_items` - User tracked products/variants
- ✅ `user_notification_settings` - User notification preferences
- ✅ `scheduler_logs` - Scheduler execution logs
- ✅ `schema_migrations` - Migration tracking (should have 5 rows)

---

## 🔍 Verification Steps

### 1. Check Railway Deployment Logs

After deployment, check Railway logs for:

```
[Startup] Running database migrations...

═══════════════════════════════════════════════════════════════
Database Migrations
═══════════════════════════════════════════════════════════════

[Migration] Database connection successful

[Migration] Checking 001_init...
[Migration] Running 001_init...
[Migration] ✓ 001_init completed successfully

... (continues for all 5 migrations)

[Startup] ✓ Migrations completed successfully

[Startup] Starting Express server...

Server running on port 3000
```

### 2. Verify Health Endpoint

```bash
curl https://[YOUR_RAILWAY_URL]/health
```

**Expected response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "database": "connected",
  "schedulers": {
    "check": { "enabled": true, "running": true },
    "email": { "enabled": true, "running": true }
  }
}
```

### 3. Verify Tables Exist (Optional)

In Railway web shell:
```bash
railway connect postgres
```

Then in psql:
```sql
SELECT COUNT(*) FROM schema_migrations;
-- Should return: 5

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- Should list all required tables
```

---

## 🔧 Troubleshooting

### Issue: Migrations run on every deployment

**Status:** ✅ This is expected and safe  
The migration script checks `schema_migrations` and skips already-applied migrations. You'll see:
```
[Migration] ✓ 001_init already run, skipping
```

### Issue: Server doesn't start after migrations

**Check:**
- Railway logs for migration errors
- Verify `DATABASE_URL` is set in Railway variables
- Check if PostgreSQL service is running

### Issue: CORS errors from frontend

**Verify:**
- `FRONTEND_URL` is set in Railway: `https://app.restocked.now`
- CORS allows the frontend domain (already configured)
- Frontend `VITE_API_BASE_URL` matches Railway backend URL

---

## 📋 CORS Configuration

CORS is configured to allow these origins in production:

- ✅ `https://app.restocked.now`
- ✅ `https://restocked.now`
- ✅ `https://restocked-frontend.vercel.app`
- ✅ `https://restocked-dashboard.vercel.app`
- ✅ `https://restockednew-production.up.railway.app`

**Settings:**
- `credentials: false`
- `methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]`
- `allowedHeaders: ["Content-Type", "Authorization"]`
- `preflightContinue: false`
- `optionsSuccessStatus: 204`

---

## ✅ Success Criteria

After deployment, verify:

- [ ] Migrations run automatically (check Railway logs)
- [ ] All 5 migrations applied (check `schema_migrations` table)
- [ ] All required tables exist
- [ ] Health endpoint returns `{"status":"ok","database":"connected"}`
- [ ] Server starts successfully
- [ ] No CORS errors (frontend can connect)
- [ ] Schedulers start (check logs for "Scheduler started")

---

## 🎯 Next Steps

1. **Deploy to Railway** (automatic on git push)
2. **Monitor deployment logs** for migration execution
3. **Verify health endpoint** responds correctly
4. **Test frontend connection** from `app.restocked.now`
5. **Verify tables exist** (optional, via Railway shell)

---

**Last Updated:** December 2025  
**Status:** ✅ Automatic migrations configured and ready

