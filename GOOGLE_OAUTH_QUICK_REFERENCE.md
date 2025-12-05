# Google OAuth Quick Reference

**Date:** 2025-12-04  
**Purpose:** Quick reference for enabling Google OAuth

---

## ✅ Validation Results

### Backend Code
- ✅ Reads: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL`
- ✅ Route: `GET /auth/google/callback`
- ✅ All paths verified

### Frontend Code
- ✅ Feature flag: `VITE_GOOGLE_OAUTH_ENABLED === 'true'`
- ✅ Button conditional rendering verified

---

## 📋 Deployment Checklist

### Step 1: Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add Authorized redirect URI:
   ```
   https://restockednew-production.up.railway.app/auth/google/callback
   ```
5. Copy Client ID and Client Secret

---

### Step 2: Railway (Backend)

**Location:** Railway Dashboard → Project → Backend Service → Variables Tab

**Add 3 variables:**
```
GOOGLE_CLIENT_ID=<paste from Google Cloud>
GOOGLE_CLIENT_SECRET=<paste from Google Cloud>
GOOGLE_REDIRECT_URL=https://restockednew-production.up.railway.app/auth/google/callback
```

**Verify:** Wait for deployment, then test:
```bash
curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
  -H "Origin: https://app.restocked.now"
```
Should return 200 with `{ "url": "..." }`

---

### Step 3: Vercel (Frontend)

**Location:** Vercel Dashboard → Project → Settings → Environment Variables

**Add 1 variable:**
```
VITE_GOOGLE_OAUTH_ENABLED=true
```
Select: Production, Preview, Development

**Verify:** Visit `https://app.restocked.now/login` → Button should appear

---

## 🧪 Pre-Flight Check

**Test Backend Configuration:**
```bash
curl -X GET "https://restockednew-production.up.railway.app/auth/google/url" \
  -H "Origin: https://app.restocked.now"
```

**Expected:** `200 OK` with `{ "url": "https://accounts.google.com/..." }`

**If 400:** Check Railway env vars are set

---

## 🔄 Rollback

**Disable OAuth Button:**
- Vercel: Remove or set `VITE_GOOGLE_OAUTH_ENABLED=false`

**Disable OAuth Backend:**
- Railway: Remove `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL`

**Full Rollback:**
- Do both above

**Result:** Email/password login continues to work

---

## 📝 Redirect URI Matching

**Must Match Exactly:**
```
https://restockednew-production.up.railway.app/auth/google/callback
```

**Common Mistakes:**
- ❌ `http://` (must be `https://`)
- ❌ Trailing slash
- ❌ Missing `/auth` in path
- ❌ Query parameters

---

**Full Details:** See `GOOGLE_OAUTH_FINAL_VALIDATION.md`


