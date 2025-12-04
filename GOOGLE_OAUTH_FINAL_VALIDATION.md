# Google OAuth Final Validation & Deployment Readiness

**Date:** 2025-12-04  
**Status:** ✅ Code validated, ready for deployment

---

## A) Backend Validation

### A.1 Environment Variable Usage (Verified ✅)

**File:** `src/api/utils/googleOAuth.ts`

**Line 10-14:** `getOAuth2Client()` function
```typescript
const redirectUrl = process.env.GOOGLE_REDIRECT_URL 
  || process.env.GOOGLE_REDIRECT_URI 
  || `${config.backendUrl}/auth/google/callback`;

return new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,        // ✅ Reads GOOGLE_CLIENT_ID
  process.env.GOOGLE_CLIENT_SECRET,   // ✅ Reads GOOGLE_CLIENT_SECRET
  redirectUrl                          // ✅ Uses GOOGLE_REDIRECT_URL or fallback
);
```

**Line 21-25:** `isGoogleOAuthConfigured()` function
```typescript
export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&     // ✅ Checks GOOGLE_CLIENT_ID
    process.env.GOOGLE_CLIENT_SECRET    // ✅ Checks GOOGLE_CLIENT_SECRET
  );
}
```

**Verification:**
- ✅ `GOOGLE_CLIENT_ID` - Required, used in OAuth2 client initialization
- ✅ `GOOGLE_CLIENT_SECRET` - Required, used in OAuth2 client initialization
- ✅ `GOOGLE_REDIRECT_URL` - Optional, used if set, otherwise falls back to `${config.backendUrl}/auth/google/callback`
- ✅ `GOOGLE_REDIRECT_URI` - Alias supported (also checked)

### A.2 Route Implementation (Verified ✅)

**File:** `src/api/routes/auth.ts`

**Line 117-139:** `GET /auth/google/url`
- ✅ Checks `isGoogleOAuthConfigured()` before processing
- ✅ Returns 400 with clear error if not configured
- ✅ Returns `{ url: string }` if configured
- ✅ Uses Pino logging and Sentry error capture

**Line 147-189:** `GET /auth/google/callback`
- ✅ Checks `isGoogleOAuthConfigured()` first (early return)
- ✅ Extracts `code` from query params
- ✅ Calls `handleGoogleCallback(code)` to get user info
- ✅ Calls `authService.oauthLogin(email, 'google', providerId)`
- ✅ Redirects to frontend with token on success
- ✅ Redirects to frontend with error on failure
- ✅ Uses Pino logging and Sentry error capture

### A.3 Service Implementation (Verified ✅)

**File:** `src/services/authService.ts`

**Line 115-161:** `oauthLogin()` method
- ✅ Accepts: `email`, `provider: 'google'`, `providerId`
- ✅ Finds user by OAuth provider + provider ID first
- ✅ Falls back to email lookup (for linking existing accounts)
- ✅ Creates new user if not found (with `password_hash: null`)
- ✅ Generates JWT token (same format as email/password)
- ✅ Returns `{ user, token }` (same format as email/password)

**Verification:**
- ✅ Does NOT require password_hash (OAuth users have `password_hash: null`)
- ✅ Uses same JWT format as email/password login
- ✅ Returns same response shape as email/password login

---

## B) Frontend Validation

### B.1 Feature Flag Implementation (Verified ✅)

**File:** `frontend/src/pages/Login.tsx`

**Line 20:** Feature flag check
```typescript
const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true';
```

**Line 22:** Button visibility logic
```typescript
const showOAuthButtons = googleOAuthEnabled || appleOAuthEnabled;
```

**Line 127-185:** Conditional rendering
```typescript
{showOAuthButtons && (
  <>
    {/* OAuth buttons section */}
    {googleOAuthEnabled && (
      <Button onClick={handleGoogleLogin}>
        Sign in with Google
      </Button>
    )}
  </>
)}
```

**Verification:**
- ✅ Uses strict equality (`=== 'true'`) - only string `'true'` enables button
- ✅ Default behavior: if env var is unset, `undefined === 'true'` is `false` → button hidden
- ✅ If env var is `'false'`, `'false' === 'true'` is `false` → button hidden
- ✅ Only explicit `'true'` string enables button

### B.2 OAuth Callback Safety (Verified ✅)

**File:** `frontend/src/pages/OAuthCallback.tsx`

