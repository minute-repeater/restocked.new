# Railway Database Migrations Guide

**Status:** Migration files ready, need to run in Railway environment

---

## ✅ Migration Files Verified

All 5 migration files exist and are complete:

1. ✅ `001_init.sql` - Creates core tables (products, variants, users, tracked_items, notifications, check_runs)
2. ✅ `002_update_users_auth.sql` - Updates users to UUID, adds password_hash
3. ✅ `003_add_scheduler_and_admin.sql` - Adds role column, creates scheduler_logs table
4. ✅ `004_notifications_system.sql` - Updates notifications table, creates user_notification_settings
5. ✅ `005_add_user_plans.sql` - Adds plan column to users table

---

## 📋 Required Tables

After migrations run, these tables should exist:

- ✅ `users` - User accounts (UUID primary key)
- ✅ `products` - Product information
- ✅ `variants` - Product variants
- ✅ `notifications` - User notifications
- ✅ `check_runs` - Product check history (note: migration creates `check_runs`, not `checks`)
- ✅ `tracked_items` - User tracked products/variants
- ✅ `user_notification_settings` - User notification preferences
- ✅ `scheduler_logs` - Scheduler execution logs
- ✅ `schema_migrations` - Migration tracking table

**Note:** The migration creates `check_runs` table, not `checks`. If your code references `checks`, you may need to update it or add an alias.

---

## 🚀 Running Migrations in Railway

### Option 1: Via Railway CLI (Recommended)

**Prerequisites:**
- Railway CLI installed and authenticated
- Project linked: `railway link`

**Run migrations:**
```bash
railway run npm run migrate
```

**Verify migrations:**
```bash
railway run npm run verify-migrations
```

### Option 2: Via Railway Dashboard

1. Go to Railway Dashboard → Your Project → Backend Service
2. Go to **Deployments** → **Latest Deployment**
3. Click **"View Logs"** or **"Shell"**
4. Run:
   ```bash
   npm run migrate
   ```

### Option 3: Trigger via Deployment

Migrations can be run automatically on deployment by adding to Railway's build/start process, or manually via Railway's console.

---

## ✅ Verification Steps

After running migrations, verify:

1. **Check schema_migrations table:**
   ```sql
   SELECT COUNT(*) FROM schema_migrations;
   ```
   Expected: Should return `5` (one row per migration)

2. **List applied migrations:**
   ```sql
   SELECT name, run_at FROM schema_migrations ORDER BY run_at;
   ```
   Expected: Should show all 5 migration names

3. **Verify tables exist:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
   Expected: Should list all required tables

4. **Run verification script:**
   ```bash
   railway run npm run verify-migrations
   ```

---

## 🔧 Troubleshooting

### Issue: `railway run` executes locally

**Problem:** `railway run npm run migrate` tries to connect to `postgres.railway.internal` locally, which fails.

**Solution:** 
- Ensure Railway CLI is properly linked: `railway link`
- Try: `railway run --service [service-name] npm run migrate`
- Or use Railway Dashboard → Shell to run commands in Railway's environment

### Issue: Migration fails with "table already exists"

**Solution:** This is normal if migrations were partially run. The migration script checks `schema_migrations` and skips already-applied migrations.

### Issue: Missing `checks` table

**Note:** Migration creates `check_runs` table, not `checks`. If your code references `checks`, you may need to:
- Update code to use `check_runs`
- Or add a view/alias: `CREATE VIEW checks AS SELECT * FROM check_runs;`

---

## 📝 Next Steps

1. **Run migrations in Railway:**
   ```bash
   railway run npm run migrate
   ```

2. **Verify tables exist:**
   ```bash
   railway run npm run verify-migrations
   ```

3. **Check schema_migrations:**
   ```bash
   railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM schema_migrations;"
   ```

4. **If all successful:** No commit needed (migration files already in repo)

---

## 🎯 Expected Output

After successful migration run:

```
═══════════════════════════════════════════════════════════════
Database Migrations
═══════════════════════════════════════════════════════════════

[Migration] Database connection successful

[Migration] Checking 001_init...
[Migration] Running 001_init...
[Migration] ✓ 001_init completed successfully

[Migration] Checking 002_update_users_auth...
[Migration] Running 002_update_users_auth...
[Migration] ✓ 002_update_users_auth completed successfully

... (continues for all 5 migrations)

═══════════════════════════════════════════════════════════════
✓ All migrations completed successfully
═══════════════════════════════════════════════════════════════
```

---

**Last Updated:** December 2025  
**Status:** Migration files ready, awaiting execution in Railway environment



