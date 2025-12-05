# Google OAuth Deployment Verification

**Date:** 2025-12-04  
**Purpose:** Verify OAuth is enabled and functional after env vars are set

---

## Pre-Verification: Environment Variables Status

Before testing, verify env vars are set:

### Railway (Backend)

Check Railway Dashboard → Backend Service → Variables:
- [ ] `GOOGLE_CLIENT_ID` is set (not empty)
- [ ] `GOOGLE_CLIENT_SECRET` is set (not empty)
- [ ] `GOOGLE_REDIRECT_URL` = `https://restockednew-production.up.railway.app/auth/google/callback`

### Vercel (Frontend)

Check Vercel Dashboard → Project → Settings → Environment Variables:
- [ ] `VITE_GOOGLE_OAUTH_ENABLED` = `true` (string)
- [ ] Applied to Production environment

---

## Verification Steps

### Step 1: Check Backend Configuration

**Test:** Check if backend recognizes OAuth config

```bash
curl -X GET https://restockednew-production.up.railway.app/auth/google/url
```

**Expected Success (200):**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
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

### Step 2: Check Frontend Button Visibility

**Test:** Visit login page

1. Open: `https://app.restocked.now/login`
2. Inspect page source or check for button

**Expected:**
- ✅ "Sign in with Google" button visible
- ✅ Button appears below email/password form
- ✅ Button has Google icon/logo

**If button doesn't appear:**
- Check `VITE_GOOGLE_OAUTH_ENABLED` is exactly `"true"` (string)
- Verify Vercel deployment completed
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors

---

### Step 3: Test OAuth Flow Initiation

**Test:** Click Google button

1. Click "Sign in with Google" button
2. Observe browser behavior

**Expected:**
- ✅ Browser redirects to Google OAuth consent screen
- ✅ URL: `https://accounts.google.com/o/oauth2/v2/auth?...`
- ✅ URL contains `client_id` parameter
- ✅ URL contains `redirect_uri` parameter (URL-encoded)

**Check redirect_uri in URL:**
- Should contain: `redirect_uri=https%3A%2F%2Frestockednew-production.up.railway.app%2Fauth%2Fgoogle%2Fcallback`
- (URL-encoded version of the callback URL)

**If redirect fails:**
- Check browser console for errors
- Verify Railway env vars are set
- Check Railway logs for: `"Google OAuth not configured"`

---

### Step 4: Test OAuth Callback

**Test:** Complete Google OAuth flow

1. Select Google account
2. Grant permissions
3. Observe redirect after approval

**Expected:**
- ✅ Browser redirects to: `https://app.restocked.now/auth/callback?token=...`
- ✅ Token is present in URL (long JWT string)
- ✅ No error messages in URL

**If callback fails:**
- Check Google Cloud Console → Authorized redirect URIs
- Must match exactly: `https://restockednew-production.up.railway.app/auth/google/callback`
- Check Railway logs for callback errors
- Verify `GOOGLE_REDIRECT_URL` matches exactly

---

### Step 5: Verify Token and Login

**Test:** Check token is valid and user is logged in

**Expected:**
- ✅ Page shows "Completing sign in..." briefly
- ✅ Then redirects to `/dashboard`
- ✅ User is logged in (can access protected routes)
- ✅ User email matches Google account email

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

### Step 6: Check Railway Logs

**Test:** Verify structured logs

Go to Railway Dashboard → Backend Service → Deployments → Latest → View Logs

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

**If "Google OAuth not configured" appears:**
- Verify all 3 env vars are set in Railway
- Check env var names are exact (case-sensitive)
- Verify Railway deployment completed after setting vars

---

### Step 7: Check Sentry (Optional)

**Test:** Verify error monitoring

Go to Sentry Dashboard → Issues

**Expected:**
- ✅ No new OAuth-related errors
- ✅ If errors occur, they have tags:
  - `oauth_provider: "google"`
  - `endpoint: "/auth/google/url"` or `"/auth/google/callback"`

---

## Troubleshooting Guide

### Issue: Button Doesn't Appear

**Check:**
1. `VITE_GOOGLE_OAUTH_ENABLED` is exactly `"true"` (string, not boolean)
2. Vercel deployment completed
3. Clear browser cache
4. Check browser console for errors

**Fix:**
- Re-verify env var in Vercel
- Redeploy frontend if needed

---

### Issue: "redirect_uri_mismatch" Error

**Check:**
1. Google Cloud Console → Authorized redirect URIs
2. Must match exactly: `https://restockednew-production.up.railway.app/auth/google/callback`
3. No trailing slash
4. Correct protocol (https)

**Fix:**
- Update redirect URI in Google Cloud Console
- Wait a few minutes for changes to propagate

---

### Issue: "Google OAuth is not configured" Error

**Check Railway:**
1. All 3 env vars are set
2. Variable names are exact (case-sensitive):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URL`
3. Values are not empty
4. Railway deployment completed after setting vars

**Fix:**
- Re-add env vars in Railway
- Trigger manual redeploy if needed

---

### Issue: Callback Returns Error

**Check:**
1. Railway logs for specific error message
2. Google Cloud Console redirect URI matches exactly
3. Token exchange succeeded (check logs)

**Common Errors:**
- `"invalid_client"` → Check Client ID/Secret are correct
- `"invalid_grant"` → Authorization code expired (try again)
- `"redirect_uri_mismatch"` → Fix redirect URI in Google Cloud Console

---

## Success Criteria

✅ All verification steps pass:
- [ ] Backend recognizes OAuth config (200 response from `/auth/google/url`)
- [ ] Frontend button appears
- [ ] OAuth flow initiates correctly
- [ ] Callback returns token
- [ ] User is logged in
- [ ] Railway logs show success
- [ ] No errors in Sentry

---

**Status:** Ready for verification after env vars are set.


