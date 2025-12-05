# Vercel Environment Variable Injection Diagnostic
**Date:** December 4, 2025  
**Purpose:** Comprehensive diagnostic for Vercel environment variable injection issues

---

## 🔍 DIAGNOSTIC RESULTS

### 1. Build Cache and Previous Deployments

**Status:** ✅ Checked

**Findings:**
- **.vercel cache:** Checked for cached configuration
- **node_modules/.vite cache:** Vite build cache location
- **dist/ build artifacts:** Current build contains hardcoded values

**Impact:**
- Vercel may cache build outputs
- Old deployments may have incorrect values hardcoded
- Build cache must be cleared for fresh injection

**Action Required:**
- Clear Vercel build cache before redeploy
- Ensure fresh build with correct environment variables

---

### 2. Build-Time Environment Variable Logging

**Status:** ✅ Enhanced

**Location:** `frontend/vite.config.ts` → `validateApiBaseUrl()` plugin

**What It Logs:**
- `VITE_API_BASE_URL` value (or undefined)
- All `VITE_*` environment variables
- Check for typo variable (`VITE_APT_BASE_URL`)

**Build Output Example:**
```
🔍 Build-time Environment Variable Diagnostic:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_API_BASE_URL = https://restockednew-production.up.railway.app

📋 All VITE_* environment variables:
   VITE_API_BASE_URL = https://restockednew-production.up.railway.app

📋 Checking for typo variable (VITE_APT_BASE_URL):
   VITE_APT_BASE_URL = (not found - good!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**How to View:**
1. Go to Vercel Dashboard → Deployments
2. Click on latest deployment
3. Click "View Build Logs"
4. Search for "🔍 Build-time Environment Variable Diagnostic"

---

### 3. Runtime Environment Variable Logging

**Status:** ✅ Enhanced

**Location:** `frontend/src/lib/apiClient.ts`

**What It Logs:**
- Final `API_BASE_URL` value used by axios
- `import.meta.env.VITE_API_BASE_URL` value
- All `import.meta.env` properties
- All `VITE_*` variables
- Check for typo variable

**Browser Console Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [apiClient] RUNTIME ENVIRONMENT DIAGNOSTIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Final API_BASE_URL value: https://restockednew-production.up.railway.app
📍 import.meta.env.VITE_API_BASE_URL: https://restockednew-production.up.railway.app

📋 All import.meta.env properties:
   BASE_URL = /
   DEV = false
   MODE = production
   PROD = true
   SSR = false
   VITE_API_BASE_URL = https://restockednew-production.up.railway.app

📋 VITE_* environment variables only:
   VITE_API_BASE_URL = https://restockednew-production.up.railway.app

⚠️  Checking for typo variable:
   import.meta.env.VITE_APT_BASE_URL = (not found - good!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**How to View:**
1. Open `https://app.restocked.now`
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Look for diagnostic output (appears on page load)

---

### 4. Built Bundle Inspection

**Status:** ✅ Analyzed

**Bundle Location:** `frontend/dist/assets/index-*.js`

**Extraction Method:**
```bash
# Find bundle
BUNDLE=$(find dist/assets -name "*.js" | head -1)

# Extract API URL patterns
grep -oE '(https?://[^"'\''\s]+|localhost[^"'\''\s]*)' "$BUNDLE"

# Extract baseURL assignment
grep -oE 'baseURL[^,}]*' "$BUNDLE"

# Extract import.meta.env object
grep -oE 'VITE_API_BASE_URL[^,}]*' "$BUNDLE"
```

**Expected Bundle Content (After Fix):**
```javascript
// import.meta.env object
kE={...,VITE_API_BASE_URL:"https://restockednew-production.up.railway.app"}

// API_BASE_URL variable
lx="https://restockednew-production.up.railway.app"

// axios.create baseURL
baseURL:lx
```