**Line 25-26:** Safety check
```typescript
const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true';
const appleOAuthEnabled = import.meta.env.VITE_APPLE_OAUTH_ENABLED === 'true';
if (!googleOAuthEnabled && !appleOAuthEnabled) {
  // Redirects to login if OAuth disabled
}
```

**Verification:**
- ✅ Checks feature flags before processing
- ✅ Redirects to login if OAuth is disabled
- ✅ Uses same `authStore.login()` method as email/password
- ✅ Calls `/me` endpoint to verify token
- ✅ Handles errors gracefully

---

## C) Google Cloud Setup

### C.1 Required Configuration

**OAuth 2.0 Client ID:**
- **Type:** Web application
- **Name:** Any name (e.g., "Restocked Web Client")

**Authorized Redirect URIs:**
```
https://restockednew-production.up.railway.app/auth/google/callback
```

**Critical Requirements:**
- ✅ Must use `https://` (not `http://`)
- ✅ No trailing slash
- ✅ Exact path: `/auth/google/callback`
- ✅ Must match Railway backend URL exactly

### C.2 Exact Values to Configure

**In Google Cloud Console → Credentials → OAuth 2.0 Client ID:**

1. **Application type:** Web application
2. **Authorized redirect URIs:** Add this EXACT URL:
   ```
   https://restockednew-production.up.railway.app/auth/google/callback
   ```
3. **Copy credentials:**
   - Client ID: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### C.3 Redirect URI Matching Rules

**Must Match Exactly:**
- Protocol: `https://` (required)
- Domain: `restockednew-production.up.railway.app`
- Path: `/auth/google/callback` (no trailing slash)
- No query parameters
- No fragments

**Common Mismatches:**
- ❌ `http://restockednew-production.up.railway.app/auth/google/callback` (missing 's')
- ❌ `https://restockednew-production.up.railway.app/auth/google/callback/` (trailing slash)
- ❌ `https://restockednew-production.up.railway.app/google/callback` (missing `/auth`)
- ❌ `https://restockednew-production.up.railway.app/auth/google/callback?param=value` (query params)

---

## D) Railway Variables

### D.1 Exact Location

**Path:** Railway Dashboard → Your Project → Backend Service → Variables Tab

**Steps:**
1. Go to: https://railway.app/
2. Select your project
3. Click on your **Backend service** (not the database)
4. Click **Variables** tab (top navigation)
5. Click **+ New Variable** button

### D.2 Variables to Add

Add these **3 variables** (one at a time):

**Variable 1:**
```
Key: GOOGLE_CLIENT_ID
Value: <paste your Client ID from Google Cloud Console>
```
Click **Add**

**Variable 2:**
```
Key: GOOGLE_CLIENT_SECRET
Value: <paste your Client Secret from Google Cloud Console>
```
Click **Add**

**Variable 3:**
```
Key: GOOGLE_REDIRECT_URL
Value: https://restockednew-production.up.railway.app/auth/google/callback
```
Click **Add**

### D.3 Verification

**After adding variables:**
1. Check **Deployments** tab - new deployment should start automatically
2. Wait for deployment to complete (status = "Deployed")
3. Check deployment logs for errors
4. Verify variables are listed in **Variables** tab

**Expected:**
- ✅ All 3 variables visible in Variables tab
- ✅ Deployment completes successfully
- ✅ No errors in deployment logs

---

## E) Vercel Variables

### E.1 Exact Location

**Path:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Steps:**
1. Go to: https://vercel.com/
2. Select your project
3. Click **Settings** (left sidebar)
4. Click **Environment Variables** (under Settings)
5. Click **Add New** button

### E.2 Variable to Add

**Single Variable:**
```
Key: VITE_GOOGLE_OAUTH_ENABLED
Value: true
Environments: ☑ Production ☑ Preview ☑ Development
```
Click **Save**

### E.3 Verification

**After adding variable:**
1. Check **Deployments** tab - new deployment should start automatically
2. Wait for deployment to complete (status = "Ready")
3. Check deployment logs for errors
4. Verify variable is listed in **Environment Variables** tab

**Expected:**
- ✅ Variable visible in Environment Variables tab
- ✅ Value is `true` (string)
- ✅ Applied to Production environment
- ✅ Deployment completes successfully

---

## F) End-to-End Test Plan

### F.1 Pre-Deployment Test (Backend Configuration)

**Test Endpoint:** `GET /auth/google/url`

**Command:**
```bash
curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
  -H "Origin: https://app.restocked.now"
```

