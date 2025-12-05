# Railway Environment Variable Setup Guide

**Date:** 2025-12-04  
**Purpose:** Ensure all required environment variables are set in Railway for OAuth to work correctly

---

## Required Environment Variables

### Critical Variables (Must Be Set)

#### 1. `BACKEND_URL`
**Value:** `https://restockednew-production.up.railway.app`  
**Purpose:** Used for OAuth redirect URL fallback and CORS configuration  
**Location:** Railway Dashboard → Your Project → Backend Service → Variables

**Why it's needed:**
- If not set, `config.backendUrl` will be empty string in production
- The code now has a fallback, but setting this explicitly is recommended
- Used in `src/config.ts:128` and `src/api/utils/googleOAuth.ts:10`

**How to set:**
1. Go to Railway Dashboard: https://railway.app/
2. Select your project
3. Click on your **Backend service** (not database)
4. Click **Variables** tab
5. Click **+ New Variable**
6. **Key:** `BACKEND_URL`
7. **Value:** `https://restockednew-production.up.railway.app`
8. Click **Add**

---

#### 2. `FRONTEND_URL`
**Value:** `https://app.restocked.now` (or your Vercel frontend URL)  
**Purpose:** Used for redirecting users after OAuth callback  
**Location:** Railway Dashboard → Your Project → Backend Service → Variables

**Why it's needed:**
- Used in `src/api/routes/auth.ts:152,177` to redirect users after OAuth
- If not set, OAuth callbacks will redirect to wrong URL

**How to set:**
1. Same location as above (Variables tab)
2. Click **+ New Variable**
3. **Key:** `FRONTEND_URL`
4. **Value:** `https://app.restocked.now` (or your actual Vercel URL)
5. Click **Add**

---

#### 3. `GOOGLE_CLIENT_ID`
**Value:** Your Google OAuth Client ID (from Google Cloud Console)  
**Purpose:** Google OAuth authentication  
**Location:** Railway Dashboard → Your Project → Backend Service → Variables

**Format:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`

**How to set:**
1. Same location as above (Variables tab)
2. Click **+ New Variable**
3. **Key:** `GOOGLE_CLIENT_ID`
4. **Value:** Paste your Client ID from Google Cloud Console
5. Click **Add**

---

#### 4. `GOOGLE_CLIENT_SECRET`
**Value:** Your Google OAuth Client Secret (from Google Cloud Console)  
**Purpose:** Google OAuth authentication  
**Location:** Railway Dashboard → Your Project → Backend Service → Variables

**Format:** `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**How to set:**
1. Same location as above (Variables tab)
2. Click **+ New Variable**
3. **Key:** `GOOGLE_CLIENT_SECRET`
4. **Value:** Paste your Client Secret from Google Cloud Console
5. Click **Add**

---

### Optional Variables (Recommended)

#### 5. `GOOGLE_REDIRECT_URL`
**Value:** `https://restockednew-production.up.railway.app/auth/google/callback`  
**Purpose:** Explicitly set the OAuth callback URL (has fallback if not set)  
**Location:** Railway Dashboard → Your Project → Backend Service → Variables

**Why it's optional:**
- Code falls back to `${BACKEND_URL}/auth/google/callback` if not set
- But setting it explicitly ensures it matches Google Cloud Console exactly

**How to set:**
1. Same location as above (Variables tab)
2. Click **+ New Variable**
3. **Key:** `GOOGLE_REDIRECT_URL`
4. **Value:** `https://restockednew-production.up.railway.app/auth/google/callback`
5. Click **Add**

---

## Quick Setup Checklist

- [ ] `BACKEND_URL` = `https://restockednew-production.up.railway.app`
- [ ] `FRONTEND_URL` = `https://app.restocked.now` (or your Vercel URL)
- [ ] `GOOGLE_CLIENT_ID` = (from Google Cloud Console)
- [ ] `GOOGLE_CLIENT_SECRET` = (from Google Cloud Console)
- [ ] `GOOGLE_REDIRECT_URL` = `https://restockednew-production.up.railway.app/auth/google/callback` (optional)

---

## Verification Steps

After setting all variables:

1. **Check Railway Deployment:**
   - Go to Railway Dashboard → Your Project → Backend Service → Deployments
   - Verify latest deployment completed successfully
   - Check logs for any errors

2. **Test OAuth URL Endpoint:**
   ```bash
   curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
     -H "Origin: https://app.restocked.now"
   ```
   
   **Expected Response (200 OK):**
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
   → Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

   **If CORS Error:**
   → Check `BACKEND_URL` is set correctly

3. **Check Railway Logs:**
   - Go to Railway Dashboard → Your Project → Backend Service → Deployments → Latest → View Logs
   - Look for: `"CORS configuration initialized"`
   - Look for: `"BACKEND_URL not set, using hardcoded Railway URL for CORS"` (warning if BACKEND_URL missing)

---

## Troubleshooting

### CORS Error Still Appearing

**If you still see CORS errors after setting variables:**

1. **Verify variables are set:**
   - Railway Dashboard → Variables tab
   - Check all variables are present and have correct values

2. **Verify deployment:**
   - Railway Dashboard → Deployments tab
   - Check latest deployment completed after setting variables
   - Railway auto-redeploys when variables change

3. **Check logs:**
   - Look for CORS-related log messages
   - Check if `BACKEND_URL` warning appears (means it's not set)

4. **Test with curl:**
   ```bash
   # Test without Origin header (should work)
   curl -X GET "https://restockednew-production.up.railway.app/auth/google/url"
   
   # Test with Origin header (should work)
   curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
     -H "Origin: https://app.restocked.now"
   ```

### OAuth Not Configured Error

**If you see "Google OAuth is not configured":**

1. Check `GOOGLE_CLIENT_ID` is set
2. Check `GOOGLE_CLIENT_SECRET` is set
3. Verify values are correct (no extra spaces, correct format)
4. Redeploy after setting variables

### Redirect URL Mismatch

**If Google shows "redirect_uri_mismatch" error:**

1. Check `GOOGLE_REDIRECT_URL` in Railway matches Google Cloud Console exactly
2. Must be exactly: `https://restockednew-production.up.railway.app/auth/google/callback`
3. No trailing slash, no query parameters
4. Update Google Cloud Console if needed

---

## Code References

- `BACKEND_URL` → `src/config.ts:128`
- `FRONTEND_URL` → `src/config.ts:127`, `src/api/routes/auth.ts:152,177`
- `GOOGLE_CLIENT_ID` → `src/api/utils/googleOAuth.ts:12,23`
- `GOOGLE_CLIENT_SECRET` → `src/api/utils/googleOAuth.ts:13,24`
- `GOOGLE_REDIRECT_URL` → `src/api/utils/googleOAuth.ts:10`

---

## Summary

**Minimum Required:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Strongly Recommended:**
- `BACKEND_URL` (ensures CORS works correctly)
- `FRONTEND_URL` (ensures OAuth redirects work correctly)
- `GOOGLE_REDIRECT_URL` (ensures exact match with Google Cloud Console)

**Code Fallbacks:**
- If `BACKEND_URL` not set → Uses hardcoded Railway URL (with warning)
- If `GOOGLE_REDIRECT_URL` not set → Uses `${BACKEND_URL}/auth/google/callback`
- If `FRONTEND_URL` not set → OAuth callbacks may redirect incorrectly

