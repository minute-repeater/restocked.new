# Railway Backend Deployment Guide

**Status:** ✅ Ready for Deployment  
**Date:** December 2025

---

## ✅ Pre-Deployment Verification Complete

### 1. Backend Structure ✅
- **Root Directory:** `/` (project root, not `/src`)
- **Source Code:** `/src` (TypeScript source files)
- **Build Output:** `/dist` (compiled JavaScript)
- **Entry Point:** `dist/api/server.js`

### 2. Package.json Configuration ✅
- **Build Script:** `tsc` ✅
- **Start Script:** `node dist/api/server.js` ✅
- **TypeScript Output:** `dist/` ✅

### 3. Dependencies Verified ✅

**Production Dependencies:**
- ✅ `express` - Web framework
- ✅ `cors` - CORS middleware
- ✅ `dotenv` - Environment variables
- ✅ `pg` - PostgreSQL client
- ✅ `jsonwebtoken` - JWT authentication
- ✅ `bcrypt` - Password hashing
- ✅ `playwright` - Web scraping
- ✅ `cheerio` - HTML parsing
- ✅ `resend` - Email service
- ✅ `node-cron` - Scheduler
- ✅ `express-rate-limit` - Rate limiting

**Dev Dependencies:**
- ✅ `typescript` - TypeScript compiler
- ✅ `@types/node` - Node.js types
- ✅ `ts-node` - TypeScript execution

### 4. Build Verification ✅
- ✅ TypeScript compiles successfully
- ✅ Output file exists: `dist/api/server.js`
- ✅ No build errors

---

## 🚀 Railway Deployment Steps

### Step 1: Create Railway Project

1. **Go to Railway Dashboard**
   - Navigate to: https://railway.app
   - Sign in or create account

2. **Create New Project**
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**
   - Connect your GitHub account (if not already connected)
   - Select repository: `restocked-now`

3. **Railway will auto-detect:**
   - Node.js service
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Root directory: `/` (project root)

### Step 2: Add PostgreSQL Database

1. **In Railway Project Dashboard**
   - Click **"+ New"**
   - Select **"Database"** → **"Add PostgreSQL"**
   - Railway will automatically:
     - Create PostgreSQL database
     - Set `DATABASE_URL` environment variable
     - Link database to your service

2. **Verify Database Connection**
   - The `DATABASE_URL` will be automatically added to your service
   - Format: `postgresql://user:password@host:port/database`

### Step 3: Configure Environment Variables

**Go to Railway Project → Your Service → Variables**

Add the following environment variables:

#### Required Variables

```bash
# Environment
APP_ENV=production

# Database (auto-set by Railway PostgreSQL)
DATABASE_URL=<auto-set by Railway>

# Authentication
JWT_SECRET=c194e17e75a042c0f183a9f9a22dd65dd5f276b49839ad501f7597ba480c2a85f17681f48f6605f9168b85f341da27d2d49f4bbf36043f16d1715058e927b9c1

# URLs (update with your actual domains)
FRONTEND_URL=https://app.restocked.now
BACKEND_URL=https://api.restocked.now

# Port (Railway sets this automatically, but you can override)
PORT=3000
```

#### Optional Variables (Recommended)

```bash
# Schedulers (enabled by default in production)
ENABLE_SCHEDULER=true
ENABLE_CHECK_SCHEDULER=true
ENABLE_EMAIL_SCHEDULER=true
CHECK_SCHEDULER_INTERVAL_MINUTES=30
EMAIL_DELIVERY_INTERVAL_MINUTES=5

# Email Service (optional but recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=notifications@restocked.now
EMAIL_FROM_NAME=Restocked

# App Version (optional)
APP_VERSION=1.0.0
```

**⚠️ Important Notes:**
- `DATABASE_URL` is automatically set by Railway when you add PostgreSQL
- `JWT_SECRET` is provided above (generated securely)
- `FRONTEND_URL` should match your Vercel frontend domain
- `BACKEND_URL` can be set to your Railway domain or custom domain
- `PORT` is usually set automatically by Railway

### Step 4: Configure Build Settings

**Railway should auto-detect, but verify:**

1. **Go to Service Settings → Build**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Root Directory:** `/` (leave empty or set to `/`)

2. **Verify Railway Configuration File**
   - `railway.json` is already created in the project root
   - Railway will use this configuration

### Step 5: Deploy

1. **Railway will automatically deploy when:**
   - You push to the connected GitHub repository
   - You manually trigger a deployment
   - Environment variables are updated

2. **Monitor Deployment**
   - Go to **Deployments** tab
   - Watch build logs
   - Check for any errors

3. **Expected Build Output:**
   ```
   Installing dependencies...
   Building TypeScript...
   Starting server...
   ```

### Step 6: Run Database Migrations

