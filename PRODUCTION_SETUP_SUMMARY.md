# Production Setup Summary

This document summarizes all changes made to prepare Restocked.now for production deployment.

## Overview

The app has been refactored from local-only to production-ready with:
- **Centralized configuration layer** for environment management
- **Railway deployment** setup for backend
- **Vercel deployment** setup for frontend and landing
- **Production-ready** health checks, migrations, and seed scripts
- **Environment-aware** scheduler behavior

---

## Code Changes Summary

### 1. Configuration Layer (`src/config.ts`)

**New File:** Centralized configuration management

- Reads `APP_ENV` or `NODE_ENV` to determine environment
- Provides typed access to all configuration
- Validates required variables in production
- Handles dev/prod differences automatically

**Key Features:**
- Environment detection (development vs production)
- URL configuration (FRONTEND_URL, BACKEND_URL)
- Scheduler configuration (enabled by default in prod, disabled in dev)
- Dev mode flags (ENABLE_DEV_ADMIN, ENABLE_DEV_FAST_CHECKS)
- App version from package.json

### 2. Updated Files Using Config

**Files Updated:**
- `src/jobs/checkScheduler.ts` - Uses `config.enableCheckScheduler`
- `src/jobs/emailDeliveryScheduler.ts` - Uses `config.enableEmailScheduler`
- `src/jobs/checkWorker.ts` - Uses `config.minCheckIntervalMinutes`, etc.
- `src/api/middleware/requireAdmin.ts` - Uses `config.enableDevAdmin`
- `src/api/server.ts` - Uses config for CORS, port, health endpoint
- `src/services/emailService.ts` - Uses `config.resendApiKey`, `config.emailFrom`

**Benefits:**
- Single source of truth for configuration
- Type-safe access to config values
- Environment-aware defaults
- Easier to test and maintain

### 3. Enhanced Health Endpoint

**File:** `src/api/server.ts`

**New Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "database": "connected",
  "schedulers": {
    "check": {
      "enabled": true,
      "running": false,
      "intervalMinutes": 30
    },
    "email": {
      "enabled": true,
      "running": false,
      "intervalMinutes": 5
    }
  },
  "timestamp": "2025-12-03T..."
}
```

**Features:**
- Database connection test
- Scheduler status
- App version
- Environment info

### 4. CORS Configuration

**File:** `src/api/server.ts`

**Changes:**
- Supports multiple origins in production
- Allows app subdomain variations
- Falls back to localhost in development
- Proper error handling for invalid origins

### 5. Migration Scripts

**New Files:**
- `scripts/run-migrations.ts` - Runs all database migrations
- `scripts/seed-prod-user.ts` - Seeds production admin user

**Usage:**
```bash
npm run migrate
npm run seed:prod-user
```

**Features:**
- Tracks which migrations have run
- Idempotent (safe to run multiple times)
- Creates `schema_migrations` table if needed
- Detailed logging

### 6. Landing Site Updates

**Files Updated:**
- `landing/src/components/Navbar.tsx`
- `landing/src/sections/Hero.tsx`
- `landing/src/sections/HowItWorks.tsx`
- `landing/src/sections/Pricing.tsx`

**Changes:**
- CTAs use `VITE_APP_URL` environment variable
- Falls back to relative paths if not set
- Supports subdomain setup (e.g., `app.restocked.now`)

**New File:**
- `landing/.env.production.example` - Example env vars

### 7. Frontend Environment

**New File:**
- `frontend/.env.production.example` - Example env vars

**Already Configured:**
- `frontend/src/lib/apiClient.ts` uses `VITE_API_BASE_URL`

---

## Deployment Documentation

### New Files

1. **`DEPLOYMENT.md`** - Complete deployment guide
   - Railway backend setup
   - Vercel frontend setup
   - Vercel landing setup
   - Domain configuration
   - Environment variables reference
   - Troubleshooting guide

2. **`PROD_LAUNCH_CHECKLIST.md`** - Step-by-step checklist
   - Pre-deployment tasks
   - Backend deployment steps
   - Frontend deployment steps
   - Landing deployment steps
   - Post-deployment testing
   - Security verification

---

## Environment Variables

### Backend (Railway)

**Required:**
- `APP_ENV=production`
- `DATABASE_URL` (auto-set by Railway)
- `JWT_SECRET` (generate strong random string)
- `FRONTEND_URL` (e.g., `https://app.restocked.now`)
- `BACKEND_URL` (e.g., `https://api.restocked.now`)