**Expected Success (200):**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**Expected Failure (400) - If not configured:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Google OAuth is not configured"
  }
}
```

**If 400:** Check Railway env vars are set and deployment completed.

---

### F.2 Post-Deployment Test Sequence

#### Test 1: Email/Password Login (Must Still Work)

**Steps:**
1. Visit: `https://app.restocked.now/login`
2. Enter email and password
3. Click "Sign in"
4. Should redirect to dashboard

**Expected:**
- ✅ Email/password form works normally
- ✅ User can log in
- ✅ Redirects to dashboard
- ✅ User can access protected routes

**If fails:** OAuth changes broke email/password → **STOP and rollback**

---

#### Test 2: Frontend Button Visibility

**Steps:**
1. Visit: `https://app.restocked.now/login`
2. Look for "Sign in with Google" button

**Expected:**
- ✅ Button appears below email/password form
- ✅ Button has Google logo/icon
- ✅ Button is clickable

**If button doesn't appear:**
- Check `VITE_GOOGLE_OAUTH_ENABLED` is exactly `"true"` (string)
- Verify Vercel deployment completed
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors

---

#### Test 3: OAuth Flow Initiation

**Steps:**
1. Click "Sign in with Google" button
2. Observe browser redirect

**Expected:**
- ✅ Browser redirects to Google OAuth consent screen
- ✅ URL: `https://accounts.google.com/o/oauth2/v2/auth?...`
- ✅ URL contains `client_id` parameter
- ✅ URL contains `redirect_uri` parameter

**Check redirect_uri in URL:**
- Should contain: `redirect_uri=https%3A%2F%2Frestockednew-production.up.railway.app%2Fauth%2Fgoogle%2Fcallback`
- (URL-encoded version)

**If redirect fails:**
- Check Railway logs for: `"Google OAuth not configured"`
- Verify all 3 env vars are set in Railway
- Verify `GOOGLE_REDIRECT_URL` matches exactly

---

#### Test 4: OAuth Callback

**Steps:**
1. Complete Google OAuth flow (select account, grant permissions)
2. Observe redirect after Google approval

**Expected:**
- ✅ Browser redirects to: `https://app.restocked.now/auth/callback?token=...`
- ✅ Token is present in URL (long JWT string)
- ✅ No error messages in URL

**If callback fails:**
- Check Google Cloud Console → Authorized redirect URIs
- Must match exactly: `https://restockednew-production.up.railway.app/auth/google/callback`
- Check Railway logs for callback errors

---

#### Test 5: Token Validation and Login

**Steps:**
1. After redirect to `/auth/callback?token=...`
2. Check browser console (F12 → Console)
3. Observe page behavior

**Expected:**
- ✅ No console errors
- ✅ Page shows "Completing sign in..." briefly
- ✅ Then redirects to `/dashboard`
- ✅ User is logged in

**Verify token via API:**
```bash
# Extract token from callback URL, then:
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://restockednew-production.up.railway.app/me
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "plan": "free",
    "oauth_provider": "google",
    "oauth_provider_id": "123456789",
    ...
  }
}
```

---

#### Test 6: User Auto-Provisioning

**Steps:**
1. After successful OAuth login
2. Check user account in database (optional)
3. Verify user can access all features

**Expected:**
- ✅ User can access dashboard
- ✅ User email matches Google account email
- ✅ User can access protected routes
- ✅ User has `oauth_provider: 'google'` in database
- ✅ User has `password_hash: null` in database

**Verify in Railway Logs:**
- Look for: `"Google OAuth login successful"` with email and userId
- Log should include: `{ email: "...", userId: "...", provider: "google" }`

---

#### Test 7: Logging Verification

**Railway Logs:**
Go to Railway Dashboard → Backend Service → Deployments → Latest → View Logs

**Expected Success Logs:**
```
[INFO] Generated Google OAuth URL { authUrl: "https://accounts.google.com/..." }
[INFO] Google OAuth callback successful { email: "user@example.com", providerId: "123456789" }
[INFO] Google OAuth login successful { email: "user@example.com", userId: "uuid-here", provider: "google" }
```

**Sentry:**
- ✅ No errors in Sentry (if OAuth works correctly)
- ✅ If errors occur, they have tags: `oauth_provider: "google"`, `endpoint: "/auth/google/..."`

---

## G) Rollback Steps

### G.1 Rollback Frontend (Disable OAuth Button)

**If OAuth button causes issues or you want to disable:**

1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find: `VITE_GOOGLE_OAUTH_ENABLED`
3. Either:
   - **Option A:** Change value to `false`
   - **Option B:** Delete the variable
