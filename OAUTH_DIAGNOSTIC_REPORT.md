# Google OAuth Complete Diagnostic Report

**Date:** 2025-12-04  
**Status:** 🔍 Diagnostic Analysis Complete  
**Error Observed:** `{"error":{"code":"INTERNAL_ERROR","message":"Internal server error","details":{"message":"Not allowed by CORS"}}}`

---

## STEP 1: Intended Architecture (Derived from Codebase)

### 1.1 Expected Google OAuth Flow

**Complete Flow:**
1. **User clicks "Sign in with Google"** → Frontend (`Login.tsx`)
2. **Frontend calls** `GET /auth/google/url` → Backend (`auth.ts` route)
3. **Backend returns** `{ url: "https://accounts.google.com/o/oauth2/v2/auth?..." }`
4. **Frontend redirects** browser to Google OAuth consent screen
5. **User approves** → Google redirects to `https://restockednew-production.up.railway.app/auth/google/callback?code=...`
6. **Backend processes callback** → Exchanges code for user info → Creates/logs in user → Redirects to frontend with token
7. **Frontend receives** `https://app.restocked.now/auth/callback?token=...`
8. **Frontend extracts token** → Calls `/me` to verify → Saves to authStore → Redirects to dashboard

### 1.2 Files Involved in Each Stage

| Stage | Frontend Files | Backend Files |
|-------|---------------|---------------|
| **Initiate OAuth** | `frontend/src/pages/Login.tsx` (line 57-69)<br>`frontend/src/api/auth.ts` (line 21-24)<br>`frontend/src/lib/apiClient.ts` | `src/api/routes/auth.ts` (line 117-139)<br>`src/api/utils/googleOAuth.ts` (line 35-55) |
| **OAuth Callback** | `frontend/src/pages/OAuthCallback.tsx` | `src/api/routes/auth.ts` (line 147-189)<br>`src/api/utils/googleOAuth.ts` (line 63-103)<br>`src/services/authService.ts` (line 115-161)<br>`src/db/repositories/userRepository.ts` |
| **CORS Configuration** | N/A | `src/api/server.ts` (line 59-116) |
| **Config Management** | `frontend/src/lib/apiClient.ts` (line 5)<br>`frontend/vite.config.ts` | `src/config.ts` (line 127-128) |

### 1.3 Environment Variables Required

#### Backend (Railway) - Required:
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `GOOGLE_REDIRECT_URL` - Optional, defaults to `${BACKEND_URL}/auth/google/callback`
- `BACKEND_URL` - Used for redirect URL fallback (line 10 of `googleOAuth.ts`)
- `FRONTEND_URL` - Used for redirecting after OAuth callback (line 152, 177 of `auth.ts`)

#### Backend (Railway) - Optional:
- `GOOGLE_REDIRECT_URI` - Alias for `GOOGLE_REDIRECT_URL` (line 10 of `googleOAuth.ts`)

#### Frontend (Vercel) - Required:
- `VITE_GOOGLE_OAUTH_ENABLED` - Must be exactly `"true"` (string) to show button
- `VITE_API_BASE_URL` - Backend API URL (defaults to `http://localhost:3000`)

### 1.4 Environment Variable Usage Locations

| Variable | Backend Usage | Frontend Usage |
|----------|--------------|----------------|
| `GOOGLE_CLIENT_ID` | `src/api/utils/googleOAuth.ts:12,23` | N/A |
| `GOOGLE_CLIENT_SECRET` | `src/api/utils/googleOAuth.ts:13,24` | N/A |
| `GOOGLE_REDIRECT_URL` | `src/api/utils/googleOAuth.ts:10` | N/A |
| `BACKEND_URL` | `src/config.ts:128`<br>`src/api/utils/googleOAuth.ts:10` (fallback) | N/A |
| `FRONTEND_URL` | `src/config.ts:127`<br>`src/api/routes/auth.ts:152,177` | N/A |
| `VITE_GOOGLE_OAUTH_ENABLED` | N/A | `frontend/src/pages/Login.tsx:20`<br>`frontend/src/pages/OAuthCallback.tsx:25` |
| `VITE_API_BASE_URL` | N/A | `frontend/src/lib/apiClient.ts:5` |

### 1.5 Frontend vs Backend Responsibilities

