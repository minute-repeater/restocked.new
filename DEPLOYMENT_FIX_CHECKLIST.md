# Deployment Fix Checklist - Complete Guide
**App:** `https://app.restocked.now`  
**Date:** December 4, 2025

---

## 🎯 CRITICAL FIX: Add Environment Variable

### Step 1: Add to Vercel (5 minutes)

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your frontend project

2. **Navigate to Environment Variables**
   - Settings → Environment Variables

3. **Add New Variable**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://restockednew-production.up.railway.app`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

4. **Save**
   - Click "Save"
   - Vercel will auto-redeploy

5. **Wait for Deployment**
   - Monitor deployment status
   - Wait for "Ready" (2-5 minutes)

---

## ✅ Complete Deployment Health Checklist

### 1. DNS ✅

- [x] **Domain resolves:** `app.restocked.now` → Vercel IPs
- [x] **CNAME record:** Points to `cname.vercel-dns.com`
- [x] **Nameservers:** Using Vercel nameservers
- [x] **Propagation:** Complete globally
- [x] **Status:** ✅ **HEALTHY**

**Test:**
```bash
dig app.restocked.now +short
# Should return IP addresses
```

---

### 2. SSL ✅

- [x] **HTTPS works:** `https://app.restocked.now` loads
- [x] **Certificate:** Valid SSL certificate
- [x] **No warnings:** No certificate errors
- [x] **Status:** ✅ **HEALTHY**

**Test:**
```bash
curl -I https://app.restocked.now
# Should return 200 OK with valid SSL
```

---

### 3. Server Responses ✅

- [x] **Frontend serves:** Returns 200 OK
- [x] **Backend health:** `/health` endpoint returns OK
- [x] **Database:** Connected
- [x] **Status:** ✅ **HEALTHY**

**Test:**
```bash
# Frontend
curl -I https://app.restocked.now
# Should return 200 OK

# Backend
curl https://restockednew-production.up.railway.app/health
# Should return {"status":"ok","database":"connected"}
```

---

### 4. API Status ⚠️

- [x] **Backend API:** Responding correctly
- [ ] **Frontend API calls:** ⚠️ **WILL WORK AFTER ENV VAR ADDED**
- [x] **CORS:** Configured correctly
- [x] **Endpoints:** `/auth/login`, `/auth/register` exist
- [x] **Status:** ⚠️ **PENDING ENV VAR FIX**

**Test (After Fix):**
```bash
# Should work after VITE_API_BASE_URL is set
curl -X POST https://restockednew-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
```

---

### 5. Database Connectivity ✅

- [x] **Database:** Connected
- [x] **Migrations:** All completed (5/5)
- [x] **Tables:** All exist
- [x] **Users table:** Ready for authentication
- [x] **Status:** ✅ **HEALTHY**

**Verified:**
- All migrations completed successfully
- Users table exists and is ready
- Database connection working

---

### 6. Authentication Flow ⚠️

- [x] **Backend auth routes:** Working
- [x] **JWT generation:** Working
- [x] **Token validation:** Working
- [ ] **Frontend API URL:** ⚠️ **NEEDS `VITE_API_BASE_URL` SET**
- [ ] **Login flow:** ⚠️ **WILL WORK AFTER ENV VAR FIX**

**Current Issue:**
- Frontend defaults to `http://localhost:3000`
- Browser blocks mixed content (HTTPS → HTTP)
- Login requests fail silently

**After Fix:**
- Frontend will call `https://restockednew-production.up.railway.app/auth/login`
- Login will work correctly
- Token will be stored and used for authenticated requests

---

## 🔍 Environment Variables Audit

### Frontend (Vercel) - REQUIRED:

| Variable | Status | Value | Action |
|----------|--------|-------|--------|
| `VITE_API_BASE_URL` | ❌ **MISSING** | `https://restockednew-production.up.railway.app` | **ADD THIS** |

### Frontend (Vercel) - NOT NEEDED:

- ❌ `NEXT_PUBLIC_API_URL` - Not using Next.js
- ❌ `DATABASE_URL` - Backend handles database
- ❌ `JWT_SECRET` - Backend handles JWT
- ❌ `NEXTAUTH_SECRET` - Not using NextAuth
- ❌ Clerk/Auth0/Supabase keys - Not using external auth

### Backend (Railway) - ALREADY SET:

- ✅ `DATABASE_URL` - Set
- ✅ `JWT_SECRET` - Set
- ✅ `FRONTEND_URL` - Set to `https://app.restocked.now`
- ✅ `BACKEND_URL` - Set

---

## 🧪 Creating Test Account

### Method 1: Registration Page (Easiest)

1. Go to: `https://app.restocked.now/register`
2. Enter:
   - Email: `test@example.com`
   - Password: `TestPassword123!` (6+ characters)
3. Click "Sign up"
4. Account created - can now login

### Method 2: Backend API (Direct)

```bash
curl -X POST https://restockednew-production.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### Method 3: Railway CLI Script

```bash
railway run npm run create-test-user
```

**Or with custom credentials:**
```bash
TEST_EMAIL=myuser@example.com TEST_PASSWORD=MyPassword123! railway run npm run create-test-user
```

---

## 🧪 Staging/Testing Bypass (Development Only)

### Option 1: Use DevLoginBypass Component

**File Created:** `frontend/src/components/DevLoginBypass.tsx`

**To Enable:**
1. Add to Vercel Environment Variables (Preview/Development ONLY):
   - `VITE_BYPASS_AUTH=true`
   - **DO NOT SET IN PRODUCTION**

2. Add to `frontend/src/App.tsx`:
```typescript
import { DevLoginBypass } from '@/components/DevLoginBypass';

