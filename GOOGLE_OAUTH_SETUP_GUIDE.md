# Google OAuth Setup Guide - Exact Values

**Date:** 2025-12-04  
**Backend URL:** `https://restockednew-production.up.railway.app`  
**Frontend URL:** (Your Vercel frontend URL)

---

## Step 1: Generate Google OAuth Credentials

### 1.1 Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account
3. Create a new project OR select an existing project

### 1.2 Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have Google Workspace)
3. Click **Create**
4. Fill in required fields:
   - **App name:** `Restocked` (or your app name)
   - **User support email:** Your email address
   - **Developer contact information:** Your email address
5. Click **Save and Continue**
6. **Scopes:** Click **Add or Remove Scopes**
   - Add: `.../auth/userinfo.email`
   - Add: `.../auth/userinfo.profile`
   - Click **Update** then **Save and Continue**
7. **Test users:** Skip for now (add later if needed)
8. Click **Back to Dashboard**

### 1.3 Create OAuth 2.0 Client ID

1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type:** Select **Web application**
4. **Name:** `Restocked Web Client` (or any name)
5. **Authorized JavaScript origins:** (Leave empty for now)
6. **Authorized redirect URIs:** Click **+ ADD URI**
   - Add: `https://restockednew-production.up.railway.app/auth/google/callback`
   - ⚠️ **IMPORTANT:** Copy this EXACT URL (no trailing slash)
7. Click **CREATE**
8. **Copy the credentials:**
   - **Your Client ID:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Your Client Secret:** `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **Save these immediately** - you can't view the secret again!

---

## Step 2: Validate Redirect URL

### ✅ Correct Redirect URL Format

```
https://restockednew-production.up.railway.app/auth/google/callback
```

**Validation Checklist:**
- ✅ Uses `https://` (not `http://`)
- ✅ No trailing slash
- ✅ Exact path: `/auth/google/callback`
- ✅ Matches your Railway backend URL exactly

### ❌ Common Mistakes

- ❌ `http://restockednew-production.up.railway.app/auth/google/callback` (missing 's' in https)
- ❌ `https://restockednew-production.up.railway.app/auth/google/callback/` (trailing slash)
- ❌ `https://restockednew-production.up.railway.app/google/callback` (missing `/auth`)
- ❌ `https://restockednew-production.up.railway.app/auth/google/callback?param=value` (query params)

---

## Step 3: Code Validation

### Backend Code (Verified ✅)

**File:** `src/api/utils/googleOAuth.ts`

```typescript
// Variable names used in code:
process.env.GOOGLE_CLIENT_ID          // ✅ Correct
process.env.GOOGLE_CLIENT_SECRET     // ✅ Correct
process.env.GOOGLE_REDIRECT_URL      // ✅ Correct (primary)
process.env.GOOGLE_REDIRECT_URI      // ✅ Correct (alias, fallback)
```

**Redirect URL construction:**
```typescript
const redirectUrl = process.env.GOOGLE_REDIRECT_URL 
  || process.env.GOOGLE_REDIRECT_URI 
  || `${config.backendUrl}/auth/google/callback`;
```

**Route path:** `/auth/google/callback` ✅

### Frontend Code (Verified ✅)

**File:** `frontend/src/pages/Login.tsx`

```typescript
// Variable name used in code:
import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true'  // ✅ Correct
```

---

## Step 4: Railway Environment Variables

### Exact JSON Format (for Railway UI)

```json
{
  "GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "GOCSPX-YOUR_CLIENT_SECRET_HERE",
  "GOOGLE_REDIRECT_URL": "https://restockednew-production.up.railway.app/auth/google/callback"
}
```

### Shell Export Format (for Railway CLI)

```bash
export GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="GOCSPX-YOUR_CLIENT_SECRET_HERE"
export GOOGLE_REDIRECT_URL="https://restockednew-production.up.railway.app/auth/google/callback"
```

### Railway Dashboard Steps