**After first successful deployment:**

1. **Open Railway CLI** (or use Railway dashboard)
   ```bash
   # Install Railway CLI (if not installed)
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Link to project
   railway link
   ```

2. **Run Migrations**
   ```bash
   railway run npm run migrate
   ```

3. **Seed Production User** (optional)
   ```bash
   railway run npm run seed:prod-user
   ```

### Step 7: Get Railway Public URL

1. **In Railway Dashboard**
   - Go to your service
   - Click **"Settings"** → **"Networking"**
   - Find **"Public Domain"**
   - Copy the URL (e.g., `https://your-service.up.railway.app`)

2. **Or use Railway CLI**
   ```bash
   railway domain
   ```

---

## ✅ Verification

### 1. Health Check Endpoint

**Test the health endpoint:**
```bash
curl https://YOUR_RAILWAY_URL/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production"
}
```

### 2. Check Logs

**In Railway Dashboard:**
- Go to **"Deployments"** → **Latest Deployment** → **"View Logs"**
- Look for:
  - ✅ `Database connected`
  - ✅ `Server running on port XXXX`
  - ✅ `Scheduler started`
  - ❌ No error messages

### 3. Test API Endpoints

**Test Authentication:**
```bash
curl -X POST https://YOUR_RAILWAY_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

**Test Protected Endpoint:**
```bash
curl https://YOUR_RAILWAY_URL/me/tracked-items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔧 Troubleshooting

### Issue: Build Fails

**Symptoms:** Deployment shows "Build Failed"

**Solutions:**
1. Check Railway build logs for specific errors
2. Verify `package.json` has correct scripts
3. Test build locally: `npm run build`
4. Check TypeScript errors: `npx tsc --noEmit`

### Issue: Server Won't Start

**Symptoms:** Deployment succeeds but service shows "Failed"

**Solutions:**
1. Check Railway logs for startup errors
2. Verify `DATABASE_URL` is set
3. Verify `JWT_SECRET` is set
4. Check `FRONTEND_URL` and `BACKEND_URL` are set (required in production)
5. Verify port is correct (Railway sets `PORT` automatically)

### Issue: Database Connection Fails

**Symptoms:** Logs show "Database connection failed"

**Solutions:**
1. Verify PostgreSQL service is running in Railway
2. Check `DATABASE_URL` is correctly set
3. Verify database is linked to your service
4. Check database logs in Railway

### Issue: CORS Errors

**Symptoms:** Frontend can't connect to API

**Solutions:**
1. Verify `FRONTEND_URL` matches your frontend domain exactly
2. Check CORS configuration in `src/api/server.ts`
3. Ensure `FRONTEND_URL` includes `https://` protocol
4. Redeploy backend after changing `FRONTEND_URL`

### Issue: Health Endpoint Returns 404

**Symptoms:** `/health` endpoint not found

**Solutions:**
1. Verify server started successfully (check logs)
2. Check route is registered in `src/api/server.ts`
3. Verify build output includes `dist/api/server.js`
4. Check Railway is using correct start command

---

## 📋 Environment Variables Checklist

### Required (Must Set)
- [ ] `APP_ENV=production`
- [ ] `DATABASE_URL` (auto-set by Railway)
- [ ] `JWT_SECRET` (provided above)
- [ ] `FRONTEND_URL=https://app.restocked.now`
- [ ] `BACKEND_URL=https://api.restocked.now` (or Railway URL)

### Optional (Recommended)
- [ ] `ENABLE_SCHEDULER=true`
- [ ] `ENABLE_CHECK_SCHEDULER=true`
- [ ] `ENABLE_EMAIL_SCHEDULER=true`
- [ ] `RESEND_API_KEY=re_xxxxx`
- [ ] `EMAIL_FROM=notifications@restocked.now`
- [ ] `EMAIL_FROM_NAME=Restocked`

---

## 🎯 Next Steps After Deployment

1. **Get Railway Public URL**
   - Copy from Railway dashboard
   - Format: `https://your-service.up.railway.app`

2. **Use in Vercel Frontend**
   - Set `VITE_API_BASE_URL=https://your-service.up.railway.app`
   - Or use custom domain: `https://api.restocked.now`

3. **Configure Custom Domain** (Optional)
   - Add `api.restocked.now` in Railway → Settings → Domains
   - Configure DNS CNAME record
   - Update `BACKEND_URL` to match custom domain

4. **Test End-to-End**
   - Frontend can connect to backend
   - Authentication works
   - Product extraction works
   - Notifications work

---

## 📞 Support

- **Railway Docs:** https://docs.railway.app
- **Railway Support:** https://railway.app/help
- **Project Issues:** Check Railway deployment logs

---

**Last Updated:** December 2025  
**Status:** ✅ Ready for deployment

