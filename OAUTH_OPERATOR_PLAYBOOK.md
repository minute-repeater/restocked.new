# OAuth Operator Playbook

**Date:** 2025-12-04  
**Purpose:** Step-by-step guide for enabling OAuth in production

---

## ⚠️ Important: OAuth is Disabled by Default

OAuth (Google + Apple) is **fully implemented** but **disabled by default**. It will remain invisible and non-functional until you explicitly enable it via environment variables.

**Current State:**
- ✅ Email/password login works normally
- ✅ OAuth buttons are hidden
- ✅ OAuth routes return errors if called
- ✅ No crashes or unhandled errors

---

## Step-by-Step Setup

### Step 1: Configure Google OAuth (Google Cloud Console)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: Your app name
   - User support email: Your email
   - Developer contact: Your email
6. Select **Web application** as the application type
7. **Authorized redirect URIs:**
   - Add: `https://restockednew-production.up.railway.app/auth/google/callback`
   - (Replace with your actual Railway backend URL)
8. Click **Create**
9. **Copy the Client ID and Client Secret** (you'll need these for Railway)

---

### Step 2: Configure Apple Sign-In (Apple Developer Portal)

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Sign in with your Apple Developer account
3. Navigate to **Certificates, Identifiers & Profiles**

#### 2a. Create App ID (if not exists)

1. Go to **Identifiers** → **App IDs**
2. Click **+** to create new App ID
3. Select **App** and click **Continue**
4. Enter description and Bundle ID (e.g., `com.restocked.app`)
5. Enable **Sign In with Apple** capability
6. Click **Continue** and **Register**

#### 2b. Create Service ID

1. Go to **Identifiers** → **Services IDs**
2. Click **+** to create new Service ID
3. Enter description and Identifier (e.g., `com.restocked.app.web`)
4. Enable **Sign In with Apple**
5. Click **Configure** next to "Sign In with Apple"
6. **Primary App ID:** Select your App ID
7. **Website URLs:**
   - Domains: `restockednew-production.up.railway.app`
   - Return URLs: `https://restockednew-production.up.railway.app/auth/apple/callback`
8. Click **Save** and **Continue**, then **Register**
9. **Note the Service ID** (you'll need this for Railway)

#### 2c. Create Key

1. Go to **Keys**
2. Click **+** to create new key
3. Enter key name (e.g., "Sign In with Apple Key")
4. Enable **Sign In with Apple**
5. Click **Configure** and select your Primary App ID
6. Click **Save** and **Continue**
7. Click **Register**
8. **Download the key file** (`.p8` file) - **you can only download once!**
9. **Note the Key ID** shown on the page

#### 2d. Get Team ID

1. Go to **Membership** in Apple Developer portal
2. Find your **Team ID** (e.g., `ABC123DEFG`)

#### 2e. Extract Private Key

1. Open the downloaded `.p8` file in a text editor
2. Copy the entire contents including:
   ```
   -----BEGIN PRIVATE KEY-----
   ...
   -----END PRIVATE KEY-----
   ```

---

### Step 3: Set Backend Environment Variables (Railway)

1. Go to [Railway Dashboard](https://railway.app/)
2. Select your project → Backend service
3. Go to **Variables** tab
4. Add the following variables:

**Google OAuth:**
- `GOOGLE_CLIENT_ID` = (from Google Cloud Console)
- `GOOGLE_CLIENT_SECRET` = (from Google Cloud Console)
- `GOOGLE_REDIRECT_URL` = `https://restockednew-production.up.railway.app/auth/google/callback` (optional, defaults if not set)

**Apple OAuth:**
- `APPLE_CLIENT_ID` = (Service ID from Apple Developer Portal, e.g., `com.restocked.app.web`)
- `APPLE_TEAM_ID` = (from Apple Developer Portal)
- `APPLE_KEY_ID` = (from downloaded key)
- `APPLE_PRIVATE_KEY` = (full private key from `.p8` file, paste directly - Railway handles newlines)
- `APPLE_REDIRECT_URL` = `https://restockednew-production.up.railway.app/auth/apple/callback` (optional, defaults if not set)

**Important Notes:**
- For `APPLE_PRIVATE_KEY`, paste the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Railway will handle newlines automatically
- Do NOT use `\n` in Railway - paste the key directly

5. Railway will automatically redeploy when you save variables

---

### Step 4: Set Frontend Environment Variables (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

**OAuth Feature Flags:**
- `VITE_GOOGLE_OAUTH_ENABLED` = `true` (to show Google button)
- `VITE_APPLE_OAUTH_ENABLED` = `true` (to show Apple button)

**Important:**
- Set these to the **string** `true` (not boolean)
- Must be exactly `'true'` for buttons to appear
- If not set or set to anything else, buttons will be hidden

5. Vercel will automatically redeploy when you save variables

---

### Step 5: Verify Deployment

1. **Backend (Railway):**
   - Wait for deployment to complete
   - Check logs for any errors
   - Verify health endpoint: `https://restockednew-production.up.railway.app/health`

2. **Frontend (Vercel):**
   - Wait for deployment to complete
   - Visit your frontend URL
   - Go to login page

---

### Step 6: Test OAuth Flows

#### Test Email/Password Login (Should Still Work)

1. Visit login page
2. Enter email and password
3. Click "Sign in"
4. Should redirect to dashboard
5. ✅ **This must continue to work after enabling OAuth**

#### Test Google OAuth (If Enabled)

1. Visit login page
2. Click "Sign in with Google" button
3. Complete Google OAuth flow
4. Should redirect to dashboard
5. Verify user was created/logged in

#### Test Apple OAuth (If Enabled)

1. Visit login page
2. Click "Sign in with Apple" button
3. Complete Apple Sign-In flow
4. Should redirect to dashboard
5. Verify user was created/logged in

---

## Troubleshooting

### OAuth Buttons Not Appearing

**Check:**
- `VITE_GOOGLE_OAUTH_ENABLED` is set to exactly `'true'` (string)
- `VITE_APPLE_OAUTH_ENABLED` is set to exactly `'true'` (string)
- Frontend has been redeployed after setting variables
- Clear browser cache and hard refresh

### OAuth Buttons Appear But Return Errors

**Check:**
- Backend env vars are set in Railway
- Backend has been redeployed
- Redirect URLs match exactly in provider consoles
- Check Railway logs for specific error messages

### Google OAuth Errors

**"redirect_uri_mismatch":**
- Verify `GOOGLE_REDIRECT_URL` matches exactly what's in Google Cloud Console
- Check for trailing slashes or protocol mismatches

**"invalid_client":**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure credentials are for "Web application" type

### Apple OAuth Errors

**"invalid_client":**
- Verify `APPLE_CLIENT_ID` is the Service ID (not App ID)
- Ensure Service ID has Sign In with Apple enabled

**"invalid_grant":**
- Check that `APPLE_REDIRECT_URL` matches exactly what's in Apple Developer portal
- Verify authorization code hasn't expired

**"invalid_key":**
- Ensure `APPLE_PRIVATE_KEY` includes full key with newlines
- Verify `APPLE_KEY_ID` matches the key you downloaded
- Check that `APPLE_TEAM_ID` is correct

---

## How to Disable OAuth

### Option 1: Remove Frontend Flags (Recommended)

In Vercel, remove or set to `false`:
- `VITE_GOOGLE_OAUTH_ENABLED` = `false` (or remove)
- `VITE_APPLE_OAUTH_ENABLED` = `false` (or remove)

**Result:** OAuth buttons disappear, email/password continues to work.

### Option 2: Remove Backend Env Vars

In Railway, remove OAuth environment variables.

**Result:** OAuth routes return 400 errors, no crashes.

### Option 3: Both

Remove both frontend flags and backend env vars.

**Result:** OAuth completely disabled, email/password unaffected.

---

## Safety Guarantees

✅ **No Auto-Enablement:** OAuth requires explicit configuration  
✅ **No Breaking Changes:** Email/password login unchanged  
✅ **Graceful Degradation:** Missing config = clear errors, no crashes  
✅ **Backwards Compatible:** Existing users unaffected  

---

## Quick Reference

### Railway (Backend) Env Vars

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URL=https://restockednew-production.up.railway.app/auth/google/callback

APPLE_CLIENT_ID=com.restocked.app.web
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=XYZ789ABCD
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APPLE_REDIRECT_URL=https://restockednew-production.up.railway.app/auth/apple/callback
```

### Vercel (Frontend) Env Vars

```
VITE_GOOGLE_OAUTH_ENABLED=true
VITE_APPLE_OAUTH_ENABLED=true
```

### Redirect URLs to Configure

**Google Cloud Console:**
- `https://restockednew-production.up.railway.app/auth/google/callback`

**Apple Developer Portal:**
- `https://restockednew-production.up.railway.app/auth/apple/callback`

---

**Status:** Ready for production use. OAuth is safely disabled until explicitly enabled.


