# Google OAuth Complete Validation & Deployment Guide

**Date:** 2025-12-04  
**Status:** ✅ Code validated, ready for deployment  
**No Code Changes:** Validation and documentation only

---

## A) Backend Validation

### A.1 Environment Variable Usage Verification

**File:** `src/api/utils/googleOAuth.ts`

#### Variable: `GOOGLE_CLIENT_ID`

**References:**
- **Line 12:** `process.env.GOOGLE_CLIENT_ID` - Used in OAuth2 client initialization
- **Line 23:** `process.env.GOOGLE_CLIENT_ID` - Checked in `isGoogleOAuthConfigured()`

**Code Context:**
```typescript
// Line 9-16: getOAuth2Client()
function getOAuth2Client() {
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL || process.env.GOOGLE_REDIRECT_URI || `${config.backendUrl}/auth/google/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,        // ← Line 12: Used here
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl
  );
}

// Line 21-25: isGoogleOAuthConfigured()
export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&       // ← Line 23: Checked here
    process.env.GOOGLE_CLIENT_SECRET
  );
}
```

**Verification:** ✅ **CORRECT**
- Variable name: `GOOGLE_CLIENT_ID` (exact match)
- Used in OAuth2 client initialization
- Checked in configuration validation

---

#### Variable: `GOOGLE_CLIENT_SECRET`

**References:**
- **Line 13:** `process.env.GOOGLE_CLIENT_SECRET` - Used in OAuth2 client initialization
- **Line 24:** `process.env.GOOGLE_CLIENT_SECRET` - Checked in `isGoogleOAuthConfigured()`

**Code Context:**
```typescript
// Line 9-16: getOAuth2Client()
return new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,     // ← Line 13: Used here
  redirectUrl
);

