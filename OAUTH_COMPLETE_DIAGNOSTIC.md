# OAuth Integration Complete Diagnostic Report

**Date:** 2025-12-04  
**Purpose:** Comprehensive analysis of OAuth integration without making code changes  
**Status:** 🔍 Analysis Complete - Awaiting Test Results

---

## 1. CURRENT-STATE ANALYSIS

### 1.1 Backend: Google OAuth URL Construction

#### Code Path: `/auth/google/url` → `getGoogleAuthUrl()`

**File:** `src/api/routes/auth.ts` (lines 146-168)

**Flow:**
1. Route handler receives GET request at `/auth/google/url`
2. Checks `isGoogleOAuthConfigured()` (line 148)
3. If not configured → Returns 400 with error message
4. If configured → Calls `getGoogleAuthUrl()` (line 158)
5. Returns JSON: `{ url: string }` (line 159)

**File:** `src/api/utils/googleOAuth.ts` (lines 35-55)

**URL Construction Logic:**
```typescript
export function getGoogleAuthUrl(state?: string): string {
  if (!isGoogleOAuthConfigured()) {
    throw new Error("Google OAuth is not configured. Missing required environment variables.");
  }

  const oauth2Client = getOAuth2Client();  // Line 40
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: state || undefined,
  });

  return authUrl;
}
```

**OAuth2 Client Initialization:** `getOAuth2Client()` (lines 9-16)
```typescript
function getOAuth2Client() {
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL 
    || process.env.GOOGLE_REDIRECT_URI 
    || `${config.backendUrl}/auth/google/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl
  );
}
```

**Answer to Question 1:** The Google OAuth URL is constructed by:
- `getOAuth2Client()` creates an OAuth2 client with CLIENT_ID, CLIENT_SECRET, and redirect URL
- `getGoogleAuthUrl()` calls `oauth2Client.generateAuthUrl()` with scopes and options
- The redirect URL comes from `GOOGLE_REDIRECT_URL`, `GOOGLE_REDIRECT_URI`, or `${config.backendUrl}/auth/google/callback`

---

### 1.2 Backend: Environment Variables Required

#### Required Variables (Read Locations):

**1. `GOOGLE_CLIENT_ID`**
- **Read at:** `src/api/utils/googleOAuth.ts:12,23`
- **Used in:** `getOAuth2Client()` and `isGoogleOAuthConfigured()`
- **Required:** Yes (OAuth won't work without it)

**2. `GOOGLE_CLIENT_SECRET`**
- **Read at:** `src/api/utils/googleOAuth.ts:13,24`
- **Used in:** `getOAuth2Client()` and `isGoogleOAuthConfigured()`
- **Required:** Yes (OAuth won't work without it)

**3. `GOOGLE_REDIRECT_URL` (Optional)**
- **Read at:** `src/api/utils/googleOAuth.ts:10`
- **Fallback:** `process.env.GOOGLE_REDIRECT_URI` or `${config.backendUrl}/auth/google/callback`
- **Required:** No (has fallback)

**4. `GOOGLE_REDIRECT_URI` (Optional Alias)**
- **Read at:** `src/api/utils/googleOAuth.ts:10`
- **Fallback:** Same as above
- **Required:** No (alias for `GOOGLE_REDIRECT_URL`)

**5. `BACKEND_URL` (Required for redirect URL fallback)**
- **Read at:** `src/config.ts:128`
- **Used in:** `src/api/utils/googleOAuth.ts:10` (fallback redirect URL)
- **Required:** Yes in production (throws error if missing - line 245 of `config.ts`)

**6. `FRONTEND_URL` (Required for callback redirect)**
- **Read at:** `src/config.ts:127`
- **Used in:** `src/api/routes/auth.ts:181,189,206,215` (redirects after OAuth)
- **Required:** Yes in production (throws error if missing - line 241 of `config.ts`)

**Answer to Question 2:** 
- **Required:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BACKEND_URL`, `FRONTEND_URL`
- **Optional:** `GOOGLE_REDIRECT_URL` or `GOOGLE_REDIRECT_URI` (has fallback)

---

### 1.3 Backend: Expected Behavior of `/auth/google/url`

#### Scenario A: OAuth is Correctly Configured