**Current Bundle Content (Before Fix):**
```javascript
// import.meta.env object (missing or undefined)
kE={...,VITE_API_BASE_URL:undefined}

// API_BASE_URL variable (fallback)
lx="http://localhost:3000"

// axios.create baseURL
baseURL:lx
```

---

## 🛠️ FORCED-REBUILD STRATEGY

### Strategy Overview

This strategy ensures a completely fresh build with correct environment variables, bypassing all caches.

---

### Step 1: Delete Vercel Build Cache

**Option A: Via Vercel Dashboard (Recommended)**
1. Go to: Vercel Dashboard → Project → Settings → General
2. Scroll to: "Build & Development Settings"
3. Click: "Clear Build Cache" (if available)
4. Or: Go to Deployments → Click "..." on latest → "Redeploy" → Uncheck "Use existing Build Cache"

**Option B: Via Vercel CLI**
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to project
cd frontend

# Remove build cache
vercel --force

# Or delete specific cache
rm -rf .vercel
rm -rf node_modules/.vite
rm -rf dist
```

**Option C: Manual Cache Clear**
```bash
cd frontend

# Remove local build artifacts
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vercel/cache  # if exists

# Clear npm cache (optional)
npm cache clean --force
```

---

### Step 2: Verify Environment Variables in Vercel

**Before Redeploy:**
1. Go to: Vercel Dashboard → Project → Settings → Environment Variables
2. **Delete:** `VITE_APT_BASE_URL` (if exists)
3. **Verify:** `VITE_API_BASE_URL` exists
4. **Check Value:** `https://restockednew-production.up.railway.app`
5. **Verify Environments:** Production, Preview, Development all selected
6. **Save:** Wait for confirmation

**Verification Checklist:**
- [ ] `VITE_APT_BASE_URL` deleted
- [ ] `VITE_API_BASE_URL` exists
- [ ] Value is correct Railway URL
- [ ] Applied to Production environment
- [ ] Applied to Preview environment (optional)
- [ ] Applied to Development environment (optional)

---

### Step 3: Trigger Manual Redeploy

**Method 1: Via Dashboard (Recommended)**
1. Go to: Vercel Dashboard → Deployments
2. Find: Latest deployment
3. Click: "..." (three dots)
4. Click: "Redeploy"
5. **IMPORTANT:** Uncheck "Use existing Build Cache"
6. Click: "Redeploy"
7. Wait: 2-5 minutes for build to complete

**Method 2: Via Git Push**
```bash
# Make a small change to trigger rebuild
cd frontend
echo "# Force rebuild $(date)" >> README.md
git add README.md
git commit -m "Force rebuild with correct env vars"
git push origin main
```

**Method 3: Via Vercel CLI**
```bash
cd frontend
vercel --prod --force
```

---

### Step 4: Verify Build Logs

**During Build:**
1. Go to: Vercel Dashboard → Deployments
2. Click: Latest deployment (in progress)
3. Click: "View Build Logs"
4. Look for: "🔍 Build-time Environment Variable Diagnostic"
5. Verify:
   - ✅ `VITE_API_BASE_URL = https://restockednew-production.up.railway.app`
   - ✅ `VITE_APT_BASE_URL = (not found - good!)`
   - ✅ Validation passes: "✅ VITE_API_BASE_URL validated successfully"
   - ❌ No errors about missing variable
   - ❌ No localhost in logs

**Expected Build Log Output:**
```
🔍 Build-time Environment Variable Diagnostic:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_API_BASE_URL = https://restockednew-production.up.railway.app

📋 All VITE_* environment variables:
   VITE_API_BASE_URL = https://restockednew-production.up.railway.app

📋 Checking for typo variable (VITE_APT_BASE_URL):
   VITE_APT_BASE_URL = (not found - good!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VITE_API_BASE_URL validated successfully
   Using: https://restockednew-production.up.railway.app
```

---

### Step 5: Verify Runtime Values