// Line 21-25: isGoogleOAuthConfigured()
return !!(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET     // ← Line 24: Checked here
);
```

**Verification:** ✅ **CORRECT**
- Variable name: `GOOGLE_CLIENT_SECRET` (exact match)
- Used in OAuth2 client initialization
- Checked in configuration validation

---

#### Variable: `GOOGLE_REDIRECT_URL`

**References:**
- **Line 10:** `process.env.GOOGLE_REDIRECT_URL` - Used in redirect URL construction

**Code Context:**
```typescript
// Line 9-16: getOAuth2Client()
function getOAuth2Client() {
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL  // ← Line 10: Used here
    || process.env.GOOGLE_REDIRECT_URI 
    || `${config.backendUrl}/auth/google/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl
  );
}
```

**Verification:** ✅ **CORRECT**
- Variable name: `GOOGLE_REDIRECT_URL` (exact match)
- Optional (has fallback to `${config.backendUrl}/auth/google/callback`)
- Also supports alias: `GOOGLE_REDIRECT_URI`

---

### A.2 Route Implementation Verification

**File:** `src/api/routes/auth.ts`

#### Route: `GET /auth/google/url`

**Line 117-139:**
- ✅ Checks `isGoogleOAuthConfigured()` before processing (line 119)
- ✅ Returns 400 with clear error if not configured (line 121-126)
- ✅ Calls `getGoogleAuthUrl()` which uses all 3 env vars (line 129)
- ✅ Returns `{ url: string }` on success (line 130)
- ✅ Uses Pino logging (line 120, 132)
- ✅ Uses Sentry error capture (line 133-135)

**Verification:** ✅ **CORRECT**

#### Route: `GET /auth/google/callback`

**Line 147-189:**
- ✅ Checks `isGoogleOAuthConfigured()` first (line 150)
- ✅ Extracts `code` from query params (line 156)
- ✅ Calls `handleGoogleCallback(code)` which uses env vars (line 165)
- ✅ Calls `authService.oauthLogin()` (line 168)
- ✅ Redirects to frontend with token on success (line 177)
- ✅ Redirects to frontend with error on failure (line 186)
- ✅ Uses Pino logging (line 151, 159, 170-174, 180)
- ✅ Uses Sentry error capture (line 181-183)

**Verification:** ✅ **CORRECT**

---

### A.3 Service Implementation Verification

**File:** `src/services/authService.ts`

#### Method: `oauthLogin()`

**Line 115-161:**
- ✅ Accepts: `email`, `provider: 'google'`, `providerId`
- ✅ Finds user by OAuth provider + provider ID (line 121)
- ✅ Falls back to email lookup (line 125)
- ✅ Creates new user if not found with `password_hash: null` (line 130-135)
- ✅ Generates JWT token using `signToken()` (line 152)
- ✅ Returns `{ user, token }` (same format as email/password)

**Verification:** ✅ **CORRECT**
- Does NOT require password_hash (OAuth users have `password_hash: null`)
- Uses same JWT format as email/password login
- Returns same response shape as email/password login

---

### A.4 Summary: Backend Environment Variables

**Required Variables:**
1. ✅ `GOOGLE_CLIENT_ID` - Read in `googleOAuth.ts` lines 12, 23
2. ✅ `GOOGLE_CLIENT_SECRET` - Read in `googleOAuth.ts` lines 13, 24
3. ✅ `GOOGLE_REDIRECT_URL` - Read in `googleOAuth.ts` line 10 (optional, has fallback)

**No Additional Variables:** ✅ Verified - only these 3 are used

**No Mismatched Names:** ✅ Verified - all variable names match exactly

---

## B) Frontend Validation

### B.1 Feature Flag Implementation

**File:** `frontend/src/pages/Login.tsx`

**Line 20:** Feature flag check
```typescript
const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true';
```

**Verification:**
- ✅ Uses strict equality (`===`) - only string `'true'` enables button
- ✅ Checks against string `'true'` (not boolean `true`)
- ✅ Default behavior: if env var is unset, `undefined === 'true'` is `false` → button hidden
- ✅ If env var is `'false'`, `'false' === 'true'` is `false` → button hidden
- ✅ Only explicit `'true'` string enables button

---

### B.2 Button Rendering Logic

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
- ✅ Button only rendered if `showOAuthButtons === true`
- ✅ `showOAuthButtons` is `true` only if `googleOAuthEnabled === true`
- ✅ `googleOAuthEnabled` is `true` only if `VITE_GOOGLE_OAUTH_ENABLED === 'true'`
- ✅ Nested condition ensures Google button only appears when flag is `'true'`

---

### B.3 Additional Conditions Check

**Searched for:** Any other conditions that might affect button visibility

**Result:** ✅ **NO OTHER CONDITIONS**
- No other feature flags checked
- No other environment variables checked
- No other conditions in button rendering logic
- Button visibility depends solely on `VITE_GOOGLE_OAUTH_ENABLED === 'true'`

---

### B.4 Summary: Frontend Feature Flag

**Variable:** `VITE_GOOGLE_OAUTH_ENABLED`

**Behavior:**
- ✅ Must be exactly string `'true'` to show button
- ✅ Any other value (including `'false'`, `true`, `false`, unset) hides button
- ✅ No other flags or conditions influence button visibility

---

## C) Google Cloud Setup

### C.1 Exact Redirect URI

**Required Redirect URI:**
```
https://restockednew-production.up.railway.app/auth/google/callback
```

**Critical Requirements:**
- ✅ Protocol: `https://` (required, not `http://`)
- ✅ Domain: `restockednew-production.up.railway.app` (exact match)
- ✅ Path: `/auth/google/callback` (exact match, no trailing slash)
- ✅ No query parameters
- ✅ No fragments

---

### C.2 Step-by-Step Google Cloud Console Setup

#### Step 1: Navigate to Credentials

1. Go to: https://console.cloud.google.com/
2. Sign in with your Google account
3. Select your project (or create a new one)
4. Navigate to: **APIs & Services** → **Credentials**
   - Left sidebar: **APIs & Services** → **Credentials**

#### Step 2: Configure OAuth Consent Screen (If Not Done)

1. In **Credentials** page, click **OAuth consent screen** tab (if prompted)
2. Select **External** user type
3. Fill in required fields:
   - **App name:** `Restocked` (or your app name)
   - **User support email:** Your email address
   - **Developer contact information:** Your email address
4. Click **Save and Continue**
5. **Scopes:** Click **Add or Remove Scopes**
   - Add: `.../auth/userinfo.email`
   - Add: `.../auth/userinfo.profile`
   - Click **Update** then **Save and Continue**
6. **Test users:** Skip for now
7. Click **Back to Dashboard**

#### Step 3: Create OAuth 2.0 Client ID

1. In **Credentials** page, click **+ CREATE CREDENTIALS** button (top of page)
2. Select **OAuth client ID** from dropdown
3. **Application type:** Select **Web application**
4. **Name:** Enter `Restocked Web Client` (or any name)
5. **Authorized JavaScript origins:** Leave empty (not required)
6. **Authorized redirect URIs:** Click **+ ADD URI** button
7. **Paste this EXACT URL:**
   ```
   https://restockednew-production.up.railway.app/auth/google/callback
   ```
8. Click **CREATE** button
9. **Copy the credentials:**
   - **Your Client ID:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Your Client Secret:** `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **Save these immediately** - you can't view the secret again!

---

### C.3 Redirect URI Matching Rules

**Must Match Exactly:**

| Component | Required Value | Notes |
|-----------|---------------|-------|
| Protocol | `https://` | Must be HTTPS, not HTTP |
| Domain | `restockednew-production.up.railway.app` | Exact match required |
| Path | `/auth/google/callback` | No trailing slash |
| Query | None | No query parameters |
| Fragment | None | No fragments |

**Common Mismatches (Will Cause `redirect_uri_mismatch` Error):**

❌ `http://restockednew-production.up.railway.app/auth/google/callback`  
→ Missing 's' in https

❌ `https://restockednew-production.up.railway.app/auth/google/callback/`  
→ Trailing slash

❌ `https://restockednew-production.up.railway.app/google/callback`  
→ Missing `/auth` in path

❌ `https://restockednew-production.up.railway.app/auth/google/callback?param=value`  
→ Query parameters not allowed

---

## D) Railway Variables

### D.1 Exact Location

**Path:** Railway Dashboard → Your Project → Backend Service → Variables Tab

**Step-by-Step Navigation:**
1. Go to: https://railway.app/
2. Sign in
3. Select your project from the dashboard
4. Click on your **Backend service** (not the database service)
5. Click **Variables** tab (top navigation bar, next to "Deployments", "Metrics", etc.)

---

### D.2 Variables to Add

Add these **3 variables** one at a time:

#### Variable 1: GOOGLE_CLIENT_ID

**Steps:**
1. Click **+ New Variable** button (top right of Variables tab)
2. **Key:** `GOOGLE_CLIENT_ID`
3. **Value:** `<paste your Client ID from Google Cloud Console>`
   - Format: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
4. Click **Add** button

#### Variable 2: GOOGLE_CLIENT_SECRET

**Steps:**
1. Click **+ New Variable** button
2. **Key:** `GOOGLE_CLIENT_SECRET`
3. **Value:** `<paste your Client Secret from Google Cloud Console>`
   - Format: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. Click **Add** button

#### Variable 3: GOOGLE_REDIRECT_URL

**Steps:**
1. Click **+ New Variable** button
2. **Key:** `GOOGLE_REDIRECT_URL`
3. **Value:** `https://restockednew-production.up.railway.app/auth/google/callback`
   - ⚠️ Copy this EXACT value (no trailing slash)
4. Click **Add** button

---

### D.3 Verification After Adding Variables

**Check Deployment:**
1. Go to **Deployments** tab (next to Variables tab)
2. New deployment should start automatically
3. Wait for deployment to complete (status = "Deployed")
4. Check deployment logs for any errors

**Expected:**
- ✅ All 3 variables visible in Variables tab
- ✅ Deployment completes successfully
- ✅ No errors in deployment logs

**Test Configuration:**
```bash
curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
  -H "Origin: https://app.restocked.now"
```

**Expected Response (200):**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**If 400 Error:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Google OAuth is not configured"
  }
}
```
→ Check Railway env vars are set and deployment completed

---

## E) Vercel Variables

### E.1 Exact Location

**Path:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Step-by-Step Navigation:**
1. Go to: https://vercel.com/
2. Sign in
3. Select your project from the dashboard
4. Click **Settings** (left sidebar, under project name)
5. Click **Environment Variables** (under Settings, in the left submenu)

---

### E.2 Variable to Add

#### Variable: VITE_GOOGLE_OAUTH_ENABLED

**Steps:**
1. Click **Add New** button (top right)
2. **Key:** `VITE_GOOGLE_OAUTH_ENABLED`
3. **Value:** `true`
   - ⚠️ Must be the string `"true"` (not boolean `true`)
   - ⚠️ Must be lowercase `true` (not `True` or `TRUE`)
4. **Environments:** Check all three:
   - ☑ Production
   - ☑ Preview
   - ☑ Development
5. Click **Save** button

---

### E.3 Verification After Adding Variable

**Check Deployment:**
1. Go to **Deployments** tab (top navigation)
2. New deployment should start automatically
3. Wait for deployment to complete (status = "Ready")
4. Check deployment logs for any errors

**Expected:**
- ✅ Variable visible in Environment Variables tab
- ✅ Value is `true` (string)
- ✅ Applied to Production environment
- ✅ Deployment completes successfully

**Test Frontend:**
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

## F) End-to-End Test Plan

### F.1 Pre-Flight Check: Backend Configuration

**Purpose:** Verify OAuth is configured correctly BEFORE using the UI button

**Endpoint:** `GET /auth/google/url`

**Command:**
```bash
curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
  -H "Origin: https://app.restocked.now"