**When:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are both set

**Behavior:**
1. `isGoogleOAuthConfigured()` returns `true`
2. Route handler calls `getGoogleAuthUrl()`
3. OAuth2 client is created successfully
4. Google OAuth URL is generated
5. **Response:** `200 OK` with JSON: `{ url: "https://accounts.google.com/o/oauth2/v2/auth?..." }`

**Code Path:** `src/api/routes/auth.ts:146-159` (success path)

---

#### Scenario B: OAuth is Missing Config

**When:** Either `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is missing

**Behavior:**
1. `isGoogleOAuthConfigured()` returns `false` (line 148)
2. Route handler returns early (line 150)
3. **Response:** `400 Bad Request` with JSON:
   ```json
   {
     "error": {
       "code": "INVALID_REQUEST",
       "message": "Google OAuth is not configured"
     }
   }
   ```
4. Logs warning: `"Google OAuth not configured"` (line 149)

**Code Path:** `src/api/routes/auth.ts:148-156` (early return)

---

#### Scenario C: Browser Sends `Origin: null`

**When:** User opens `https://restockednew-production.up.railway.app/auth/google/url` directly in browser

**CORS Behavior:** `src/api/server.ts:106-130`

**Current CORS Logic:**
```typescript
origin: (origin, callback) => {
  // 1. Allow undefined origin
  if (!origin) {
    return callback(null, true);
  }

  // 2. Allow "null" string literal (explicitly handled)
  if (origin === "null" || origin === null) {
    return callback(null, true);
  }
  
  // ... rest of checks
}
```

**Expected Behavior:**
- If browser sends `Origin: null` (string literal `"null"`):
  - Line 125 checks: `origin === "null"` → **TRUE**
  - Returns `callback(null, true)` → **ALLOWED**
  - Request proceeds to route handler

- If browser sends no Origin header (`undefined`):
  - Line 116 checks: `!origin` → **TRUE**
  - Returns `callback(null, true)` → **ALLOWED**
  - Request proceeds to route handler

**Answer to Question 3:** 
- **Correctly configured:** Returns `200 OK` with `{ url: "..." }`
- **Missing config:** Returns `400 Bad Request` with error message
- **Origin: null:** **SHOULD BE ALLOWED** by CORS (explicit check at line 125)

---

#### Scenario D: Should `/auth/google/url` Ever Be Blocked by CORS?

**Answer to Question 4:** 

**Theoretical Answer:** No, `/auth/google/url` should NOT be blocked by CORS when opened directly because:
1. CORS explicitly allows `origin === "null"` (line 125)
2. CORS explicitly allows `!origin` (undefined) (line 116)
3. CORS allows `.up.railway.app` origins (line 149)