**Frontend:**
- Show/hide Google button based on `VITE_GOOGLE_OAUTH_ENABLED`
- Call `GET /auth/google/url` when button clicked
- Redirect browser to Google OAuth URL
- Handle callback at `/auth/callback?token=...`
- Extract token and verify via `/me` endpoint
- Save token to authStore

**Backend:**
- Generate Google OAuth URL
- Handle Google callback at `/auth/google/callback`
- Exchange authorization code for user info
- Create/login user in database
- Generate JWT token
- Redirect to frontend with token

---

## STEP 2: Component Verification

### 2A. Backend Checks

#### ✅ `src/api/routes/auth.ts`

**Route: `GET /auth/google/url` (line 117-139)**
- ✅ Checks `isGoogleOAuthConfigured()` before processing
- ✅ Returns 400 if not configured
- ✅ Calls `getGoogleAuthUrl()` which uses env vars
- ✅ Returns `{ url: string }` on success
- ✅ Error handling with Sentry integration

**Route: `GET /auth/google/callback` (line 147-189)**
- ✅ Checks configuration first
- ✅ Extracts `code` from query params
- ✅ Calls `handleGoogleCallback(code)`
- ✅ Calls `authService.oauthLogin()`
- ✅ Redirects to frontend with token
- ✅ Error handling with redirect to login page

#### ✅ `src/api/utils/googleOAuth.ts`

**Function: `isGoogleOAuthConfigured()` (line 21-26)**
- ✅ Checks `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- ✅ Returns boolean

**Function: `getOAuth2Client()` (line 9-16)**
- ✅ Reads `GOOGLE_CLIENT_ID` (line 12)
- ✅ Reads `GOOGLE_CLIENT_SECRET` (line 13)
- ✅ Reads `GOOGLE_REDIRECT_URL` or `GOOGLE_REDIRECT_URI` (line 10)
- ✅ Falls back to `${config.backendUrl}/auth/google/callback` if not set

**Function: `getGoogleAuthUrl()` (line 35-55)**
- ✅ Checks configuration before generating URL
- ✅ Uses OAuth2 client with correct scopes
- ✅ Returns valid Google OAuth URL

**Function: `handleGoogleCallback()` (line 63-103)**
- ✅ Checks configuration
- ✅ Exchanges code for tokens
- ✅ Fetches user info from Google
- ✅ Returns email and providerId

#### ✅ `src/services/authService.ts`

**Method: `oauthLogin()` (line 115-161)**
- ✅ Finds user by OAuth provider + provider ID
- ✅ Falls back to email lookup
- ✅ Creates new user if not found (with `password_hash: null`)
- ✅ Generates JWT token
- ✅ Returns `{ user, token }` (same format as email/password)

#### ✅ `src/db/repositories/userRepository.ts`

**Method: `createUser()` (line 38-50)**
- ✅ Supports nullable `password_hash` (for OAuth users)
- ✅ Stores `oauth_provider` and `oauth_provider_id`
- ✅ Returns user without password_hash

#### ⚠️ `src/api/server.ts` (CORS Configuration)

**Current CORS Logic (line 89-116):**
```typescript
origin: (origin, callback) => {
  // Allow requests with NO origin (for curl and mobile)
  if (!origin) {
    return callback(null, true);
  }
  
  // If origin EXACTLY matches any allowedOrigins entry, allow it
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  
  // If origin ends with ".vercel.app", allow it
  if (origin.endsWith('.vercel.app')) {
    return callback(null, true);
  }
  
  // Otherwise reject
  callback(new Error("Not allowed by CORS"));
}
```

**Allowed Origins List (line 60-87):**
- ✅ `config.backendUrl` (if set) - Added for same-origin requests
- ✅ `process.env.FRONTEND_URL` (if set)
- ✅ `"https://app.restocked.now"` (hardcoded)
- ✅ `"https://restocked.now"` (hardcoded)
- ✅ Development: `"http://localhost:3000"`, `"http://localhost:5173"`, `config.frontendUrl`

**CORS Analysis:**
- ✅ `!origin` check is FIRST (line 93-95) - Should allow requests with no Origin header
- ✅ Backend URL is in allowedOrigins (line 63-65)
- ✅ Frontend URLs are in allowedOrigins
- ✅ `.vercel.app` wildcard support (line 103-105)
- ✅ `credentials: true` is set (line 110)

**Potential Issue:** The CORS logic looks correct, but the error suggests it's still rejecting requests. This could mean:
1. The updated code hasn't been deployed to Railway
2. Railway is injecting an Origin header that doesn't match
3. The browser is sending an Origin header that doesn't match any allowed origins

### 2B. Frontend Checks

#### ✅ `frontend/src/pages/Login.tsx`

**Google Button Visibility (line 20-22):**
- ✅ Checks `VITE_GOOGLE_OAUTH_ENABLED === 'true'` (strict equality, string comparison)
- ✅ Button only rendered if flag is `'true'`
- ✅ No other conditions affect visibility

**Google Login Handler (line 57-69):**
- ✅ Calls `authApi.getGoogleAuthUrl()`
- ✅ Redirects browser to returned URL
- ✅ Error handling with user-friendly message

#### ✅ `frontend/src/pages/OAuthCallback.tsx`

**Callback Handler (line 21-92):**
- ✅ Checks OAuth feature flags (line 25-27)
- ✅ Extracts token from URL query params (line 36)
- ✅ Calls `/me` endpoint to verify token (line 61-65)
- ✅ Saves to authStore (line 68-71)
- ✅ Redirects to dashboard (line 74)

#### ✅ `frontend/src/api/auth.ts`

**`getGoogleAuthUrl()` (line 21-24):**
- ✅ Calls `apiClient.get('/auth/google/url')`
- ✅ Returns `{ url: string }`

#### ✅ `frontend/src/lib/apiClient.ts`

**Base URL Configuration (line 5):**
- ✅ Uses `import.meta.env.VITE_API_BASE_URL` or defaults to `http://localhost:3000`
- ✅ Axios instance created with baseURL (line 34-39)
- ✅ Request interceptor adds auth token (line 42-52)
- ✅ Response interceptor handles 401 errors (line 55-75)