4. Save
5. Wait for Vercel to redeploy

**Result:**
- ✅ OAuth button disappears
- ✅ Email/password login continues to work
- ✅ No breaking changes

---

### G.2 Rollback Backend (Disable OAuth Routes)

**If OAuth backend causes issues:**

1. Go to: Railway Dashboard → Your Project → Backend Service → Variables
2. Delete these 3 variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URL`
3. Wait for Railway to redeploy

**Result:**
- ✅ OAuth routes return 400 errors (graceful degradation)
- ✅ Email/password login continues to work
- ✅ No crashes or unhandled errors

---

### G.3 Full Rollback (Disable Everything)

**If you need to completely disable OAuth:**

1. **Vercel:** Remove or set `VITE_GOOGLE_OAUTH_ENABLED=false`
2. **Railway:** Remove all 3 Google OAuth env vars
3. Wait for both deployments to complete

**Result:**
- ✅ OAuth completely disabled
- ✅ Email/password login unaffected
- ✅ System behaves exactly as before OAuth was added

---

### G.4 Verify Rollback

**After rollback:**

1. **Test email/password login:**
   - Visit: `https://app.restocked.now/login`
   - Login with email/password
   - Should work normally

2. **Test OAuth button:**
   - Should NOT appear (if frontend var removed)
   - Or should return error (if only backend vars removed)

3. **Check logs:**
   - No OAuth-related errors
   - Email/password login works

---

## Backend Endpoint for Pre-Flight Check

### Endpoint: `GET /auth/google/url`

**Purpose:** Verify OAuth is configured correctly BEFORE using the button

**URL:**
```
https://restockednew-production.up.railway.app/auth/google/url
```

**Request:**
```bash
curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
  -H "Origin: https://app.restocked.now"
```

**Success Response (200):**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=https%3A%2F%2Frestockednew-production.up.railway.app%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=..."
}
```

**Failure Response (400) - Not Configured:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Google OAuth is not configured"
  }
}
```

**How to Use:**
1. Set Railway env vars
2. Wait for Railway deployment
3. Run the curl command above
4. If 200 → OAuth is configured correctly, proceed with frontend test
5. If 400 → Check Railway env vars and deployment

---

## Deployment Readiness Checklist

### Pre-Deployment

- [ ] Google Cloud Console OAuth credentials created
- [ ] Authorized redirect URI added: `https://restockednew-production.up.railway.app/auth/google/callback`
- [ ] Client ID and Client Secret copied
- [ ] Code validated (this document)

### Railway Deployment

- [ ] Go to Railway Dashboard → Project → Backend Service → Variables
- [ ] Add `GOOGLE_CLIENT_ID` = `<from Google Cloud>`
- [ ] Add `GOOGLE_CLIENT_SECRET` = `<from Google Cloud>`
- [ ] Add `GOOGLE_REDIRECT_URL` = `https://restockednew-production.up.railway.app/auth/google/callback`
- [ ] Wait for deployment to complete
- [ ] Test: `curl https://restockednew-production.up.railway.app/auth/google/url` → Should return 200

### Vercel Deployment

- [ ] Go to Vercel Dashboard → Project → Settings → Environment Variables
- [ ] Add `VITE_GOOGLE_OAUTH_ENABLED` = `true`
- [ ] Select all environments (Production, Preview, Development)
- [ ] Wait for deployment to complete
- [ ] Visit `https://app.restocked.now/login` → Button should appear

### Post-Deployment Verification

- [ ] Email/password login still works
- [ ] Google button appears on login page
- [ ] Clicking button redirects to Google OAuth
- [ ] After Google approval, callback returns token
- [ ] User is logged in and redirected to dashboard
- [ ] Railway logs show: "Google OAuth login successful"
- [ ] No errors in browser console
- [ ] No errors in Railway logs

---

## Summary

**Backend Validation:** ✅ All env vars read correctly  
**Frontend Validation:** ✅ Feature flag works correctly  
**Google Cloud Setup:** ✅ Redirect URI documented  
**Railway Variables:** ✅ Exact location and values documented  
**Vercel Variables:** ✅ Exact location and value documented  
**Test Plan:** ✅ Comprehensive end-to-end tests  
**Rollback Plan:** ✅ Safe rollback procedures documented  

**Status:** ✅ **Ready for deployment**

---

**Next Step:** Follow the "Deployment Readiness Checklist" above to enable Google OAuth.

