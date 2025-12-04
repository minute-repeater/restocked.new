# Google OAuth Deployment - Ready for Production

**Date:** 2025-12-04  
**Status:** ✅ Code validated, ready for env var configuration

---

## ✅ Code Validation Results

### Backend Environment Variables (Verified)

**File:** `src/api/utils/googleOAuth.ts`

The backend expects these exact variable names:
- ✅ `GOOGLE_CLIENT_ID` (required)
- ✅ `GOOGLE_CLIENT_SECRET` (required)
- ✅ `GOOGLE_REDIRECT_URL` (optional, falls back to `${config.backendUrl}/auth/google/callback`)
- ✅ `GOOGLE_REDIRECT_URI` (alias, also supported)

**Configuration Check:**
```typescript
// Line 21-25: isGoogleOAuthConfigured()
return !!(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
);
```

**Redirect URL Construction:**
```typescript
// Line 10: getOAuth2Client()
const redirectUrl = process.env.GOOGLE_REDIRECT_URL 
  || process.env.GOOGLE_REDIRECT_URI 
  || `${config.backendUrl}/auth/google/callback`;
```

### Redirect URL Path (Verified)

**Expected Callback Route:** `/auth/google/callback`

**File:** `src/api/routes/auth.ts`
- ✅ Line 142: Route defined as `GET /auth/google/callback`
- ✅ Line 177: Redirects to `${config.frontendUrl}/auth/callback?token=...`

**Exact Redirect URL:**
```
https://restockednew-production.up.railway.app/auth/google/callback
```

**Validation:**
- ✅ Protocol: `https://` (required)
- ✅ Domain: `restockednew-production.up.railway.app`
- ✅ Path: `/auth/google/callback` (no trailing slash)
- ✅ Matches route definition in code

### Frontend Feature Flag (Verified)

**File:** `frontend/src/pages/Login.tsx`
- ✅ Line 20: `import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true'`
- ✅ Line 139: Button only rendered if `googleOAuthEnabled === true`

**File:** `frontend/src/pages/OAuthCallback.tsx`
- ✅ Line 25: Safety check for disabled OAuth

**Required Value:** String `"true"` (strict equality check)

---

## 📋 Railway Environment Variables

### Copy-Paste Block for Railway Dashboard

Go to: **Railway Dashboard → Your Project → Backend Service → Variables**

Add these 3 variables (one at a time, or use bulk import if available):

```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URL=https://restockednew-production.up.railway.app/auth/google/callback
```

**Instructions:**
1. Replace `YOUR_CLIENT_ID_HERE` with your actual Client ID from Google Cloud Console
2. Replace `YOUR_CLIENT_SECRET_HERE` with your actual Client Secret from Google Cloud Console
3. Keep `GOOGLE_REDIRECT_URL` exactly as shown (no trailing slash)
4. Railway will auto-redeploy after saving

### Railway JSON Format (Alternative)

If Railway supports JSON import:

```json
{
  "GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "GOCSPX-YOUR_CLIENT_SECRET_HERE",
  "GOOGLE_REDIRECT_URL": "https://restockednew-production.up.railway.app/auth/google/callback"
}
```

---

## 📋 Vercel Environment Variables

### Copy-Paste Block for Vercel Dashboard

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add this variable:

```
VITE_GOOGLE_OAUTH_ENABLED=true
```

**Instructions:**
1. Key: `VITE_GOOGLE_OAUTH_ENABLED`
2. Value: `true` (must be the string `"true"`, not boolean)
3. Environments: Select **Production**, **Preview**, and **Development**
4. Click **Save**
5. Vercel will auto-redeploy after saving

### Vercel JSON Format (Alternative)

If Vercel supports JSON import:

```json
{
  "VITE_GOOGLE_OAUTH_ENABLED": "true"
}
```

---

## 🔍 Post-Deployment Verification Checklist

### Step 1: Wait for Deployments

- [ ] Railway deployment completed (check Railway dashboard)
- [ ] Vercel deployment completed (check Vercel dashboard)
- [ ] Both show "Deployed" status

### Step 2: Frontend Button Visibility

**Test:**
1. Visit your frontend login page
2. Look for "Sign in with Google" button

**Expected:**
- ✅ Button appears below email/password form
- ✅ Button has Google logo/icon
- ✅ Button is clickable

**If button doesn't appear:**
- Check `VITE_GOOGLE_OAUTH_ENABLED` is exactly `"true"` (string)
- Verify Vercel deployment completed
- Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Step 3: Redirect Correctness

**Test:**
1. Click "Sign in with Google" button
2. Observe browser redirect

**Expected:**
- ✅ Browser redirects to Google OAuth consent screen
- ✅ URL starts with: `https://accounts.google.com/o/oauth2/v2/auth`
- ✅ URL contains your Client ID
- ✅ URL contains `redirect_uri` parameter

**Check redirect_uri parameter:**
- Should be: `redirect_uri=https%3A%2F%2Frestockednew-production.up.railway.app%2Fauth%2Fgoogle%2Fcallback`
- (URL-encoded version of the redirect URL)