**⚠️ Potential Issue:** If `VITE_API_BASE_URL` is not set in Vercel, the frontend will try to call `http://localhost:3000`, which will fail in production.

---

## STEP 3: Deployment State Reconciliation

### 3.1 Railway Environment Variables (Expected)

Based on code analysis, Railway should have:
- ✅ `GOOGLE_CLIENT_ID` - Required
- ✅ `GOOGLE_CLIENT_SECRET` - Required
- ✅ `GOOGLE_REDIRECT_URL` - Optional (defaults to `${BACKEND_URL}/auth/google/callback`)
- ✅ `BACKEND_URL` - Should be `https://restockednew-production.up.railway.app`
- ✅ `FRONTEND_URL` - Should be `https://app.restocked.now` (or your Vercel URL)

**Verification Needed:** Check Railway dashboard to confirm these are set.

### 3.2 Vercel Environment Variables (Expected)

Based on code analysis, Vercel should have:
- ✅ `VITE_GOOGLE_OAUTH_ENABLED` - Must be exactly `"true"` (string)
- ✅ `VITE_API_BASE_URL` - Must be `https://restockednew-production.up.railway.app`

**Verification Needed:** Check Vercel dashboard to confirm these are set.

### 3.3 Google Cloud Console Redirect URL

**Expected:** `https://restockednew-production.up.railway.app/auth/google/callback`

**Verification Needed:** Check Google Cloud Console → Credentials → OAuth 2.0 Client ID → Authorized redirect URIs

### 3.4 Backend Reachability

**Expected:** Frontend should be able to reach `https://restockednew-production.up.railway.app/auth/google/url`

**Current Error:** CORS error suggests backend is reachable but rejecting the request.

### 3.5 Backend OAuth URL Generation

**Expected:** If env vars are set correctly, `/auth/google/url` should return:
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=..."
}
```

**Current Status:** Request is being rejected by CORS before reaching the route handler.

### 3.6 CORS Logic Analysis

**Current Code Logic:**
1. ✅ Checks `!origin` first - Should allow requests with no Origin header
2. ✅ Checks exact matches in `allowedOrigins`
3. ✅ Checks `.vercel.app` wildcard
4. ✅ Rejects others

**Issue:** The error `"Not allowed by CORS"` suggests the CORS middleware is rejecting the request. This could happen if:
1. The browser is sending an Origin header that doesn't match any allowed origins
2. Railway is injecting an Origin header
3. The updated CORS code hasn't been deployed

---

## STEP 4: Root Cause Analysis

### 4.1 Why CORS is Rejecting Despite `!origin` Check

**Hypothesis 1: Browser is sending Origin header**
- When accessing `https://restockednew-production.up.railway.app/auth/google/url` directly in browser, the browser may send `Origin: null` or `Origin: https://restockednew-production.up.railway.app`
- If it sends the Railway URL as origin, it should match `config.backendUrl` in allowedOrigins
- **Action:** Verify `BACKEND_URL` is set correctly in Railway

