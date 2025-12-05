# Sentry Error Monitoring Setup

**Date:** December 4, 2025  
**Status:** ✅ Configured for Frontend & Backend  
**Purpose:** Production error monitoring and performance tracking

---

## Overview

Sentry is integrated into both the frontend (React/Vite) and backend (Express/Node.js) to provide:

- ✅ **Error Tracking** - Catch and report errors before users do
- ✅ **Performance Monitoring** - Track API response times and frontend render performance
- ✅ **Release Tracking** - Associate errors with specific deployments
- ✅ **Environment Separation** - Separate dev and production errors

---

## Configuration

### Environment Variables

**Required for both Frontend and Backend:**

| Variable | Location | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | Railway (Backend) | Sentry Data Source Name for backend |
| `VITE_SENTRY_DSN` | Vercel (Frontend) | Sentry Data Source Name for frontend |

**Optional:**

| Variable | Location | Description |
|----------|----------|-------------|
| `APP_VERSION` | Railway | Release version for backend (defaults to package.json version) |
| `VITE_APP_VERSION` | Vercel | Release version for frontend (optional) |

---

## Setup Instructions

### Step 1: Create Sentry Account

1. Go to https://sentry.io/signup/
2. Create a free account (or sign in)
3. Create a new project:
   - **Platform:** React (for frontend)
   - **Platform:** Node.js (for backend)

### Step 2: Get DSN

For each project (frontend and backend):

1. Go to **Settings** → **Projects** → **Your Project**
2. Click **Client Keys (DSN)**
3. Copy the DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### Step 3: Add Environment Variables

#### Frontend (Vercel)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```
3. Select environments: **Production**, **Preview**, **Development**
4. Click **Save**
5. Redeploy the frontend

#### Backend (Railway)

1. Go to Railway Dashboard → Your Project → Variables
2. Add:
   ```
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```
3. Click **Deploy** or restart the service

---

## How It Works

### Frontend (React)

**Location:** `frontend/src/main.tsx`

- Initialized **before** React renders
- Captures errors from:
  - React Error Boundaries (`ErrorBoundary.tsx`)
  - Unhandled promise rejections
  - JavaScript runtime errors
- Performance monitoring tracks:
  - Page load times
  - API request durations
  - React component render times

**Error Boundary Integration:**

The `ErrorBoundary` component automatically forwards all caught errors to Sentry with React component stack traces.

### Backend (Express)

**Location:** `src/api/server.ts`

- Initialized **at the top** of the server file
- Middleware order:
  1. `Sentry.Handlers.requestHandler()` - Captures request context
  2. `Sentry.Handlers.tracingHandler()` - Tracks performance
  3. Routes and business logic
  4. `Sentry.Handlers.errorHandler()` - Captures errors
  5. Custom error handler (filters stack traces in production)

**Error Handling:**

- All unhandled errors are automatically captured
- Stack traces are **excluded** from API responses in production
- Errors are logged to console in development (not sent to Sentry)

---

## Viewing Issues

### Access Sentry Dashboard

1. Go to https://sentry.io/
2. Sign in to your account
3. Select your project (frontend or backend)

### Key Sections

#### 1. **Issues** (Error Tracking)

- View all errors grouped by type
- See error frequency and affected users
- View stack traces and context
- Assign issues to team members
- Mark issues as resolved

**URL:** `https://sentry.io/organizations/YOUR_ORG/issues/`

#### 2. **Performance** (Performance Monitoring)

- View API endpoint performance
- See slow database queries
- Track frontend page load times
- Identify performance bottlenecks

**URL:** `https://sentry.io/organizations/YOUR_ORG/performance/`

#### 3. **Releases** (Release Tracking)

- Associate errors with specific deployments
- Track error rates per release
- See which releases introduced new errors

**URL:** `https://sentry.io/organizations/YOUR_ORG/releases/`

#### 4. **Alerts** (Notifications)