1. Go to: https://railway.app/
2. Select your project → **Backend service**
3. Click **Variables** tab
4. Click **+ New Variable** for each:

   **Variable 1:**
   - Key: `GOOGLE_CLIENT_ID`
   - Value: `YOUR_CLIENT_ID_HERE.apps.googleusercontent.com`
   - Click **Add**

   **Variable 2:**
   - Key: `GOOGLE_CLIENT_SECRET`
   - Value: `GOCSPX-YOUR_CLIENT_SECRET_HERE`
   - Click **Add**

   **Variable 3:**
   - Key: `GOOGLE_REDIRECT_URL`
   - Value: `https://restockednew-production.up.railway.app/auth/google/callback`
   - Click **Add**

5. Railway will automatically redeploy

---

## Step 5: Vercel Environment Variables

### Exact JSON Format (for Vercel UI)

```json
{
  "VITE_GOOGLE_OAUTH_ENABLED": "true"
}
```

### Shell Export Format (for Vercel CLI)

```bash
export VITE_GOOGLE_OAUTH_ENABLED="true"
```

### Vercel Dashboard Steps

1. Go to: https://vercel.com/
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in:
   - **Key:** `VITE_GOOGLE_OAUTH_ENABLED`
   - **Value:** `true` (must be the string `"true"`, not boolean)
   - **Environments:** Select **Production**, **Preview**, **Development**
   - Click **Save**
6. Vercel will automatically redeploy

---

## Step 6: Verification Checklist

### ✅ Google Cloud Console

- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created (Web application type)
- [ ] Authorized redirect URI added: `https://restockednew-production.up.railway.app/auth/google/callback`
- [ ] Client ID copied
- [ ] Client Secret copied (saved securely)

### ✅ Railway (Backend)

- [ ] `GOOGLE_CLIENT_ID` set
- [ ] `GOOGLE_CLIENT_SECRET` set
- [ ] `GOOGLE_REDIRECT_URL` set to: `https://restockednew-production.up.railway.app/auth/google/callback`
- [ ] Deployment completed successfully
- [ ] Check logs for: "Google OAuth not configured" (should NOT appear if configured correctly)

### ✅ Vercel (Frontend)

- [ ] `VITE_GOOGLE_OAUTH_ENABLED` set to `"true"` (string)
- [ ] Deployment completed successfully
- [ ] Visit login page - Google button should appear

---

## Step 7: Test OAuth Flow

### Test Steps

1. **Visit your frontend login page**
2. **Verify Google button appears** (if `VITE_GOOGLE_OAUTH_ENABLED=true`)
3. **Click "Sign in with Google"**
4. **Complete Google OAuth flow:**
   - Select Google account
   - Grant permissions
5. **Should redirect to:** `/auth/callback?token=...`
6. **Should then redirect to:** `/dashboard`
7. **Check Railway logs for:** `"Google OAuth login successful"`

### Expected Logs (Railway)

**Success:**
```
[INFO] Google OAuth login successful { email: 'user@example.com', userId: '...', provider: 'google' }
```

**If misconfigured:**
```
[WARN] Google OAuth not configured { path: '/auth/google/url' }
```

---

## Troubleshooting

### Google Button Not Appearing

**Check:**
- `VITE_GOOGLE_OAUTH_ENABLED` is exactly `"true"` (string, not boolean)
- Frontend has been redeployed after setting variable
- Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### "redirect_uri_mismatch" Error

**Fix:**
- Verify redirect URI in Google Cloud Console matches EXACTLY:
  - `https://restockednew-production.up.railway.app/auth/google/callback`
- Check for:
  - Trailing slashes
  - Protocol (http vs https)
  - Path spelling (`/auth/google/callback`)

### "invalid_client" Error

**Fix:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure credentials are for "Web application" type (not iOS/Android)
- Check that credentials haven't been deleted/regenerated

### OAuth Button Appears But Returns Error

**Check Railway logs:**
- Look for: `"Google OAuth not configured"`
- Verify all three env vars are set in Railway
- Ensure Railway deployment completed successfully

---

## Quick Reference

### Exact Values Template

**Railway Variables:**
```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URL=https://restockednew-production.up.railway.app/auth/google/callback
```

**Vercel Variables:**
```
VITE_GOOGLE_OAUTH_ENABLED=true
```

**Google Cloud Console Redirect URI:**
```
https://restockednew-production.up.railway.app/auth/google/callback
```

---

**Status:** Ready to configure. Follow steps above in order.