**If redirect fails:**
- Check Railway logs for: `"Google OAuth not configured"`
- Verify all 3 env vars are set in Railway
- Verify `GOOGLE_REDIRECT_URL` matches exactly (no trailing slash)

### Step 4: Callback Correctness

**Test:**
1. Complete Google OAuth flow (select account, grant permissions)
2. Observe redirect after Google approval

**Expected:**
- ✅ Browser redirects to: `https://YOUR_FRONTEND_URL/auth/callback?token=...`
- ✅ Token is present in URL query parameter
- ✅ No error messages in URL

**If callback fails:**
- Check Google Cloud Console → Authorized redirect URIs
- Must match exactly: `https://restockednew-production.up.railway.app/auth/google/callback`
- Check Railway logs for callback errors

### Step 5: Token Returned

**Test:**
1. After redirect to `/auth/callback?token=...`
2. Check browser console (F12 → Console tab)

**Expected:**
- ✅ No console errors
- ✅ Page shows "Completing sign in..." briefly
- ✅ Then redirects to `/dashboard`

**If token invalid:**
- Check Railway logs for: `"Failed to verify authentication token"`
- Verify JWT_SECRET is set in Railway
- Check token format in URL (should be long JWT string)

### Step 6: User Auto-Provisioned

**Test:**
1. After successful login, check user account
2. Verify user was created in database

**Expected:**
- ✅ User can access dashboard
- ✅ User email matches Google account email
- ✅ User can access protected routes

**Verify in Railway logs:**
- Look for: `"Google OAuth login successful"` with email and userId
- User should be created with `oauth_provider: 'google'`
- User should have `password_hash: null`

**Check via API (optional):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://restockednew-production.up.railway.app/me
```

Should return user object with email and plan.

### Step 7: Sentry Log Presence

**Test:**
1. Check Sentry dashboard
2. Look for OAuth-related events

**Expected:**
- ✅ No errors in Sentry (if OAuth works correctly)
- ✅ If errors occur, they should have tags:
  - `oauth_provider: "google"`
  - `endpoint: "/auth/google/url"` or `"/auth/google/callback"`

**Sentry Integration (Verified in Code):**
- ✅ Line 133-135: `/auth/google/url` errors captured
- ✅ Line 181-183: `/auth/google/callback` errors captured
- ✅ Both use proper tags

### Step 8: Pino Structured Log Presence

**Test:**
1. Check Railway logs
2. Look for structured log entries

**Expected Logs:**

**Success Flow:**
```
[INFO] Generated Google OAuth URL { authUrl: "https://accounts.google.com/..." }
[INFO] Google OAuth callback successful { email: "user@example.com", providerId: "123456789" }
[INFO] Google OAuth login successful { email: "user@example.com", userId: "uuid-here", provider: "google" }
```

**Error Flow (if misconfigured):**
```
[WARN] Google OAuth not configured { path: "/auth/google/url" }
[ERROR] Error in GET /auth/google/url { error: "...", path: "/auth/google/url" }
```

**Pino Integration (Verified in Code):**
- ✅ Line 53: `logger.debug()` for URL generation
- ✅ Line 91: `logger.info()` for callback success
- ✅ Line 100: `logger.error()` for callback failures
- ✅ Line 120, 151: `logger.warn()` for missing config
- ✅ Line 170-174: `logger.info()` for login success with provider tag

---

## 🚀 Deployment Sequence

### Step 1: Configure Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Navigate to: **APIs & Services** → **Credentials**
3. Create OAuth 2.0 Client ID (Web application)
4. Add Authorized redirect URI:
   ```
   https://restockednew-production.up.railway.app/auth/google/callback
   ```
5. Copy Client ID and Client Secret

### Step 2: Set Railway Variables

1. Go to: Railway Dashboard → Your Project → Backend Service → Variables
2. Add the 3 variables from the "Railway Environment Variables" section above
3. Replace placeholders with actual values from Google Cloud Console
4. Wait for Railway deployment to complete

### Step 3: Set Vercel Variables

1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `VITE_GOOGLE_OAUTH_ENABLED=true` from the "Vercel Environment Variables" section above
3. Select all environments (Production, Preview, Development)
4. Wait for Vercel deployment to complete

### Step 4: Verify Deployments

1. Check Railway: Deployment status = "Deployed"
2. Check Vercel: Deployment status = "Deployed"
3. Both should show recent deployment timestamps

### Step 5: Run Verification Checklist

Follow the "Post-Deployment Verification Checklist" above, testing each step in order.

---

## ✅ Validation Summary

**Backend Code:**
- ✅ Expects: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL`
- ✅ Route: `/auth/google/callback` (GET)
- ✅ Redirect URL matches: `https://restockednew-production.up.railway.app/auth/google/callback`

**Frontend Code:**
- ✅ Expects: `VITE_GOOGLE_OAUTH_ENABLED === 'true'`
- ✅ Button conditional rendering verified
- ✅ Callback page safety checks verified

**Logging & Monitoring:**
- ✅ Pino structured logging integrated
- ✅ Sentry error capture with tags integrated
- ✅ All log levels verified (debug, info, warn, error)

**Ready for Production:** ✅ **YES**

---

**Next Step:** Follow the "Deployment Sequence" above to enable Google OAuth.