**Hypothesis 2: Updated code not deployed**
- The CORS fix we made may not be deployed to Railway yet
- **Action:** Check Railway deployment logs to confirm latest code is deployed

**Hypothesis 3: Railway proxy injecting Origin**
- Railway's proxy might be injecting an Origin header
- **Action:** Check Railway logs for actual Origin header value

**Hypothesis 4: `config.backendUrl` is empty or incorrect**
- If `BACKEND_URL` env var is not set, `config.backendUrl` will be empty string in production
- This means the Railway URL won't be in `allowedOrigins`
- **Action:** Verify `BACKEND_URL` is set in Railway

### 4.2 Browser Origin Header Behavior

**Direct Browser Navigation:**
- When you type a URL in the address bar and press Enter, the browser typically does NOT send an Origin header
- However, if you're testing via JavaScript (fetch/axios), it WILL send an Origin header

**OAuth Redirects:**
- When Google redirects to `/auth/google/callback`, it's a browser navigation (not AJAX)
- Browser navigation typically does NOT send an Origin header
- This should be caught by the `!origin` check

**Frontend API Calls:**
- When frontend calls `/auth/google/url` via axios, it WILL send an Origin header
- Origin will be the frontend URL (e.g., `https://app.restocked.now`)
- This should match one of the allowed origins

### 4.3 CORS Resolver Logic Order

**Current Order:**
1. Check `!origin` → Allow
2. Check exact match → Allow
3. Check `.vercel.app` → Allow
4. Reject

**This order is CORRECT** - `!origin` check runs first.

### 4.4 Railway Origin Header Injection

**Unknown:** We cannot verify if Railway injects Origin headers without checking logs.

**Action Required:** Check Railway deployment logs for the actual Origin header value in the request.

### 4.5 Allowed Origins List Correctness

**Current List:**
- `config.backendUrl` - ✅ Should be `https://restockednew-production.up.railway.app`
- `process.env.FRONTEND_URL` - ✅ Should be `https://app.restocked.now`
- `"https://app.restocked.now"` - ✅ Hardcoded
- `"https://restocked.now"` - ✅ Hardcoded
- `.vercel.app` wildcard - ✅ Supported

**Potential Issue:** If `BACKEND_URL` is not set in Railway, `config.backendUrl` will be empty string, and the Railway URL won't be in the list.

### 4.6 Backend URL Format

**Code reads:** `process.env.BACKEND_URL` (line 128 of `config.ts`)

**Expected format:** `https://restockednew-production.up.railway.app` (no trailing slash)

**Action:** Verify `BACKEND_URL` is set correctly in Railway.

---

## STEP 5: Diagnostic Report Summary

### 5.1 Root Cause Hypothesis

**Most Likely Cause:** `BACKEND_URL` environment variable is not set in Railway, causing `config.backendUrl` to be empty string. This means:
1. The Railway URL (`https://restockednew-production.up.railway.app`) is NOT in the `allowedOrigins` array
2. When the browser sends `Origin: https://restockednew-production.up.railway.app` (or Railway injects it), it doesn't match any allowed origin
3. The request is rejected by CORS

**Secondary Hypothesis:** The updated CORS code hasn't been deployed to Railway yet.

### 5.2 Evidence from Code

**Evidence Supporting Hypothesis 1:**
- `config.ts` line 128: `const backendUrl = process.env.BACKEND_URL || (isDevelopment ? "http://localhost:3000" : "");`
- In production, if `BACKEND_URL` is not set, `backendUrl` will be empty string
- `server.ts` line 63-65: Only adds `config.backendUrl` to allowedOrigins if it's truthy
- If `backendUrl` is empty string, Railway URL won't be in allowedOrigins

**Evidence Supporting Hypothesis 2:**
- The CORS code we updated includes the `!origin` check at the top
- If this code isn't deployed, the old CORS logic might still be running
- Old logic might not have the `!origin` check or might have it in the wrong place