function App() {
  // ... existing code ...
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {import.meta.env.DEV && <DevLoginBypass />}
        {/* ... rest of app ... */}
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

**Warning:** This bypasses authentication. Only use in Preview/Development environments.

### Option 2: Create Test User Script

**Script Created:** `scripts/create-test-user.ts`

**Usage:**
```bash
railway run npm run create-test-user
```

**With Custom Credentials:**
```bash
TEST_EMAIL=admin@test.com TEST_PASSWORD=Admin123! railway run npm run create-test-user
```

---

## 🔧 Frontend Networking Analysis

### Current Configuration:

**API Client:** `frontend/src/lib/apiClient.ts`
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
```

### Issues Identified:

1. **❌ Defaults to localhost**
   - When `VITE_API_BASE_URL` is not set, defaults to `http://localhost:3000`
   - This is why login doesn't work in production

2. **❌ Mixed Content Blocked**
   - Frontend is HTTPS: `https://app.restocked.now`
   - Default API is HTTP: `http://localhost:3000`
   - Browser blocks HTTP requests from HTTPS pages

3. **✅ CORS Configured**
   - Backend allows: `https://app.restocked.now`
   - CORS is correctly configured

4. **✅ HTTPS Required**
   - Frontend: HTTPS ✅
   - Backend: HTTPS ✅
   - After fix: Both will be HTTPS ✅

---

## 📋 Step-by-Step Fix Procedure

### Technology Stack:
- **Frontend:** React + Vite
- **Backend:** Express.js + PostgreSQL
- **Auth:** Custom JWT
- **Deploy:** Vercel (frontend) + Railway (backend)

### Fix Steps:

#### Step 1: Add Environment Variable (5 min)

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `VITE_API_BASE_URL` = `https://restockednew-production.up.railway.app`
3. Select: Production, Preview, Development
4. Save

#### Step 2: Wait for Redeploy (2-5 min)

- Vercel auto-redeploys after env var change
- Monitor deployment status
- Wait for "Ready"

#### Step 3: Clear Browser Cache (1 min)

**Chrome:**
1. Open: `chrome://net-internals/#dns`
2. Click "Clear host cache"
3. Restart browser

**Or:**
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

#### Step 4: Test Login (2 min)

1. Go to: `https://app.restocked.now/login`
2. If no account: Register at `/register`
3. Enter credentials
4. Should redirect to `/dashboard`

#### Step 5: Verify API Calls (1 min)

1. Open DevTools (F12) → Network tab
2. Attempt login
3. Check request URL: Should be `https://restockednew-production.up.railway.app/auth/login`
4. Should return 200 OK with token

---

## ✅ Final Verification Checklist

### After Adding Environment Variable:

- [ ] **Environment Variable Added**
  - `VITE_API_BASE_URL` set in Vercel
  - Value: `https://restockednew-production.up.railway.app`
  - Applied to Production, Preview, Development

- [ ] **Deployment Complete**
  - Vercel deployment shows "Ready"
  - New deployment includes env var

- [ ] **Browser Cache Cleared**
  - DNS cache cleared
  - Browser restarted or hard refreshed

- [ ] **Login Test**
  - Can access login page
  - Can register new account
  - Can login with credentials
  - Redirects to dashboard after login

- [ ] **API Calls Working**
  - Network tab shows requests to Railway backend
  - No CORS errors
  - No mixed content errors
  - Requests return 200 OK

- [ ] **Authentication Flow**
  - Token stored in localStorage
  - Protected routes accessible
  - Logout works
  - Token persists on page refresh

---

## 🎯 Final Answer

### Is Everything Configured Correctly?

**Answer:** ⚠️ **ALMOST - ONE CRITICAL MISSING VARIABLE**

**What's Correct:**
- ✅ DNS: Resolved and working
- ✅ SSL: Active and valid
- ✅ Backend: Running and responding
- ✅ Database: Connected and ready
- ✅ CORS: Configured correctly
- ✅ Auth routes: Working on backend

**What's Missing:**
- ❌ **`VITE_API_BASE_URL` environment variable in Vercel**

**Impact:**
- Login doesn't work (defaults to localhost)
- All API calls fail (pointing to wrong URL)
- App is partially functional

**Fix:**
- Add `VITE_API_BASE_URL=https://restockednew-production.up.railway.app` to Vercel
- Wait for redeploy (2-5 minutes)
- Test login

**After Fix:**
- ✅ Login will work
- ✅ All API calls will work
- ✅ App will be fully functional

---

## 📊 Summary

**Status:** 🟡 **LIVE BUT LOGIN BROKEN**

**Root Cause:** Missing `VITE_API_BASE_URL` environment variable

**Fix Time:** ~10 minutes (5 min setup + 5 min deploy)

**Priority:** 🔴 **CRITICAL** - Blocks all authentication

**Next Steps:**
1. Add environment variable to Vercel
2. Wait for redeploy
3. Test login
4. Verify all functionality

---

**Report Generated:** December 4, 2025  
**Action Required:** Add `VITE_API_BASE_URL` to Vercel environment variables