```

**Expected Success (200 OK):**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=https%3A%2F%2Frestockednew-production.up.railway.app%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&access_type=offline&prompt=consent"
}
```

**Expected Failure (400 Bad Request) - Not Configured:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Google OAuth is not configured"
  }
}
```

**If 400:** 
- Check Railway env vars are set
- Verify Railway deployment completed
- Check Railway logs for errors

**If 200:** ✅ Backend is configured correctly, proceed to frontend test

---

### F.2 Test 1: Email/Password Login (Critical - Must Still Work)

**Purpose:** Verify OAuth changes did NOT break existing email/password login

**Steps:**
1. Visit: `https://app.restocked.now/login`
2. Enter email address in email field
3. Enter password in password field
4. Click "Sign in" button
5. Observe redirect

**Expected Success:**
- ✅ Form submits successfully
- ✅ Browser redirects to `/dashboard`
- ✅ User is logged in
- ✅ User can access protected routes
- ✅ No errors in browser console
- ✅ No errors in Railway logs

**Expected Failure States:**
- ❌ Form doesn't submit → Check browser console for errors
- ❌ Returns 401 error → Check backend logs, verify email/password correct
- ❌ Returns 500 error → Check Railway logs for server errors
- ❌ Redirects to wrong page → Check frontend routing

