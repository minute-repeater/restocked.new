# Railway Migration Instructions

**Status:** ✅ Ready to execute  
**Date:** December 2025

---

## ✅ Pre-Flight Checklist

Before running migrations, verify:

- [x] Migration script compiled: `dist/db/migrate.js` exists
- [x] Migration files exist: `db/migrations/*.sql` (5 files)
- [x] Package.json migrate command: `node ./dist/db/migrate.js`
- [x] DATABASE_URL is set by Railway (automatic)

---

## 🚀 Execute Migrations in Railway Web Shell

### Step 1: Access Railway Web Shell

1. Go to **Railway Dashboard**: https://railway.app/dashboard
2. Select your project: `mindful-perfection` (or your project name)
3. Click on your **backend service**: `restocked.new`
4. Go to **"Deployments"** tab
5. Click on the **latest deployment**
6. Click **"Shell"** button (or **"View Logs"** → **"Shell"**)

### Step 2: Run Migration Command

**In the Railway web shell, execute exactly this command:**

```bash
npm run migrate
```

**Expected output:**
```
═══════════════════════════════════════════════════════════════
Database Migrations
═══════════════════════════════════════════════════════════════

[Migration] Using DATABASE_URL: postgresql://postgres:****@postgres.railway.internal:5432/railway

[Migration] Database connection successful

[Migration] Checking 001_init...
[Migration] Running 001_init...
[Migration] ✓ 001_init completed successfully

[Migration] Checking 002_update_users_auth...
[Migration] Running 002_update_users_auth...
[Migration] ✓ 002_update_users_auth completed successfully

[Migration] Checking 003_add_scheduler_and_admin...
[Migration] Running 003_add_scheduler_and_admin...
[Migration] ✓ 003_add_scheduler_and_admin completed successfully

[Migration] Checking 004_notifications_system...
[Migration] Running 004_notifications_system...
[Migration] ✓ 004_notifications_system completed successfully

[Migration] Checking 005_add_user_plans...
[Migration] Running 005_add_user_plans...
[Migration] ✓ 005_add_user_plans completed successfully

═══════════════════════════════════════════════════════════════
✓ All migrations completed successfully
═══════════════════════════════════════════════════════════════
```

---

## ✅ Verify Migrations Succeeded

### Option 1: Check schema_migrations table

In Railway web shell, run:

```bash
node -e "import('./dist/db/client.js').then(m => m.query('SELECT COUNT(*) FROM schema_migrations').then(r => console.log('Migrations applied:', r.rows[0].count)))"
```

Or use Railway's PostgreSQL connection:

```bash
railway connect postgres
```

Then in psql:
```sql
SELECT COUNT(*) FROM schema_migrations;
-- Should return: 5

SELECT name, run_at FROM schema_migrations ORDER BY run_at;
-- Should show all 5 migrations
```

### Option 2: Verify tables exist

In Railway PostgreSQL shell:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables:**
- `check_runs`
- `notifications`
- `products`
- `schema_migrations`
- `scheduler_logs`
- `tracked_items`
- `user_notification_settings`
- `users`
- `variant_price_history`
- `variant_stock_history`
- `variants`

---

## 🔧 Troubleshooting

### Issue: "DATABASE_URL environment variable is not set"

**Solution:**
- Railway should set this automatically when PostgreSQL is added
- Check Railway Dashboard → Service → Variables
- Verify `DATABASE_URL` exists
- If missing, add PostgreSQL database service

### Issue: "Cannot find module './dist/db/migrate.js'"

**Solution:**
- Ensure build completed: `npm run build` should have run during deployment
- Check Railway deployment logs for build errors
- Verify `dist/db/migrate.js` exists in Railway shell: `ls -la dist/db/migrate.js`

### Issue: "Migration already run, skipping"

**Status:** ✅ This is normal!  
The migration script checks `schema_migrations` and skips already-applied migrations.

### Issue: "Migration failed: [error message]"

**Solution:**
- Check the specific error message
- Common issues:
  - Table already exists (partial migration) - check `schema_migrations` table
  - Syntax error in SQL - check migration file
  - Permission error - verify database user has CREATE privileges

---

## 📋 Migration Files Reference

| Migration | Creates/Updates |
|-----------|----------------|
| `001_init.sql` | Core tables: products, variants, users, tracked_items, notifications, check_runs |
| `002_update_users_auth.sql` | Updates users to UUID, adds password_hash |
| `003_add_scheduler_and_admin.sql` | Adds role column, creates scheduler_logs |
| `004_notifications_system.sql` | Updates notifications, creates user_notification_settings |
| `005_add_user_plans.sql` | Adds plan column to users |

---

## ✅ Success Criteria

After running migrations, verify:

- [ ] `schema_migrations` table exists
- [ ] `schema_migrations` contains 5 rows
- [ ] All required tables exist (see list above)
- [ ] No errors in migration output
- [ ] Backend can connect to database (check health endpoint)

---

## 🎯 Next Steps After Migrations

1. **Verify tables exist** (see verification steps above)
2. **Test database connection:**
   ```bash
   curl https://[YOUR_RAILWAY_URL]/health
   ```
   Should return: `{"status":"ok","database":"connected"}`

3. **Seed production user** (optional):
   ```bash
   npm run seed:prod-user
   ```

---

## 📝 Command Summary

**Single command to run in Railway web shell:**

```bash
npm run migrate
```

That's it! The migration script will:
- ✅ Use `DATABASE_URL` from Railway environment
- ✅ Check which migrations have already run
- ✅ Run only new migrations
- ✅ Create `schema_migrations` table if needed
- ✅ Report success/failure for each migration

---

**Last Updated:** December 2025  
**Status:** ✅ Ready to execute in Railway web shell



