# Sentry Post-Deployment Verification Checklist

**Date:** December 4, 2025  
**Commit:** `62a938d` - Step 2: Add Sentry monitoring for frontend and backend  
**Status:** ✅ Committed & Pushed - Awaiting Deployment

---

## Deployment Status

### Frontend (Vercel)
- ✅ **Code Pushed:** Committed to `main` branch
- ⏳ **Build Status:** Check Vercel dashboard
- ⏳ **Environment Variables:** Verify `VITE_SENTRY_DSN` is set

### Backend (Railway)
- ✅ **Code Pushed:** Committed to `main` branch
- ⏳ **Deployment Status:** Check Railway dashboard
- ⏳ **Environment Variables:** Verify `SENTRY_DSN` is set

---

## Step 1: Verify Deployment Success

### Frontend (Vercel)

1. **Check Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Find your frontend project
   - Check latest deployment status
   - ✅ **Expected:** Build should succeed (TypeScript compilation passed)

2. **Verify Environment Variable:**
   - Go to: Project → Settings → Environment Variables
   - Check: `VITE_SENTRY_DSN` is set
   - ✅ **Required:** Must be set for Sentry to work
   - ⚠️ **If Missing:** Add DSN from Sentry dashboard

3. **Check Build Logs:**
   - Look for: No TypeScript errors
   - Look for: Successful Vite build
   - ✅ **Expected:** Build completes successfully

### Backend (Railway)

1. **Check Railway Dashboard:**
   - Go to: https://railway.app/dashboard
   - Find your backend service
   - Check latest deployment status
   - ✅ **Expected:** Deployment should succeed

2. **Verify Environment Variable:**
   - Go to: Service → Variables
   - Check: `SENTRY_DSN` is set
   - ✅ **Required:** Must be set for Sentry to work
   - ⚠️ **If Missing:** Add DSN from Sentry dashboard

3. **Check Deployment Logs:**
   - Look for: "Sentry initialized" (if DSN is set)
   - Look for: "Sentry DSN not configured" (if DSN is missing)
   - ✅ **Expected:** No errors during startup

---

## Step 2: Verify Sentry Initialization

### Frontend

1. **Open Production Site:**
   - Go to: https://app.restocked.now
   - Open browser DevTools → Console

2. **Check Console:**
   - ✅ **If DSN is set:** No Sentry errors
   - ⚠️ **If DSN is missing:** "Sentry DSN not configured" warning
   - ✅ **Expected:** No errors, Sentry initialized silently

3. **Check Network Tab:**
   - Filter: "sentry"
   - ✅ **Expected:** Requests to `*.sentry.io` (if DSN is set)

### Backend

1. **Check Railway Logs:**
   ```bash
   railway logs --tail 50
   ```
   Or check Railway dashboard → Deployments → View Logs

2. **Look for:**
   - ✅ **If DSN is set:** No Sentry-related errors
   - ⚠️ **If DSN is missing:** "Sentry DSN not configured. Error monitoring disabled."
   - ✅ **Expected:** Server starts normally

---

## Step 3: Test Error Tracking

### Frontend Error Test

1. **Temporarily Add Test Error:**
   - Edit any component (e.g., `Dashboard.tsx`)
   - Add: `throw new Error('Test Sentry frontend error');`
   - Deploy to production

2. **Trigger the Error:**
   - Navigate to the page with the error
   - Error should be caught by ErrorBoundary
   - ErrorBoundary should forward to Sentry

3. **Check Sentry Dashboard:**
   - Go to: https://sentry.io/
   - Select your **frontend project**
   - Go to: **Issues**
   - ✅ **Expected:** Error appears within 1-2 minutes
   - ✅ **Verify:** Error includes React component stack

4. **Remove Test Error:**
   - Remove the test error code
   - Commit and deploy

### Backend Error Test

1. **Temporarily Add Test Error:**
   - Edit any route (e.g., `src/api/routes/auth.ts`)
   - Add: `throw new Error('Test Sentry backend error');`
   - Deploy to Railway

2. **Trigger the Error:**
   - Make a request to the endpoint with the error
   - Error should be caught by Sentry error handler

3. **Check Sentry Dashboard:**
   - Go to: https://sentry.io/
   - Select your **backend project**
   - Go to: **Issues**
   - ✅ **Expected:** Error appears within 1-2 minutes
   - ✅ **Verify:** Error includes request context (URL, method, headers)

4. **Remove Test Error:**
   - Remove the test error code
   - Commit and deploy

---

## Step 4: Verify Performance Monitoring

### Frontend Performance

1. **Check Sentry Dashboard:**
   - Go to: **Performance** → **Transactions**
   - ✅ **Expected:** Page load transactions appear
   - ✅ **Verify:** API request durations are tracked

2. **Check Specific Pages:**
   - Navigate to different pages
   - Wait 1-2 minutes
   - Check Performance tab
   - ✅ **Expected:** Transactions for each page load

### Backend Performance

1. **Check Sentry Dashboard:**
   - Go to: **Performance** → **Transactions**
   - ✅ **Expected:** API endpoint transactions appear
   - ✅ **Verify:** Response times are tracked

2. **Make API Requests:**
   - Make requests to various endpoints
   - Wait 1-2 minutes
   - Check Performance tab
   - ✅ **Expected:** Transactions for each API call

---

## Step 5: Verify Production Safety

### Stack Traces in API Responses

1. **Test Error Endpoint:**
   - Make a request that triggers an error
   - Check the API response

2. **Verify Response:**
   - ✅ **Expected:** No stack traces in response
   - ✅ **Expected:** Generic error message only
   - ✅ **Verify:** `error.details` does not contain `stack` property

3. **Check in Development:**
   - Test same error in development
   - ✅ **Expected:** Stack traces included (for debugging)

---

## Step 6: Final Verification

### Checklist

- [ ] Frontend deployment successful (Vercel)
- [ ] Backend deployment successful (Railway)
- [ ] `VITE_SENTRY_DSN` set in Vercel
- [ ] `SENTRY_DSN` set in Railway
- [ ] Frontend errors appear in Sentry dashboard
- [ ] Backend errors appear in Sentry dashboard
- [ ] Performance monitoring working (frontend)
- [ ] Performance monitoring working (backend)
- [ ] Stack traces excluded from production API responses
- [ ] ErrorBoundary catches React errors
- [ ] Sentry captures unhandled promise rejections

---

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN:**
   - Verify DSN is correct in environment variables
   - DSN format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

2. **Check Environment:**
   - Errors only sent in production (not dev)
   - Verify `NODE_ENV=production` or `APP_ENV=production`

3. **Check Sentry Project:**
   - Verify you're looking at the correct project
   - Frontend errors → React project
   - Backend errors → Node.js project

4. **Check Filters:**
   - Sentry dashboard may have filters applied
   - Clear date range and environment filters

### Build/Deployment Failures

1. **TypeScript Errors:**
   - All TypeScript compilation passed locally
   - If errors in deployment, check environment differences

2. **Missing Dependencies:**
   - Packages are in `package.json`
   - Railway/Vercel should install automatically

3. **Environment Variables:**
   - `VITE_SENTRY_DSN` required for frontend
   - `SENTRY_DSN` required for backend
   - Both are optional (monitoring disabled if missing)

---

## Next Steps

Once all checks pass:

1. ✅ **Monitor Sentry Dashboard** for real errors
2. ✅ **Set up Alerts** for critical errors
3. ✅ **Review Performance** metrics regularly
4. ✅ **Remove Test Errors** if added for testing

---

**Status:** ⏳ **AWAITING DEPLOYMENT VERIFICATION**  
**Ready for:** Production error monitoring