**If Fails:** ⚠️ **STOP** - OAuth changes broke email/password → Rollback immediately

---

### F.3 Test 2: Frontend Button Visibility

**Purpose:** Verify Google button appears only when feature flag is enabled

**Steps:**
1. Visit: `https://app.restocked.now/login`
2. Inspect the page visually
3. Look for "Sign in with Google" button

**Expected Success:**
- ✅ Button appears below email/password form
- ✅ Button has Google logo/icon
- ✅ Button text: "Sign in with Google"
- ✅ Button is clickable (not disabled)
- ✅ Divider text "Or continue with" appears above button

**Expected Failure States:**
- ❌ Button doesn't appear → Check `VITE_GOOGLE_OAUTH_ENABLED` is `"true"` (string)
- ❌ Button appears but disabled → Check browser console for errors
- ❌ Button appears but wrong styling → Check frontend deployment

**If Button Doesn't Appear:**
1. Check Vercel env var: `VITE_GOOGLE_OAUTH_ENABLED` = `"true"` (string)
2. Verify Vercel deployment completed
3. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
4. Check browser console (F12) for errors
5. Verify you're on Production environment (not Preview)

---

### F.4 Test 3: OAuth Flow Initiation

**Purpose:** Verify clicking button initiates OAuth flow correctly

