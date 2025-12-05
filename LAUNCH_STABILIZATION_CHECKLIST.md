# Launch Stabilization Checklist
**App:** `https://app.restocked.now`  
**Date:** December 4, 2025

---

## 🎯 Purpose

Ensure the app is stable and production-ready before building new features.

---

## ✅ API Health Checks

### Backend Health Endpoint

**Test:**
```bash
curl https://restockednew-production.up.railway.app/health
```

**Expected Response (200 OK):**
```json
{
  "status": "ok",
  "database": "connected",
  "environment": "production",
  "schedulers": {
    "check": "enabled",
    "email": "enabled"
  }
}
```

**Status:** [ ] ✅ Healthy [ ] ❌ Unhealthy

**If Unhealthy:**
- Check Railway logs
- Check database connection
- Check environment variables

---

### Frontend Health Check

**Test:**
1. **Go to:** `https://app.restocked.now`
2. **Expected:** Page loads without errors
3. **Check Console:** No JavaScript errors
4. **Check Network:** All assets load (200 OK)

**Status:** [ ] ✅ Healthy [ ] ❌ Unhealthy

---

### Authentication Endpoints

**Test Registration:**
```bash
curl -X POST https://restockednew-production.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{"email":"health-check@example.com","password":"HealthCheck123!"}'
```

**Expected:** `201 Created` with user and token

**Test Login:**
```bash
curl -X POST https://restockednew-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{"email":"health-check@example.com","password":"HealthCheck123!"}'
```

**Expected:** `200 OK` with user and token

**Status:** [ ] ✅ Working [ ] ❌ Failed

---

### Protected Endpoints (With Token)

**Get Token First:**
```bash
TOKEN=$(curl -X POST https://restockednew-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{"email":"health-check@example.com","password":"HealthCheck123!"}' \
  | jq -r '.token')
```

**Test Tracked Items:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  -H "Origin: https://app.restocked.now" \
  https://restockednew-production.up.railway.app/me/tracked-items
```

**Expected:** `200 OK` with `{ items: [] }`

**Test Notifications:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  -H "Origin: https://app.restocked.now" \
  https://restockednew-production.up.railway.app/me/notifications?limit=1&offset=0
```

**Expected:** `200 OK` with notifications array

**Test Plan:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  -H "Origin: https://app.restocked.now" \
  https://restockednew-production.up.railway.app/me/plan
```

**Expected:** `200 OK` with plan and limits

**Status:** [ ] ✅ All Working [ ] ❌ Some Failed

---

## 📊 Dashboard Data Flow Checks

### Step 1: Login and Navigate to Dashboard

1. **Login:** `https://app.restocked.now/login`
2. **Expected:** Redirects to `/dashboard`
3. **Check:** Dashboard loads

**Status:** [ ] ✅ Dashboard Loads [ ] ❌ Error

---

### Step 2: Verify Initial Data Load

**Network Tab Check:**
1. **Open DevTools:** F12 → Network tab
2. **Look for these requests:**

**Expected Requests:**
```
✅ GET /me/tracked-items
   Status: 200 OK
   Response: { items: [...] }

✅ GET /me/notifications?limit=1&offset=0
   Status: 200 OK
   Response: { notifications: [], unreadCount: 0 }
```

**Status:** [ ] ✅ Data Loads [ ] ❌ Failed

---

### Step 3: Test Adding a Product

1. **Enter Product URL:** `https://example.com/product`
2. **Click:** "Add Product"
3. **Expected Requests:**
   ```
   ✅ POST /products
      Status: 201 Created
      Response: { product: {...}, variants: [...] }
   
   ✅ POST /me/tracked-items
      Status: 201 Created
      Response: { tracked_item: {...} }
   ```
4. **Expected Result:**
   - Product appears in dashboard
   - No errors

**Status:** [ ] ✅ Add Works [ ] ❌ Failed

---

### Step 4: Test Viewing Tracked Items

1. **Check Dashboard:**
   - ✅ Shows tracked items
   - ✅ Shows product images
   - ✅ Shows product names
   - ✅ Shows product URLs

2. **Check Network:**
   - ✅ `GET /me/tracked-items` returns items
   - ✅ All requests succeed

**Status:** [ ] ✅ View Works [ ] ❌ Failed

---

### Step 5: Test Deleting Tracked Item

1. **Click:** Delete button on a tracked item
2. **Confirm:** Delete in dialog
3. **Expected Request:**
   ```
   ✅ DELETE /me/tracked-items/:id
      Status: 200 OK
      Response: { success: true }
   ```
4. **Expected Result:**
   - Item removed from dashboard
   - No errors

**Status:** [ ] ✅ Delete Works [ ] ❌ Failed

---

## 🗄️ Database Integrity Checks

### Step 1: Verify Database Connection

**Railway CLI:**
```bash
railway run psql $DATABASE_URL -c "SELECT 1;"
```

**Expected:** Returns `1`

**Status:** [ ] ✅ Connected [ ] ❌ Disconnected

---

### Step 2: Verify All Tables Exist

**Railway CLI:**
```bash
railway run psql $DATABASE_URL -c "\dt"
```

**Expected Tables:**
- ✅ `users`
- ✅ `products`
- ✅ `variants`
- ✅ `tracked_items`
- ✅ `notifications`
- ✅ `check_runs`
- ✅ `scheduler_logs`
- ✅ `user_notification_settings`
- ✅ `schema_migrations`

**Status:** [ ] ✅ All Tables Exist [ ] ❌ Missing Tables