**However, if it IS being blocked, possible causes:**
1. **Browser sends unexpected origin format** (not `undefined`, not `"null"`, not matching patterns)
2. **CORS middleware not applied** (unlikely - it's applied before routes at line 104)
3. **Error occurs BEFORE CORS check** (e.g., server crash, middleware error)
4. **CORS callback not being reached** (request fails earlier in Express pipeline)

---

### 1.4 Frontend: Google OAuth Button Display Logic

**File:** `frontend/src/pages/Login.tsx` (lines 19-22, 127-167)

**Feature Flag Check:**
```typescript
const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true';
const appleOAuthEnabled = import.meta.env.VITE_APPLE_OAUTH_ENABLED === 'true';
const showOAuthButtons = googleOAuthEnabled || appleOAuthEnabled;
```

**Button Rendering:**
```typescript
{showOAuthButtons && (
  <>
    {/* OAuth divider */}
    {googleOAuthEnabled && (
      <Button onClick={handleGoogleLogin}>
        Sign in with Google
      </Button>
    )}
  </>
)}
```

**Answer to Question 5:** 
- Button shows **ONLY** if `VITE_GOOGLE_OAUTH_ENABLED === 'true'` (strict string equality)
- If env var is unset, `undefined === 'true'` → `false` → button hidden
- If env var is `'false'`, `'false' === 'true'` → `false` → button hidden
- Only explicit string `'true'` enables the button

---

### 1.5 Frontend: API Call to `/auth/google/url`

**File:** `frontend/src/pages/Login.tsx` (lines 57-69)

**Handler Function:**
```typescript
const handleGoogleLogin = async () => {
  try {
    setError('');
    setLoading(true);
    const { url } = await authApi.getGoogleAuthUrl();  // Line 61
    window.location.href = url;  // Line 63
  } catch (err: any) {
    setError(err.response?.data?.error?.message || 'Failed to initiate Google login. Please try again.');
    setLoading(false);
  }
};
```

**File:** `frontend/src/api/auth.ts` (lines 21-24)
```typescript
getGoogleAuthUrl: async (): Promise<{ url: string }> => {
  const response = await apiClient.get<{ url: string }>('/auth/google/url');
  return response.data;
},
```

**File:** `frontend/src/lib/apiClient.ts` (line 5)
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
```

**Answer to Question 6:** 
- **Yes**, frontend properly calls `/auth/google/url` via:
  1. `handleGoogleLogin()` calls `authApi.getGoogleAuthUrl()`
  2. `authApi.getGoogleAuthUrl()` calls `apiClient.get('/auth/google/url')`
  3. `apiClient` uses base URL from `VITE_API_BASE_URL` or defaults to `http://localhost:3000`
  4. On success, redirects browser to returned URL
  5. On error, displays error message

---

## 2. DEPLOYMENT ENVIRONMENT VERIFICATION

### 2.1 Railway Environment Variables (Backend)

**Expected Variables:**
- `GOOGLE_CLIENT_ID` ✅ (required)
- `GOOGLE_CLIENT_SECRET` ✅ (required)
- `GOOGLE_REDIRECT_URL` ⚠️ (optional, has fallback)
- `BACKEND_URL` ✅ (required in production)
- `FRONTEND_URL` ✅ (required in production)

**Verification Needed:**
- [ ] Check Railway dashboard → Backend service → Variables
- [ ] Verify `GOOGLE_CLIENT_ID` is set and matches Google Cloud Console
- [ ] Verify `GOOGLE_CLIENT_SECRET` is set and matches Google Cloud Console
- [ ] Verify `BACKEND_URL` is set to `https://restockednew-production.up.railway.app`
- [ ] Verify `FRONTEND_URL` is set to your Vercel frontend URL
- [ ] Verify `GOOGLE_REDIRECT_URL` is either:
  - Set to `https://restockednew-production.up.railway.app/auth/google/callback`
  - OR unset (will use fallback)

**Potential Issues:**
1. **Missing `BACKEND_URL`:** 
   - Config throws error at startup (line 245 of `config.ts`)
   - Server won't start in production
   - **Exception:** Hardcoded fallback in CORS (line 70 of `server.ts`) but config still requires it

2. **Missing `FRONTEND_URL`:**
   - Config throws error at startup (line 241 of `config.ts`)
   - Server won't start in production

3. **Wrong `GOOGLE_REDIRECT_URL`:**
   - OAuth callback will fail
   - Google will reject the redirect URI

---

### 2.2 Vercel Environment Variables (Frontend)

**Expected Variables:**
- `VITE_GOOGLE_OAUTH_ENABLED` ✅ (must be exactly `"true"` string)
- `VITE_API_BASE_URL` ✅ (should be `https://restockednew-production.up.railway.app`)

**Verification Needed:**
- [ ] Check Vercel dashboard → Project → Settings → Environment Variables
- [ ] Verify `VITE_GOOGLE_OAUTH_ENABLED` is set to exactly `"true"` (string, not boolean)
- [ ] Verify `VITE_API_BASE_URL` is set to `https://restockednew-production.up.railway.app`
- [ ] Verify variables are set for **Production** environment (not just Preview)

**Potential Issues:**
1. **Missing `VITE_GOOGLE_OAUTH_ENABLED`:**
   - Button won't show (feature flag check fails)
   - OAuth flow never starts

2. **Wrong `VITE_API_BASE_URL`:**
   - Frontend calls wrong backend URL
   - CORS might reject if origin doesn't match

3. **Variable not set for Production:**
   - Preview deployments might work, production won't

---

### 2.3 What Happens When Backend is Missing `BACKEND_URL`?

**File:** `src/config.ts` (lines 128, 244-246)

**Config Loading:**
```typescript
const backendUrl = process.env.BACKEND_URL || (isDevelopment ? "http://localhost:3000" : "");
```

**Validation:**
```typescript
if (config.isProduction) {
  if (!config.backendUrl) {
    throw new Error("BACKEND_URL is required in production");
  }
}
```

**Answer:**
- **In Production:** Server **WILL NOT START** - throws error: `"BACKEND_URL is required in production"`
- **In Development:** Falls back to `"http://localhost:3000"`
- **Exception:** CORS middleware has hardcoded fallback (line 70 of `server.ts`), but config validation happens first, so server crashes before CORS is even initialized

**Impact on OAuth:**
- If `BACKEND_URL` is missing, server won't start → OAuth endpoints unavailable
- If `BACKEND_URL` is wrong, redirect URL will be wrong → Google rejects callback

---

### 2.4 Could CORS Still Block Even Though `!origin` Should Allow It?

**File:** `src/api/server.ts` (lines 104-172)

**CORS Middleware Order:**
1. CORS middleware is applied **BEFORE** routes (line 104)
2. Routes are registered after (line 180)

**CORS Logic:**
```typescript
origin: (origin, callback) => {
  // Allow undefined
  if (!origin) {
    return callback(null, true);
  }
  
  // Allow "null" string
  if (origin === "null" || origin === null) {
    return callback(null, true);
  }
  
  // ... other checks
}
```

**Answer:**
- **Theoretically:** No, CORS should NOT block if `!origin` or `origin === "null"`
- **However, possible issues:**
  1. **Browser sends unexpected format:** Some browsers might send `Origin: "undefined"` (string) instead of missing header
  2. **Express/CORS library bug:** Edge case in `cors` middleware library
  3. **Request fails BEFORE CORS:** Error in earlier middleware (e.g., body parser, request logging)
  4. **CORS callback not called:** Request fails before reaching CORS middleware
  5. **Multiple CORS middleware:** If another CORS middleware exists elsewhere (unlikely - we checked)

**Diagnostic Steps:**
- Check backend logs for CORS rejection messages
- Check if request reaches CORS middleware at all
- Verify browser DevTools Network tab shows actual Origin header value

---

## 3. IDENTIFYING THE TRUE CAUSE OF `/auth/google/url` ERR_CORS

### 3.1 Is the Backend Rejecting the Request?

**How to Check:**
1. **Check backend logs** for CORS rejection message:
   ```
   "CORS request rejected" (line 157 of server.ts)
   ```
2. **Check response status:** CORS rejection typically returns `500` with error message
3. **Check if route handler is reached:** Look for log: `"Error in GET /auth/google/url"` (line 161 of auth.ts)

**If backend is rejecting:**
- Logs will show: `"CORS request rejected"` with origin details
- Response will be: `500 Internal Server Error` with `"Not allowed by CORS"` message
- Route handler will NOT be reached (CORS middleware rejects first)

---

### 3.2 Is the Browser Blocking the Request Preflight?

**How to Check:**
1. **Open browser DevTools → Network tab**
2. **Look for OPTIONS request** (preflight)
3. **Check OPTIONS response:**
   - If `200 OK` → Preflight passed, actual request should proceed
   - If `CORS error` → Browser blocked preflight

**If browser is blocking:**
- Network tab shows red/failed OPTIONS request
- Console shows: `"Access to XMLHttpRequest has been blocked by CORS policy"`
- Request never reaches backend (browser blocks it client-side)

**Note:** `/auth/google/url` is a GET request, so browser might not send preflight (simple requests don't require preflight). However, if `apiClient` adds custom headers, preflight will be sent.

---

### 3.3 Is `/auth/google/url` Throwing Internally Before CORS?

**Possible Internal Errors:**

**1. Missing `BACKEND_URL` in production:**
- Server won't start → endpoint unavailable
- Error: `"BACKEND_URL is required in production"`

**2. `getGoogleAuthUrl()` throws:**
- If `isGoogleOAuthConfigured()` returns `true` but env vars are actually missing
- Error: `"Google OAuth is not configured. Missing required environment variables."`
- Returns `500 Internal Server Error` (line 166 of auth.ts)

**3. OAuth2 client creation fails:**
- If `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` are invalid format
- Error thrown by `google.auth.OAuth2()` constructor
- Returns `500 Internal Server Error`

**How to Check:**
- Look for error logs: `"Error in GET /auth/google/url"` (line 161)
- Check Sentry for captured exceptions (line 162-164)
- Response will be `500` with error details

---

### 3.4 Is the OAuth URL Failing to Build Because of Missing Env Vars?

**Check Flow:**
1. `isGoogleOAuthConfigured()` checks: `GOOGLE_CLIENT_ID` && `GOOGLE_CLIENT_SECRET`
2. If both present → returns `true`
3. `getGoogleAuthUrl()` checks again → throws if false
4. `getOAuth2Client()` reads env vars → creates OAuth2 client
5. If `BACKEND_URL` missing → redirect URL becomes `undefined/auth/google/callback` → invalid

**Potential Issues:**
- **Env vars set but empty strings:** `isGoogleOAuthConfigured()` returns `true` (empty string is truthy), but OAuth2 client creation fails
- **`BACKEND_URL` missing:** Redirect URL becomes invalid → Google rejects it
- **Env vars have typos:** `GOOGLE_CLIENT_ID` vs `GOOGLE_CLIENT_ID` (extra space)

**How to Check:**
- Use `/auth/google/config-status` endpoint (line 117 of auth.ts)
- Returns: `{ googleOAuthConfigured, clientIdPresent, clientSecretPresent, redirectUrl }`
- Verify all fields are correct

---

### 3.5 Is the CORS Callback Being Reached, or Is the Request Failing Before That?

**Request Flow Through Express:**
1. Request arrives → Express receives it
2. **CORS middleware** (line 104 of server.ts) → Checks origin
3. **Body parser** (line 176) → Parses JSON (if POST)
4. **Request logging** (line 177) → Logs request
5. **Route handler** (line 180) → `/auth/google/url` handler

**If CORS callback is NOT reached:**
- Request fails before line 104
- Possible causes:
  - Server not running
  - Network error
  - DNS resolution failure
  - SSL/TLS handshake failure

**If CORS callback IS reached but rejects:**
- Logs will show: `"CORS request rejected"` (line 157)
- Response: `500` with CORS error

**If CORS allows but route handler fails:**
- Logs will show: `"Error in GET /auth/google/url"` (line 161)
- Response: `500` with internal error (not CORS error)

---

## 4. MINIMAL FIX PLAN (To Be Determined After Test Results)

**Status:** ⏸️ **AWAITING TEST RESULTS**

**Required Test Results:**
1. Response from `GET /auth/google/url` (status code, body, headers)
2. Response from `GET /auth/google/config-status` (status code, body)
3. Browser DevTools Network tab (request headers, response headers, error message)
4. Backend logs (CORS decisions, route handler logs, errors)

**After receiving test results, determine:**
- Is it a CORS issue? → Fix CORS logic
- Is it a missing env var? → Fix env vars
- Is it an invalid redirect URL? → Fix redirect URL construction
- Is it a Google OAuth config issue? → Fix Google Cloud Console settings

**Fix Principles:**
- ✅ Smallest possible change
- ✅ No side effects on email/password login
- ✅ Preserve existing OAuth logic
- ✅ Add diagnostic logging if needed

---

## 5. REGRESSION CHECK: Did We Break Something Earlier?

### 5.1 OAuth Implementation History

**Key Files Modified:**
- `src/api/routes/auth.ts` - Added OAuth routes
- `src/api/utils/googleOAuth.ts` - Added Google OAuth utilities
- `src/api/server.ts` - Modified CORS to handle `origin === "null"`
- `frontend/src/pages/Login.tsx` - Added OAuth buttons
- `frontend/src/api/auth.ts` - Added OAuth API calls

### 5.2 Potential Regressions

**1. CORS Changes Breaking Email/Password Login**

**Check:** `src/api/server.ts` CORS logic (lines 106-164)

**Analysis:**
- CORS allows `!origin` → ✅ Safe (allows same-origin requests)
- CORS allows `origin === "null"` → ✅ Safe (doesn't affect normal requests)
- CORS allows exact matches → ✅ Safe (same as before)
- CORS allows `.vercel.app` and `.up.railway.app` → ✅ Safe (additive, doesn't remove existing logic)

**Verdict:** ✅ **No regression** - CORS changes are additive and safe

---

**2. Auth Routes Breaking Email/Password Login**

**Check:** `src/api/routes/auth.ts` - Email/password routes (lines 29-110)

**Analysis:**
- `/auth/register` (lines 29-64) → ✅ Unchanged logic
- `/auth/login` (lines 72-110) → ✅ Unchanged logic
- OAuth routes added separately → ✅ No interference

**Verdict:** ✅ **No regression** - OAuth routes are separate, email/password routes untouched

---

**3. Frontend Login Page Breaking Email/Password Form**

**Check:** `frontend/src/pages/Login.tsx` - Email/password form (lines 96-125)

**Analysis:**
- Email/password form always rendered (not conditional) → ✅ Safe
- OAuth buttons only render if feature flag enabled → ✅ Safe
- Form submission handler unchanged → ✅ Safe

**Verdict:** ✅ **No regression** - OAuth buttons are additive, form logic unchanged

---

**4. API Client Breaking Email/Password Requests**

**Check:** `frontend/src/lib/apiClient.ts` - Base URL and interceptors

**Analysis:**
- Base URL logic unchanged → ✅ Safe
- Request interceptor unchanged → ✅ Safe
- Response interceptor unchanged → ✅ Safe

**Verdict:** ✅ **No regression** - API client changes are minimal

---

### 5.3 Conclusion on Regressions

**✅ No regressions detected** in:
- Email/password login flow
- Email/password registration flow
- Frontend form functionality
- API client behavior
- CORS for normal requests

**OAuth implementation is additive** - it doesn't modify existing auth logic.

---

## 6. NEXT STEPS

### 6.1 Required Test Results

**Please provide the following:**

1. **Direct Browser Test:**
   ```
   Open: https://restockednew-production.up.railway.app/auth/google/url
   ```
   - Screenshot of response (or copy response body)
   - Browser DevTools → Network tab → Request details
   - Console errors (if any)

2. **Config Status Endpoint:**
   ```
   Open: https://restockednew-production.up.railway.app/auth/google/config-status
   ```
   - Response body (JSON)
   - Status code

3. **Backend Logs:**
   - Any CORS-related logs
   - Any route handler logs
   - Any error messages

4. **Environment Variables:**
   - Railway: List all env vars (names only, not values)
   - Vercel: List all `VITE_*` env vars (names only, not values)

### 6.2 After Receiving Test Results

**I will:**
1. Analyze the actual error response
2. Determine if it's CORS, env vars, or something else
3. Provide **one minimal fix** with:
   - Exact code change
   - Where to apply it
   - Why it solves the issue
   - How to verify it works
   - Confirmation of no side effects

---

## 7. SUMMARY

### Current Understanding

**Backend OAuth Flow:**
- ✅ Route handler exists at `/auth/google/url`
- ✅ Checks configuration before processing
- ✅ Constructs OAuth URL using Google OAuth2 client
- ✅ Returns JSON with URL

**CORS Configuration:**
- ✅ Explicitly allows `origin === "null"` (string)
- ✅ Explicitly allows `!origin` (undefined)
- ✅ Should NOT block direct browser access

**Frontend OAuth Flow:**
- ✅ Button shows only if `VITE_GOOGLE_OAUTH_ENABLED === 'true'`
- ✅ Calls `/auth/google/url` via `apiClient`
- ✅ Redirects browser to returned URL

**Environment Variables:**
- ✅ Backend requires: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BACKEND_URL`, `FRONTEND_URL`
- ✅ Frontend requires: `VITE_GOOGLE_OAUTH_ENABLED`, `VITE_API_BASE_URL`

**No Regressions Detected:**
- ✅ Email/password login unaffected
- ✅ OAuth implementation is additive

### Unknowns (Require Test Results)

1. **Actual error response** from `/auth/google/url`
2. **CORS decision** (allowed or rejected?)
3. **Environment variable values** (are they set correctly?)
4. **Browser behavior** (what Origin header is sent?)

---

**Status:** 🔍 **AWAITING TEST RESULTS TO DETERMINE EXACT FIX**

**Next Action:** Please provide test results from sections 6.1, then I will provide the minimal fix plan.