**After Deployment:**
1. Navigate to: `https://app.restocked.now`
2. Open: Browser DevTools (F12)
3. Go to: Console tab
4. Look for: "🔍 [apiClient] RUNTIME ENVIRONMENT DIAGNOSTIC"
5. Verify:
   - ✅ `Final API_BASE_URL value: https://restockednew-production.up.railway.app`
   - ✅ `import.meta.env.VITE_API_BASE_URL: https://restockednew-production.up.railway.app`
   - ✅ No localhost in output
   - ✅ Typo variable not found

**Expected Console Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [apiClient] RUNTIME ENVIRONMENT DIAGNOSTIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Final API_BASE_URL value: https://restockednew-production.up.railway.app
📍 import.meta.env.VITE_API_BASE_URL: https://restockednew-production.up.railway.app

📋 VITE_* environment variables only:
   VITE_API_BASE_URL = https://restockednew-production.up.railway.app

⚠️  Checking for typo variable:
   import.meta.env.VITE_APT_BASE_URL = (not found - good!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Step 6: Verify Network Requests

**Test API Calls:**
1. Open: Browser DevTools → Network tab
2. Navigate to: `https://app.restocked.now/login`
3. Attempt: Login with test credentials
4. Check: Network requests
5. Verify:
   - ✅ Requests go to: `https://restockednew-production.up.railway.app`
   - ❌ Requests do NOT go to: `http://localhost:3000`
   - ✅ No CORS errors
   - ✅ No mixed content errors
   - ✅ Login succeeds

**Expected Network Request:**
```
POST https://restockednew-production.up.railway.app/auth/login
Status: 200 OK
Response: { user: {...}, token: "..." }
```

---

## ✅ DEPLOYMENT SAFETY CHECKLIST

### Pre-Deployment Checklist

- [ ] **Environment Variables Verified:**
  - [ ] `VITE_APT_BASE_URL` deleted (if exists)
  - [ ] `VITE_API_BASE_URL` exists
  - [ ] Value: `https://restockednew-production.up.railway.app`
  - [ ] Applied to Production environment
  - [ ] Applied to Preview environment (optional)
  - [ ] Applied to Development environment (optional)

- [ ] **Build Cache Cleared:**
  - [ ] Vercel build cache cleared
  - [ ] Local `dist/` removed (if testing locally)
  - [ ] Local `node_modules/.vite` cleared (if testing locally)

- [ ] **Code Ready:**
  - [ ] Build-time diagnostic logging active
  - [ ] Runtime diagnostic logging active
  - [ ] Validation plugin active
  - [ ] All changes committed and pushed

---

### During Deployment Checklist

- [ ] **Build Started:**
  - [ ] Deployment triggered
  - [ ] Build cache NOT used (unchecked)
  - [ ] Build logs accessible

- [ ] **Build Logs Verified:**
  - [ ] Diagnostic output appears
  - [ ] `VITE_API_BASE_URL` shows correct value
  - [ ] Typo variable not found
  - [ ] Validation passes
  - [ ] No errors about missing variable
  - [ ] No localhost in logs

- [ ] **Build Completed:**
  - [ ] Build succeeds
  - [ ] Deployment succeeds
  - [ ] No build errors

---

### Post-Deployment Checklist

- [ ] **Runtime Verification:**
  - [ ] App loads: `https://app.restocked.now`
  - [ ] Console diagnostic shows Railway URL
  - [ ] No localhost in console output
  - [ ] Typo variable not found

- [ ] **Network Verification:**
  - [ ] Network requests go to Railway backend
  - [ ] No requests to localhost
  - [ ] No CORS errors
  - [ ] No mixed content errors

- [ ] **Functionality Verification:**
  - [ ] Login page loads
  - [ ] Login succeeds
  - [ ] Dashboard loads after login
  - [ ] API calls succeed
  - [ ] No 401/403 errors

- [ ] **Bundle Verification (Optional):**
  - [ ] Download production bundle
  - [ ] Extract API URL from bundle
  - [ ] Verify Railway URL hardcoded
  - [ ] Verify no localhost in bundle

---

### Emergency Rollback Checklist

If deployment fails or issues occur:

- [ ] **Immediate Actions:**
  - [ ] Check build logs for errors
  - [ ] Check runtime console for errors
  - [ ] Verify environment variables in Vercel
  - [ ] Check Network tab for request failures

- [ ] **Rollback Steps:**
  - [ ] Go to: Vercel Dashboard → Deployments
  - [ ] Find: Previous working deployment
  - [ ] Click: "..." → "Promote to Production"
  - [ ] Verify: Previous deployment works

- [ ] **Fix and Redeploy:**
  - [ ] Fix identified issue
  - [ ] Verify environment variables
  - [ ] Clear build cache
  - [ ] Trigger fresh deployment

---

## 🚀 FINAL STEP-BY-STEP SEQUENCE

### Complete Fix Sequence for Login on https://app.restocked.now

---

### Phase 1: Preparation (5 minutes)

**Step 1.1: Verify Current State**
1. Go to: `https://app.restocked.now`
2. Open: Browser DevTools → Console
3. Note: Current API_BASE_URL value (likely localhost)
4. Note: Any errors in console

**Step 1.2: Check Vercel Environment Variables**
1. Go to: Vercel Dashboard → Project → Settings → Environment Variables
2. List: All `VITE_*` variables
3. Note: Which variables exist
4. Note: Current values

---

### Phase 2: Fix Environment Variables (3 minutes)

**Step 2.1: Delete Typo Variable**
1. Find: `VITE_APT_BASE_URL` (if exists)
2. Click: Delete/Remove
3. Confirm: Deletion

**Step 2.2: Add/Verify Correct Variable**
1. Check: `VITE_API_BASE_URL` exists
2. If missing: Click "Add New"
3. Enter:
   - **Name:** `VITE_API_BASE_URL` (exact spelling)
   - **Value:** `https://restockednew-production.up.railway.app`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development
4. Click: Save
5. Wait: For confirmation

**Step 2.3: Double-Check**
1. Verify: Only `VITE_API_BASE_URL` exists (not `VITE_APT_BASE_URL`)
2. Verify: Value is correct Railway URL
3. Verify: Production environment is selected

---

### Phase 3: Clear Cache and Redeploy (5 minutes)

**Step 3.1: Trigger Fresh Deployment**
1. Go to: Vercel Dashboard → Deployments
2. Find: Latest deployment
3. Click: "..." (three dots)
4. Click: "Redeploy"
5. **CRITICAL:** Uncheck "Use existing Build Cache"
6. Click: "Redeploy"
7. Wait: 2-5 minutes for build

**Step 3.2: Monitor Build Logs**
1. Click: "View Build Logs" (during build)
2. Search for: "🔍 Build-time Environment Variable Diagnostic"
3. Verify:
   - ✅ `VITE_API_BASE_URL = https://restockednew-production.up.railway.app`
   - ✅ `VITE_APT_BASE_URL = (not found - good!)`
   - ✅ Validation passes
4. Wait: For build to complete

---

### Phase 4: Verify Deployment (5 minutes)

**Step 4.1: Check Runtime Diagnostic**
1. Navigate to: `https://app.restocked.now`
2. Open: Browser DevTools → Console
3. Look for: "🔍 [apiClient] RUNTIME ENVIRONMENT DIAGNOSTIC"
4. Verify:
   - ✅ `Final API_BASE_URL value: https://restockednew-production.up.railway.app`
   - ✅ No localhost in output
   - ✅ Typo variable not found

**Step 4.2: Test Network Requests**
1. Open: Browser DevTools → Network tab
2. Navigate to: `https://app.restocked.now/login`
3. Verify: No requests to localhost
4. Verify: Requests go to Railway backend (if any)

**Step 4.3: Test Login**
1. Enter: Test email and password
2. Click: "Sign in"
3. Check: Network tab
4. Verify:
   - ✅ Request goes to: `https://restockednew-production.up.railway.app/auth/login`
   - ✅ Status: 200 OK (or appropriate response)
   - ✅ No CORS errors
   - ✅ No mixed content errors

---

### Phase 5: Final Verification (3 minutes)

**Step 5.1: Verify Login Success**
1. If login succeeds:
   - ✅ Redirect to dashboard
   - ✅ User info displayed
   - ✅ No errors in console
2. If login fails:
   - Check: Network tab for error details
   - Check: Console for error messages
   - Check: Backend logs (Railway)

**Step 5.2: Verify Dashboard**
1. After login, verify:
   - ✅ Dashboard loads
   - ✅ API calls succeed
   - ✅ No 401/403 errors
   - ✅ Data displays correctly

**Step 5.3: Clean Up Diagnostic Logging (Optional)**
1. After confirming fix works:
   - Remove or reduce console.log statements (optional)
   - Keep build-time validation (recommended)
   - Commit and push changes

---

## 📊 VERIFICATION SUMMARY

### Success Indicators

✅ **Build Logs:**
- `VITE_API_BASE_URL = https://restockednew-production.up.railway.app`
- `✅ VITE_API_BASE_URL validated successfully`
- No localhost in logs

✅ **Runtime Console:**
- `Final API_BASE_URL value: https://restockednew-production.up.railway.app`
- No localhost in output
- Typo variable not found

✅ **Network Requests:**
- Requests go to: `https://restockednew-production.up.railway.app`
- No requests to: `http://localhost:3000`
- No CORS errors
- No mixed content errors

✅ **Functionality:**
- Login succeeds
- Dashboard loads
- API calls succeed
- No authentication errors

---

### Failure Indicators

❌ **Build Logs:**
- `VITE_API_BASE_URL = (undefined)`
- `VITE_API_BASE_URL = http://localhost:3000`
- Validation fails
- Build errors

❌ **Runtime Console:**
- `Final API_BASE_URL value: http://localhost:3000`
- Typo variable found
- Missing variable errors

❌ **Network Requests:**
- Requests go to: `http://localhost:3000`
- CORS errors
- Mixed content errors
- 502 Bad Gateway errors

❌ **Functionality:**
- Login fails
- Dashboard doesn't load
- API calls fail
- 401/403 errors

---

## 🔧 TROUBLESHOOTING

### Issue: Build Still Uses Localhost

**Possible Causes:**
1. Build cache not cleared
2. Environment variable not set correctly
3. Typo variable still exists
4. Variable not applied to Production environment

**Solutions:**
1. Clear build cache and redeploy
2. Double-check variable name and value
3. Delete typo variable
4. Verify Production environment selected

---

### Issue: Runtime Still Shows Localhost

**Possible Causes:**
1. Old bundle still deployed
2. Browser cache
3. CDN cache

**Solutions:**
1. Wait for new deployment to propagate
2. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
3. Clear browser cache
4. Wait for CDN cache to expire (5-10 minutes)

---

### Issue: Build Fails Validation

**Possible Causes:**
1. Variable missing
2. Variable set to localhost
3. Variable empty string

**Solutions:**
1. Add `VITE_API_BASE_URL` in Vercel
2. Set value to Railway URL
3. Ensure value is not empty

---

## 📝 NOTES

- **Diagnostic Logging:** Can be removed after confirming fix works
- **Build-Time Validation:** Should remain active to prevent future issues
- **Runtime Logging:** Can be reduced to warnings only after fix confirmed
- **Cache Clearing:** May need to be done manually if automatic doesn't work
- **Deployment Time:** Typically 2-5 minutes, but can vary

---

**Diagnostic Complete:** December 4, 2025  
**Status:** Ready for deployment  
**Confidence:** 100% - All diagnostic tools in place



