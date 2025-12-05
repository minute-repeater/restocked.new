# Enable Google OAuth - Step by Step Instructions

**Date:** 2025-12-04  
**Status:** Ready to configure

---

## ⚠️ Important: I Cannot Set Variables Directly

I don't have direct access to Railway or Vercel dashboards. You'll need to set the environment variables manually using the steps below. After you set them, I can help verify everything works.

---

## Step 1: Set Railway Environment Variables

### 1.1 Go to Railway Dashboard

1. Visit: https://railway.app/
2. Sign in
3. Select your project
4. Click on your **Backend service**

### 1.2 Add Environment Variables

1. Click the **Variables** tab
2. Click **+ New Variable** button
3. Add each variable **one at a time**:

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

### 1.3 Verify Railway Deployment

1. Go to **Deployments** tab
2. Wait for new deployment to start (should auto-trigger)
3. Wait for deployment to complete (status = "Deployed")
4. Check deployment logs for any errors

**Expected:** Deployment should complete successfully with no errors related to OAuth.

---

## Step 2: Set Vercel Environment Variable

### 2.1 Go to Vercel Dashboard

1. Visit: https://vercel.com/
2. Sign in
3. Select your project

### 2.2 Add Environment Variable

1. Go to **Settings** → **Environment Variables**
2. Click **Add New**
3. Fill in:
   ```
   Key: VITE_GOOGLE_OAUTH_ENABLED
   Value: true
   ```
4. **Environments:** Check all three:
   - ☑ Production
   - ☑ Preview
   - ☑ Development
5. Click **Save**

### 2.3 Verify Vercel Deployment

1. Go to **Deployments** tab
2. Wait for new deployment to start (should auto-trigger)
3. Wait for deployment to complete (status = "Ready")
4. Check deployment logs for any errors

**Expected:** Deployment should complete successfully.

---

## Step 3: Verify Environment Variables Are Loaded

### 3.1 Check Railway Variables

**Method 1: Railway Dashboard**
- Go to Variables tab
- Verify all 3 variables are listed:
  - `GOOGLE_CLIENT_ID` (value should be visible, starts with numbers)
  - `GOOGLE_CLIENT_SECRET` (value should be visible, starts with `GOCSPX-`)
  - `GOOGLE_REDIRECT_URL` (should be exactly: `https://restockednew-production.up.railway.app/auth/google/callback`)

**Method 2: Test Backend Endpoint**
After Railway deploys, run:
```bash
curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
  -H "Origin: https://app.restocked.now"
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

### 3.2 Check Vercel Variables

**Method 1: Vercel Dashboard**
- Go to Settings → Environment Variables
- Verify `VITE_GOOGLE_OAUTH_ENABLED` is set to `true`
- Verify it's applied to Production environment

**Method 2: Test Frontend**
After Vercel deploys, visit: `https://app.restocked.now/login`

**Expected:**
- "Sign in with Google" button should appear
- Button should be below email/password form

---

## Step 4: Test OAuth Flow

### 4.1 Visit Login Page

1. Open: `https://app.restocked.now/login`
2. Verify "Sign in with Google" button is visible

### 4.2 Start OAuth Flow

1. Click "Sign in with Google" button
2. Browser should redirect to Google OAuth consent screen
3. Select your Google account
4. Grant permissions

### 4.3 Verify Callback

**Expected:**
- Browser redirects to: `https://app.restocked.now/auth/callback?token=...`
- Token is present in URL (long JWT string)
- Page shows "Completing sign in..." briefly
- Then redirects to `/dashboard`
- User is logged in

### 4.4 Check Logs

**Railway Logs:**
Go to Railway Dashboard → Backend Service → Deployments → Latest → View Logs

**Expected Success Log:**
```
[INFO] Google OAuth login successful { email: "user@example.com", userId: "uuid-here", provider: "google" }
```

**If you see:**
```
[WARN] Google OAuth not configured
```
→ Check Railway env vars are set correctly

---

## Step 5: Verification Checklist

After completing steps 1-4, verify:

- [ ] Railway deployment completed successfully
- [ ] Vercel deployment completed successfully
- [ ] Backend endpoint `/auth/google/url` returns 200 (not 400)
- [ ] Frontend login page shows Google button
- [ ] Clicking button redirects to Google OAuth
- [ ] After Google approval, callback returns token
- [ ] User is logged in and redirected to dashboard
- [ ] Railway logs show: "Google OAuth login successful"
- [ ] No errors in browser console
- [ ] No errors in Railway logs

---

## Troubleshooting

### Issue: Backend Returns 400 "Google OAuth is not configured"

**Check:**
1. Railway env vars are set (all 3)
2. Variable names are exact (case-sensitive):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URL`
3. Values are not empty
4. Railway deployment completed after setting vars

**Fix:**
- Re-add env vars in Railway
- Trigger manual redeploy: Railway Dashboard → Deployments → Redeploy

### Issue: Frontend Button Doesn't Appear

**Check:**
1. `VITE_GOOGLE_OAUTH_ENABLED` is exactly `"true"` (string, not boolean)
2. Vercel deployment completed
3. Applied to Production environment

**Fix:**
- Re-verify env var in Vercel
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
- Redeploy frontend if needed

### Issue: "redirect_uri_mismatch" Error

**Check:**
1. Google Cloud Console → Authorized redirect URIs
2. Must match exactly: `https://restockednew-production.up.railway.app/auth/google/callback`
3. No trailing slash
4. Correct protocol (https)

**Fix:**
- Update redirect URI in Google Cloud Console
- Wait 2-3 minutes for changes to propagate

---

## Next Steps After Setting Variables

Once you've set the variables in Railway and Vercel:

1. **Wait for both deployments to complete** (usually 1-2 minutes each)
2. **Tell me when they're done**, and I'll help verify:
   - Backend endpoint responds correctly
   - Frontend button appears
   - OAuth flow works end-to-end
   - Logs show success

Or you can run the verification steps above yourself and let me know if anything fails.

---

**Ready to set variables?** Follow steps 1-2 above, then proceed to verification.