---

### Step 3: Verify Migrations Completed

**Railway CLI:**
```bash
railway run psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY version;"
```

**Expected:**
- ✅ 5 migrations completed
- ✅ All versions present

**Status:** [ ] ✅ Migrations Complete [ ] ❌ Incomplete

---

### Step 4: Verify Data Integrity

**Check Users Table:**
```bash
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

**Check Products Table:**
```bash
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM products;"
```

**Check Tracked Items:**
```bash
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM tracked_items;"
```

**Expected:** All queries return counts (no errors)

**Status:** [ ] ✅ Data Intact [ ] ❌ Errors

---

## 📝 Error Log Monitoring

### Vercel Logs

**Access:**
1. **Go to:** Vercel Dashboard → Project → Deployments
2. **Click:** Latest deployment
3. **View:** Build logs and runtime logs

**What to Check:**
- [ ] No build errors
- [ ] No runtime errors
- [ ] No 500 errors
- [ ] No CORS errors

**Status:** [ ] ✅ Clean Logs [ ] ⚠️ Some Errors [ ] ❌ Many Errors

---

### Railway Logs

**Access:**
1. **Go to:** Railway Dashboard → Project → Deployments
2. **Click:** Latest deployment
3. **View:** Logs

**Or CLI:**
```bash
railway logs --tail 100
```

**What to Check:**
- [ ] No database connection errors
- [ ] No authentication errors
- [ ] No 500 errors
- [ ] No migration errors
- [ ] Scheduler running (if enabled)

**Status:** [ ] ✅ Clean Logs [ ] ⚠️ Some Errors [ ] ❌ Many Errors

---

### Common Errors to Monitor

**Frontend Errors:**
- [ ] JavaScript errors
- [ ] Network errors
- [ ] CORS errors
- [ ] 401/403 errors

**Backend Errors:**
- [ ] Database connection errors
- [ ] JWT verification errors
- [ ] Validation errors
- [ ] 500 internal server errors

**Status:** [ ] ✅ No Critical Errors [ ] ⚠️ Some Errors [ ] ❌ Critical Errors

---

## 🔐 Production Environment Variables

### Frontend (Vercel) - Required

| Variable | Value | Status |
|----------|-------|--------|
| `VITE_API_BASE_URL` | `https://restockednew-production.up.railway.app` | [ ] ✅ Set [ ] ❌ Missing |

**Action:** [ ] ✅ Verified [ ] ⚠️ Needs Check

---

### Backend (Railway) - Required

| Variable | Status | Action |
|----------|--------|--------|
| `APP_ENV` | [ ] ✅ Set | [ ] ✅ Verified |
| `DATABASE_URL` | [ ] ✅ Set | [ ] ✅ Verified |
| `JWT_SECRET` | [ ] ✅ Set | [ ] ✅ Verified |
| `FRONTEND_URL` | [ ] ✅ Set | [ ] ✅ Verified |
| `BACKEND_URL` | [ ] ✅ Set | [ ] ✅ Verified |

**Action:** [ ] ✅ All Verified [ ] ⚠️ Some Missing

---

## 🔔 Tracking, Notifications, and Analytics

### Product Tracking

**Test:**
1. **Add a product** via dashboard
2. **Verify:**
   - [ ] Product created in database
   - [ ] Tracked item created
   - [ ] Product appears in dashboard

**Status:** [ ] ✅ Working [ ] ❌ Broken

---

### Notifications System

**Test:**
1. **Check notifications endpoint:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://restockednew-production.up.railway.app/me/notifications
   ```
2. **Verify:**
   - [ ] Endpoint returns 200 OK
   - [ ] Returns notifications array
   - [ ] Returns unreadCount

**Status:** [ ] ✅ Working [ ] ❌ Broken

---

### Scheduler Status

**Check Scheduler Logs:**
```bash
railway logs | grep -i scheduler
```

**Expected:**
- [ ] Check scheduler running
- [ ] Email scheduler running
- [ ] No scheduler errors

**Status:** [ ] ✅ Running [ ] ❌ Not Running

---

### Analytics (If Implemented)

**Check:**
- [ ] Analytics tracking enabled (if applicable)
- [ ] Events being tracked (if applicable)
- [ ] No analytics errors

**Status:** [ ] ✅ Working [ ] ❌ Not Implemented [ ] ⚠️ Needs Setup

---

## ✅ Stabilization Checklist Summary

### Infrastructure
- [ ] DNS resolved and stable
- [ ] SSL certificates valid
- [ ] Frontend deployed and accessible
- [ ] Backend deployed and healthy

### API
- [ ] Health endpoint working
- [ ] Authentication endpoints working
- [ ] Protected endpoints working
- [ ] CORS configured correctly

### Database
- [ ] Database connected
- [ ] All migrations completed
- [ ] All tables exist
- [ ] Data integrity verified

### Frontend
- [ ] Login works
- [ ] Dashboard loads
- [ ] API calls succeed
- [ ] No console errors

### Monitoring
- [ ] Vercel logs clean
- [ ] Railway logs clean
- [ ] No critical errors
- [ ] Schedulers running

### Environment
- [ ] All env vars set
- [ ] All env vars verified
- [ ] Production config correct

---

**Stabilization Complete:** [ ] ✅ Ready [ ] ⚠️ Some Issues [ ] ❌ Not Ready

**Issues Found:**
```
[List any issues here]
```

---

**Document Generated:** December 4, 2025  
**Next Step:** Identify what to build/fix next