**Steps:**
1. Click "Sign in with Google" button
2. Observe browser redirect
3. Check URL in address bar

**Expected Success:**
- ✅ Browser redirects to Google OAuth consent screen
- ✅ URL: `https://accounts.google.com/o/oauth2/v2/auth?...`
- ✅ URL contains `client_id` parameter (your Client ID)
- ✅ URL contains `redirect_uri` parameter (URL-encoded callback URL)
- ✅ URL contains `scope` parameter (email, profile)
- ✅ Google consent screen loads

**Check redirect_uri Parameter:**
- Should contain: `redirect_uri=https%3A%2F%2Frestockednew-production.up.railway.app%2Fauth%2Fgoogle%2Fcallback`
- This is the URL-encoded version of: `https://restockednew-production.up.railway.app/auth/google/callback`

**Expected Failure States:**
- ❌ Button click does nothing → Check browser console for errors
- ❌ Redirects to error page → Check Railway logs for: `"Google OAuth not configured"`
- ❌ Shows "redirect_uri_mismatch" error → Check Google Cloud Console redirect URI matches exactly
- ❌ Shows "invalid_client" error → Check Client ID/Secret are correct

**If Redirect Fails:**
1. Check Railway logs for: `"Google OAuth not configured"`
2. Verify all 3 env vars are set in Railway
3. Verify Railway deployment completed
4. Test backend endpoint: `curl https://restockednew-production.up.railway.app/auth/google/url`

---

### F.5 Test 4: OAuth Callback

**Purpose:** Verify Google redirects back to your backend correctly

**Steps:**
1. On Google OAuth consent screen, select your Google account
2. Click "Allow" or "Continue" to grant permissions
3. Observe browser redirect after Google approval

**Expected Success:**
- ✅ Browser redirects to: `https://app.restocked.now/auth/callback?token=...`
- ✅ Token is present in URL query parameter (long JWT string)
- ✅ No error messages in URL
- ✅ Page shows "Completing sign in..." briefly

**Expected Failure States:**
- ❌ Redirects to `/login?error=...` → Check error message, check Railway logs
- ❌ Shows "redirect_uri_mismatch" → Fix redirect URI in Google Cloud Console
- ❌ Shows "invalid_grant" → Authorization code expired (try again)
- ❌ No token in URL → Check Railway logs for callback errors

**If Callback Fails:**
1. Check Google Cloud Console → Authorized redirect URIs
   - Must match exactly: `https://restockednew-production.up.railway.app/auth/google/callback`
2. Check Railway logs for callback errors
3. Verify `GOOGLE_REDIRECT_URL` matches exactly in Railway

---

### F.6 Test 5: Token Validation and Login

**Purpose:** Verify token is valid and user is logged in

**Steps:**
1. After redirect to `/auth/callback?token=...`
2. Check browser console (F12 → Console tab)
3. Observe page behavior
4. Check final redirect

**Expected Success:**
- ✅ No console errors
- ✅ Page shows "Completing sign in..." loading state
- ✅ Then redirects to `/dashboard`
- ✅ User is logged in (can access protected routes)
- ✅ User email matches Google account email