### 5.3 Inconsistencies Found

1. ⚠️ **`BACKEND_URL` may not be set in Railway**
   - Code expects it (line 128 of `config.ts`)
   - If not set, `config.backendUrl` will be empty string
   - Railway URL won't be in allowedOrigins

2. ⚠️ **`FRONTEND_URL` may not be set in Railway**
   - Code uses it for redirects (line 152, 177 of `auth.ts`)
   - If not set, redirects will fail

3. ⚠️ **`VITE_API_BASE_URL` may not be set in Vercel**
   - Frontend defaults to `http://localhost:3000` if not set
   - Production builds will fail (vite.config.ts validation)
   - But if somehow deployed, API calls will fail

4. ✅ **CORS logic is correct** - The code logic is sound, but may not be deployed

### 5.4 Minimal Set of Next Actions

**Immediate Actions:**

1. **Verify Railway Environment Variables:**
   - Check if `BACKEND_URL` is set to `https://restockednew-production.up.railway.app`
   - Check if `FRONTEND_URL` is set to `https://app.restocked.now` (or your Vercel URL)
   - Check if `GOOGLE_CLIENT_ID` is set
   - Check if `GOOGLE_CLIENT_SECRET` is set
   - Check if `GOOGLE_REDIRECT_URL` is set (optional, but recommended)

2. **Verify Railway Deployment:**
   - Check Railway deployment logs to confirm latest code is deployed
   - Check if there are any build errors
   - Verify the CORS code (with `!origin` check) is actually running

3. **Check Railway Logs:**
   - Look for the actual Origin header value in failed requests
   - Check if CORS errors are being logged
   - Verify OAuth configuration check is passing

4. **Verify Vercel Environment Variables:**
   - Check if `VITE_GOOGLE_OAUTH_ENABLED` is set to `"true"` (string)
   - Check if `VITE_API_BASE_URL` is set to `https://restockednew-production.up.railway.app`

5. **Verify Google Cloud Console:**
   - Check if redirect URI is exactly: `https://restockednew-production.up.railway.app/auth/google/callback`
   - No trailing slash, no query params

6. **Test with curl:**
   ```bash
   curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
     -H "Origin: https://app.restocked.now"
   ```
   - If this works, CORS is configured correctly
   - If this fails, check Railway logs for the error

### 5.5 Final Question

**Do you want me to fix this automatically, or continue diagnosing?**

**Recommendation:** Before making changes, please:
1. Check Railway environment variables (especially `BACKEND_URL` and `FRONTEND_URL`)
2. Check Railway deployment logs to confirm latest code is deployed
3. Check Railway logs for the actual Origin header value in failed requests
4. Test with curl to see if CORS is working for allowed origins

Once we have this information, I can:
- Fix any environment variable issues
- Update CORS logic if needed
- Add better error logging to diagnose the issue

**Most Likely Fix:** Add `BACKEND_URL` to Railway environment variables if it's missing.

---

## Appendix: Code References

### Backend Environment Variables (Railway)
- `GOOGLE_CLIENT_ID` → `src/api/utils/googleOAuth.ts:12,23`
- `GOOGLE_CLIENT_SECRET` → `src/api/utils/googleOAuth.ts:13,24`
- `GOOGLE_REDIRECT_URL` → `src/api/utils/googleOAuth.ts:10`
- `BACKEND_URL` → `src/config.ts:128`, `src/api/utils/googleOAuth.ts:10` (fallback)
- `FRONTEND_URL` → `src/config.ts:127`, `src/api/routes/auth.ts:152,177`

### Frontend Environment Variables (Vercel)
- `VITE_GOOGLE_OAUTH_ENABLED` → `frontend/src/pages/Login.tsx:20`, `frontend/src/pages/OAuthCallback.tsx:25`
- `VITE_API_BASE_URL` → `frontend/src/lib/apiClient.ts:5`

### CORS Configuration
- `src/api/server.ts:59-116` - CORS middleware configuration
- `src/config.ts:127-128` - URL configuration

### OAuth Routes
- `src/api/routes/auth.ts:117-139` - GET /auth/google/url
- `src/api/routes/auth.ts:147-189` - GET /auth/google/callback

### OAuth Utilities
- `src/api/utils/googleOAuth.ts` - Google OAuth helper functions
- `src/services/authService.ts:115-161` - OAuth login service method