- Set up email/Slack notifications for new errors
- Configure alert rules (e.g., "Alert if error rate > 10/min")
- Get notified when critical errors occur

**URL:** `https://sentry.io/organizations/YOUR_ORG/alerts/`

---

## Development vs Production

### Development Mode

- ✅ Errors are **logged to console** (not sent to Sentry)
- ✅ Stack traces are **included** in API responses
- ✅ Full error details visible in browser console
- ✅ No performance impact from Sentry

### Production Mode

- ✅ Errors are **sent to Sentry** automatically
- ✅ Stack traces are **excluded** from API responses (security)
- ✅ Only generic error messages shown to users
- ✅ Performance monitoring active

---

## Source Maps

### Frontend Source Maps

Source maps are automatically generated by Vite during build:

- ✅ Source maps are created in `frontend/dist/`
- ✅ Sentry can read source maps from the build output
- ✅ For better debugging, upload source maps to Sentry (optional)

**To upload source maps (optional):**

1. Install Sentry CLI:
   ```bash
   npm install -g @sentry/cli
   ```

2. Add to `frontend/package.json`:
   ```json
   {
     "scripts": {
       "build": "tsc -b && vite build && sentry-cli sourcemaps upload dist"
     }
   }
   ```

3. Configure Sentry CLI:
   ```bash
   sentry-cli login
   ```

**Note:** Source maps work without uploading if the build output is accessible to Sentry.

---

## Testing

### Test Frontend Error Tracking

1. Temporarily add to any component:
   ```typescript
   throw new Error('Test Sentry error');
   ```

2. Trigger the error in production
3. Check Sentry dashboard → Issues
4. You should see the error appear within seconds

### Test Backend Error Tracking

1. Temporarily add to any route:
   ```typescript
   throw new Error('Test Sentry error');
   ```

2. Make a request to that endpoint
3. Check Sentry dashboard → Issues
4. You should see the error with full request context

---

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN is set:**
   - Frontend: Verify `VITE_SENTRY_DSN` in Vercel
   - Backend: Verify `SENTRY_DSN` in Railway

2. **Check environment:**
   - Errors only sent in production (not dev)
   - Verify `NODE_ENV=production` or `APP_ENV=production`

3. **Check Sentry project:**
   - Verify you're looking at the correct project
   - Check filters (date range, environment, etc.)

4. **Check browser console:**
   - Look for Sentry initialization errors
   - Check network tab for Sentry requests

### Performance Impact

- Sentry has minimal performance impact
- Errors are sent asynchronously
- Performance monitoring samples 100% of transactions (can be reduced)

**To reduce performance sampling:**

Edit `src/api/server.ts` and `frontend/src/main.tsx`:
```typescript
tracesSampleRate: 0.1, // Sample 10% instead of 100%
```

---

## Best Practices

1. **Don't log sensitive data:**
   - Sentry automatically filters passwords, tokens, etc.
   - Review error context before sharing

2. **Set up alerts:**
   - Configure alerts for critical errors
   - Get notified when error rates spike

3. **Use releases:**
   - Tag deployments with version numbers
   - Track which releases introduce errors

4. **Review regularly:**
   - Check Sentry dashboard weekly
   - Fix high-frequency errors first
   - Monitor performance trends

---

## Free Tier Limits

Sentry free tier includes:

- ✅ 5,000 errors/month
- ✅ 10,000 performance units/month
- ✅ 1 project
- ✅ 1 team member

**Upgrade if you exceed these limits.**

---

## Support

- **Sentry Docs:** https://docs.sentry.io/
- **React Integration:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Node.js Integration:** https://docs.sentry.io/platforms/node/
- **Support:** https://sentry.io/support/

---

**Status:** ✅ Sentry monitoring is configured and ready to use.  
**Next Steps:** Add `SENTRY_DSN` and `VITE_SENTRY_DSN` environment variables to enable error tracking.