**Verify Token via API:**
```bash
# Extract token from callback URL, then:
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://restockednew-production.up.railway.app/me
```

**Expected Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "plan": "free",
    "oauth_provider": "google",
    "oauth_provider_id": "123456789",
    "created_at": "2025-12-04T...",
    "updated_at": "2025-12-04T..."
  }
}
```

**Expected Failure States:**
- ❌ Console shows "Failed to verify authentication token" → Check token format, check JWT_SECRET
- ❌ Redirects to `/login` → Check Railway logs for token verification errors
- ❌ User not logged in → Check authStore, check token persistence

**If Token Invalid:**
1. Check Railway logs for: `"Failed to verify authentication token"`
2. Verify `JWT_SECRET` is set in Railway
3. Check token format in URL (should be long JWT string)

---

### F.7 Test 6: User Auto-Provisioning

**Purpose:** Verify new OAuth user is created correctly in database

**Steps:**
1. After successful OAuth login (first time with this Google account)
2. Verify user account exists
3. Check user properties

**Expected Success:**
- ✅ User can access dashboard
- ✅ User email matches Google account email
- ✅ User can access protected routes (`/dashboard`, `/me/tracked-items`, etc.)
- ✅ User has `oauth_provider: 'google'` in database
- ✅ User has `oauth_provider_id: <Google user ID>` in database
- ✅ User has `password_hash: null` in database (OAuth users don't have passwords)

**Verify User Properties:**
```bash
# Use token from previous test
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://restockednew-production.up.railway.app/me
```

**Expected User Object:**
- `oauth_provider`: `"google"`
- `oauth_provider_id`: `"123456789"` (Google user ID)
- `email`: Matches Google account email
- `plan`: `"free"` (default)

**Expected Failure States:**
- ❌ User not created → Check Railway logs for creation errors
- ❌ User created but can't access routes → Check JWT token, check requireAuth middleware
- ❌ User has wrong email → Check Google OAuth callback, check email extraction

**If User Not Created:**
1. Check Railway logs for: `"Google OAuth login successful"`
2. Verify database connection
3. Check for database errors in Railway logs

---

### F.8 Test 7: Logging Verification

**Purpose:** Verify structured logs and error monitoring

#### Railway Logs

**Location:** Railway Dashboard → Backend Service → Deployments → Latest → View Logs

**Expected Success Logs:**
```
[INFO] Generated Google OAuth URL { authUrl: "https://accounts.google.com/..." }
[INFO] Google OAuth callback successful { email: "user@example.com", providerId: "123456789" }
[INFO] Google OAuth login successful { email: "user@example.com", userId: "uuid-here", provider: "google" }
```

**Expected Error Logs (if misconfigured):**
```
[WARN] Google OAuth not configured { path: "/auth/google/url" }
[ERROR] Error in GET /auth/google/url { error: "...", path: "/auth/google/url" }
```

**Verification:**
- ✅ Success logs include email, userId, provider
- ✅ Logs use Pino structured format (JSON objects)
- ✅ No stack traces in production logs
- ✅ Errors logged with proper context

#### Sentry Monitoring

**Location:** Sentry Dashboard → Issues

**Expected:**
- ✅ No new OAuth-related errors (if OAuth works correctly)
- ✅ If errors occur, they have tags:
  - `oauth_provider: "google"`
  - `endpoint: "/auth/google/url"` or `"/auth/google/callback"`

**Verification:**
- ✅ Errors captured with proper tags
- ✅ No sensitive data in error messages
- ✅ Error context includes endpoint and provider

---

### F.9 Test Summary Checklist

After completing all tests, verify:

- [ ] Email/password login still works
- [ ] Google button appears when `VITE_GOOGLE_OAUTH_ENABLED=true`
- [ ] Clicking button redirects to Google OAuth
- [ ] After Google approval, callback returns token
- [ ] User is logged in and redirected to dashboard
- [ ] New OAuth user is created in database
- [ ] User has correct `oauth_provider` and `oauth_provider_id`
- [ ] Railway logs show: "Google OAuth login successful"
- [ ] No errors in browser console
- [ ] No errors in Railway logs
- [ ] No errors in Sentry

---

## G) Rollback Steps

### G.1 Rollback Frontend (Disable OAuth Button)

**Purpose:** Hide OAuth button without affecting backend

**Steps:**
1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find: `VITE_GOOGLE_OAUTH_ENABLED`
3. **Option A:** Change value to `false`
   - Click on the variable
   - Change value from `true` to `false`
   - Click **Save**
4. **Option B:** Delete the variable
   - Click on the variable
   - Click **Delete** button
   - Confirm deletion
5. Wait for Vercel to redeploy (check Deployments tab)

**Result:**
- ✅ OAuth button disappears from login page
- ✅ Email/password login continues to work
- ✅ Backend OAuth routes still exist but won't be called
- ✅ No breaking changes

**Verification:**
1. Visit: `https://app.restocked.now/login`
2. Verify Google button does NOT appear
3. Test email/password login - should work normally