**Optional:**
- `ENABLE_SCHEDULER=true` (default in prod)
- `ENABLE_CHECK_SCHEDULER=true` (default in prod)
- `ENABLE_EMAIL_SCHEDULER=true` (default in prod)
- `RESEND_API_KEY` (for email)
- `EMAIL_FROM`, `EMAIL_FROM_NAME`
- `APP_VERSION` (defaults to package.json)

### Frontend (Vercel)

**Required:**
- `VITE_API_BASE_URL` (e.g., `https://api.restocked.now`)

### Landing (Vercel)

**Optional:**
- `VITE_APP_URL` (e.g., `https://app.restocked.now`) - Only if app is on subdomain

---

## Deployment Steps (Quick Reference)

### Backend (Railway)

1. Create Railway project
2. Add PostgreSQL database
3. Set environment variables
4. Configure build/start commands:
   - Build: `npm install && npm run build`
   - Start: `npm start`
5. Deploy
6. Run migrations: `railway run npm run migrate`
7. Seed user: `railway run npm run seed:prod-user`
8. Verify: `curl https://api.restocked.now/health`

### Frontend (Vercel)

1. Import project (root: `frontend`)
2. Set `VITE_API_BASE_URL`
3. Deploy
4. Add custom domain: `app.restocked.now`

### Landing (Vercel)

1. Import project (root: `landing`)
2. Set `VITE_APP_URL` (if app on subdomain)
3. Deploy
4. Add custom domain: `restocked.now`

---

## Key Improvements

### Before

- Environment variables scattered throughout code
- Ad-hoc `process.env.NODE_ENV` checks
- No centralized configuration
- Manual migration process
- No production health checks
- CORS hardcoded to localhost

### After

- ✅ Centralized `src/config.ts` with typed access
- ✅ Environment-aware defaults (dev vs prod)
- ✅ Automated migration scripts
- ✅ Comprehensive health endpoint
- ✅ Production-ready CORS configuration
- ✅ Complete deployment documentation
- ✅ Production launch checklist

---

## Testing Checklist

After deployment, verify:

- [ ] Backend health endpoint returns `status: "ok"`
- [ ] Database connection successful
- [ ] Schedulers enabled and running
- [ ] Frontend can connect to backend API
- [ ] User registration works
- [ ] User login works
- [ ] Product addition works
- [ ] Background checks running
- [ ] Notifications created
- [ ] Landing site CTAs point to app

---

## Next Steps

1. **Deploy to Railway:**
   - Follow `DEPLOYMENT.md` → Backend Deployment section
   - Set all environment variables
   - Run migrations and seed user

2. **Deploy to Vercel:**
   - Follow `DEPLOYMENT.md` → Frontend Deployment section
   - Set `VITE_API_BASE_URL`
   - Configure custom domain

3. **Deploy Landing:**
   - Follow `DEPLOYMENT.md` → Landing Site Deployment section
   - Set `VITE_APP_URL` if needed
   - Configure custom domain

4. **Verify:**
   - Use `PROD_LAUNCH_CHECKLIST.md` for comprehensive testing
   - Check all endpoints
   - Test user flows
   - Monitor logs

---

## Files Changed

### New Files
- `src/config.ts`
- `scripts/run-migrations.ts`
- `scripts/seed-prod-user.ts`
- `DEPLOYMENT.md`
- `PROD_LAUNCH_CHECKLIST.md`
- `frontend/.env.production.example`
- `landing/.env.production.example`

### Modified Files
- `src/jobs/checkScheduler.ts`
- `src/jobs/emailDeliveryScheduler.ts`
- `src/jobs/checkWorker.ts`
- `src/api/middleware/requireAdmin.ts`
- `src/api/server.ts`
- `src/services/emailService.ts`
- `landing/src/components/Navbar.tsx`
- `landing/src/sections/Hero.tsx`
- `landing/src/sections/HowItWorks.tsx`
- `landing/src/sections/Pricing.tsx`
- `package.json` (added migrate and seed scripts)

---

## Support

For deployment issues:
- See `DEPLOYMENT.md` → Troubleshooting section
- Check Railway logs
- Check Vercel logs
- Verify environment variables
- Test health endpoint

---

**Last Updated:** 2025-12-03
**Version:** 1.0.0