---

### G.2 Rollback Backend (Disable OAuth Routes)

**Purpose:** Disable OAuth backend without affecting frontend

**Steps:**
1. Go to: Railway Dashboard → Your Project → Backend Service → Variables
2. Delete these 3 variables (one at a time):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URL`
3. For each variable:
   - Click on the variable
   - Click **Delete** button (or trash icon)
   - Confirm deletion
4. Wait for Railway to redeploy (check Deployments tab)

**Result:**
- ✅ OAuth routes return 400 errors (graceful degradation)
- ✅ Email/password login continues to work
- ✅ No crashes or unhandled errors
- ✅ Frontend button may still appear but will return errors

**Verification:**
1. Test backend endpoint:
   ```bash
   curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
     -H "Origin: https://app.restocked.now"
   ```
2. Should return 400 with: `"Google OAuth is not configured"`
3. Test email/password login - should work normally

---

### G.3 Full Rollback (Disable Everything)

**Purpose:** Completely disable OAuth, restore pure email/password login

**Steps:**
1. **Vercel:** Remove or set `VITE_GOOGLE_OAUTH_ENABLED=false` (see G.1)
2. **Railway:** Remove all 3 Google OAuth env vars (see G.2)
3. Wait for both deployments to complete

**Result:**
- ✅ OAuth completely disabled
- ✅ Email/password login unaffected
- ✅ System behaves exactly as before OAuth was added
- ✅ No code changes required

**Verification:**
1. Visit: `https://app.restocked.now/login`
2. Verify Google button does NOT appear
3. Test email/password login - should work normally
4. Test backend endpoint - should return 400
5. Check Railway logs - no OAuth-related errors

---

### G.4 Rollback Verification Checklist

After rollback, verify:

- [ ] Frontend: Google button does NOT appear
- [ ] Frontend: Email/password login works
- [ ] Backend: `/auth/google/url` returns 400 error
- [ ] Backend: Email/password routes work normally
- [ ] Railway logs: No OAuth-related errors
- [ ] No breaking changes to existing functionality

---

## Summary

**Backend Validation:** ✅ All 3 env vars read correctly  
**Frontend Validation:** ✅ Feature flag works correctly  
**Google Cloud Setup:** ✅ Redirect URI documented  
**Railway Variables:** ✅ Exact location and values documented  
**Vercel Variables:** ✅ Exact location and value documented  
**Test Plan:** ✅ Comprehensive end-to-end tests  
**Rollback Plan:** ✅ Safe rollback procedures documented  

**Status:** ✅ **Ready for deployment**

**No Code Changes:** ✅ Validation and documentation only

---

**Next Step:** Follow the deployment checklist in sections C, D, and E above to enable Google OAuth.


