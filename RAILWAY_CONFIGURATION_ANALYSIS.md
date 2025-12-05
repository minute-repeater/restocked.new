image.png# Railway Configuration Analysis & Fix Guide

**Date:** 2025-12-05  
**Issue:** Railway building wrong source code  
**Local Commit:** `83ec7f1` (Fix Railway build: add missing logger.ts file)  
**Remote Commit:** `83ec7f1` (matches local)

---

## 1. Git Branch Analysis

### Current Git Status

**Local Branch:**
```bash
* main
```

**Remote Branches:**
```bash
remotes/origin/main → 83ec7f1597014ce473eff144ba595ca8750a7122
```

**Repository:**
```
https://github.com/minute-repeater/restocked.new.git
```

**Latest Commit:**
```
83ec7f1 Fix Railway build: add missing logger.ts file
```

### ✅ ANSWER TO QUESTION 1: Which Git Branch is Railway Using?

**Expected:** Railway should be using `main` branch  
**Verification Required:** Check Railway Dashboard → Service → Settings → Source

**To Verify:**
1. Go to Railway Dashboard
2. Select your service (likely named "restockednew-production" or similar)
3. Go to **Settings** → **Source**
4. Check **Branch** field - should show `main`

**If NOT `main`:**
- Change branch to `main`
- Railway will automatically redeploy

---

## 2. Build Folder Analysis

### Current Railway Configuration

**File:** `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Missing Configuration:**
- ❌ No `rootDirectory` specified
- ❌ No `watchPatterns` specified
- ❌ No build cache settings

### ✅ ANSWER TO QUESTION 2: Which Folder is Railway Building?

**Expected:** Railway should build from **project root** (`/`)

**Current Configuration:**
- `railway.json` does NOT specify `rootDirectory`
- Railway defaults to project root when `rootDirectory` is not set
- Build command runs from root: `npm install && npm run build`
- Start command runs from root: `npm start`

**File Structure Railway Should See:**
```
/
├── package.json          ← Railway reads this
├── tsconfig.json         ← Railway uses this
├── railway.json          ← Railway reads this
├── src/                  ← Source code
│   ├── api/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   └── auth.ts
│   │   └── utils/
│   │       ├── logger.ts    ← Should be here
│   │       ├── errors.ts
│   │       ├── googleOAuth.ts
│   │       └── appleOAuth.ts
│   └── ...
└── dist/                 ← Build output (created during build)
```

**Verification Required:** Check Railway Dashboard → Service → Settings → Build

**To Verify:**
1. Go to Railway Dashboard
2. Select your service
3. Go to **Settings** → **Build**
4. Check **Root Directory** field:
   - Should be empty (`/`) or explicitly set to `/`
   - Should NOT be `/api`, `/backend`, `/src`, or any subdirectory

**If Root Directory is Wrong:**
- Set it to `/` (empty or `/`)
- Railway will redeploy with correct context

---

## 3. Build Cache Analysis

### Railway Build Caching

Railway uses build caching to speed up deployments:
- **Dependency Cache:** Caches `node_modules` between builds
- **Build Cache:** May cache intermediate build artifacts
- **Git Cache:** May cache git repository state

### ✅ ANSWER TO QUESTION 3: Is Railway Using Cached Commit?

**Possible Issues:**
1. **Git Cache:** Railway may have cached an old commit
2. **Build Cache:** Railway may be using cached `dist/` from old build
3. **Dependency Cache:** Railway may be using cached `node_modules` without latest code

**Signs of Cache Issues:**
- Build logs show old commit hash
- Build completes too quickly (< 30 seconds)
- Files that exist locally don't exist in Railway build
- Routes that work locally don't work on Railway

**Verification:**
Check Railway Dashboard → Deployments → Latest → View Logs

Look for:
```
Installing dependencies...
Building TypeScript...
```

If build is too fast or shows old commit, cache may be the issue.

---

## 4. Force Railway to Pull Latest Commit

### ✅ ANSWER TO QUESTION 4: Force Latest Commit Pull

**Method 1: Manual Redeploy (Recommended)**
1. Go to Railway Dashboard
2. Select your service
3. Go to **Deployments** tab
4. Click **"Redeploy"** or **"Deploy Latest"**
5. Railway will pull latest commit from GitHub

**Method 2: Trigger via Railway CLI**
```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Trigger redeploy
railway up
```

**Method 3: Push Empty Commit (Force Trigger)**
```bash
git commit --allow-empty -m "Force Railway redeploy"
git push origin main
```

**Method 4: Update Railway Service Settings**
1. Go to Railway Dashboard
2. Select your service
3. Go to **Settings** → **Source**
4. Click **"Disconnect"** then **"Connect"** again
5. Railway will re-sync with GitHub

---

## 5. Disable Build Caching

### ✅ ANSWER TO QUESTION 5: Disable Build Cache

**Update `railway.json` to Disable Caching:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build",
    "watchPatterns": []
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**However, Railway doesn't have a direct "disable cache" option in `railway.json`.**

**Alternative Methods to Force Fresh Build:**

**Method 1: Clear Build Cache via Railway Dashboard**
1. Go to Railway Dashboard
2. Select your service
3. Go to **Settings** → **Build**
4. Look for **"Clear Build Cache"** or **"Reset Build"** option
5. If available, click it

**Method 2: Modify Build Command to Clear Cache**
Update `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "rm -rf node_modules dist && npm install && npm run build"
  }
}
```

**Method 3: Add Cache-Busting Environment Variable**
1. Go to Railway Dashboard
2. Select your service
3. Go to **Variables**
4. Add variable: `RAILWAY_BUILD_ID` = `$(date +%s)` (or any unique value)
5. Railway will treat this as a new build context

**Method 4: Use Railway CLI to Clear Cache**
```bash
railway variables set RAILWAY_FORCE_REBUILD=$(date +%s)
railway up
```

---

## 6. Verify File Paths

### ✅ ANSWER TO QUESTION 6: Verify Railway Reads Files from Correct Paths

**Expected File Locations Railway Should Read:**

**Source Files (from `src/`):**
```
src/api/server.ts                    → dist/api/server.js
src/api/routes/auth.ts               → dist/api/routes/auth.js
src/api/utils/logger.ts              → dist/api/utils/logger.js
src/api/utils/errors.ts              → dist/api/utils/errors.js
src/api/utils/googleOAuth.ts         → dist/api/utils/googleOAuth.js
src/api/utils/appleOAuth.ts          → dist/api/utils/appleOAuth.js
```

**Configuration Files (from root):**
```
package.json                         → Read by npm
tsconfig.json                        → Read by tsc
railway.json                         → Read by Railway
```

**Build Output (created in `dist/`):**
```
dist/api/server.js                   → Entry point
dist/api/routes/auth.js              → Auth routes
dist/api/utils/logger.js             → Logger utility
dist/api/utils/errors.js             → Error utilities
dist/api/utils/googleOAuth.js        → Google OAuth
dist/api/utils/appleOAuth.js         → Apple OAuth
dist/db/runMigrationsAndStart.js     → Server startup
```

**Verification Commands (Run Locally to Confirm):**
```bash
# Verify source files exist
test -f src/api/server.ts && echo "✅ server.ts exists"
test -f src/api/utils/logger.ts && echo "✅ logger.ts exists"
test -f src/api/utils/googleOAuth.ts && echo "✅ googleOAuth.ts exists"
test -f src/api/utils/errors.ts && echo "✅ errors.ts exists"

# Verify build output
npm run build
test -f dist/api/server.js && echo "✅ server.js built"
test -f dist/api/utils/logger.js && echo "✅ logger.js built"
test -f dist/api/utils/googleOAuth.js && echo "✅ googleOAuth.js built"
test -f dist/api/utils/errors.js && echo "✅ errors.js built"
```

**Verify in Railway Build Logs:**
1. Go to Railway Dashboard
2. Select your service
3. Go to **Deployments** → **Latest** → **View Logs**
4. Look for build output:
   ```
   Building TypeScript...
   TSFILE: dist/api/utils/logger.js
   TSFILE: dist/api/utils/errors.js
   TSFILE: dist/api/utils/googleOAuth.js
   TSFILE: dist/api/server.js
   TSFILE: dist/api/routes/auth.js
   ```

**If Files Missing in Railway Build:**
- Check Root Directory setting (should be `/`)
- Check if files are committed to git (`git ls-files src/api/utils/logger.ts`)
- Check Railway build logs for TypeScript errors
- Verify `tsconfig.json` includes correct paths

---

## 7. Configuration Updates Required

### ✅ ANSWER TO QUESTION 7: Commands/Config Updates for Railway

**Update `railway.json` to Ensure Fresh Builds:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npm run build",
    "watchPatterns": []
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Changes:**
- `npm ci` instead of `npm install` (cleaner, more deterministic)
- `watchPatterns: []` (explicitly empty, though Railway may ignore this)

**Railway Dashboard Settings to Verify:**

1. **Service → Settings → Source:**
   - **Repository:** `minute-repeater/restocked.new`
   - **Branch:** `main`
   - **Auto Deploy:** Enabled

2. **Service → Settings → Build:**
   - **Root Directory:** `/` (empty or `/`)
   - **Build Command:** `npm install && npm run build` (or use `railway.json`)
   - **Start Command:** `npm start` (or use `railway.json`)

3. **Service → Settings → Variables:**
   - Verify all required env vars are set
   - No cache-related variables interfering

**Commands to Run Locally (Before Pushing):**

```bash
# 1. Verify all files are committed
git status
git add -A
git commit -m "Ensure all files committed"

# 2. Verify files exist in git
git ls-files src/api/utils/logger.ts
git ls-files src/api/utils/googleOAuth.ts
git ls-files src/api/utils/errors.ts
git ls-files src/api/server.ts

# 3. Verify build works locally
npm run build
ls -la dist/api/utils/logger.js
ls -la dist/api/utils/googleOAuth.js
ls -la dist/api/utils/errors.js
ls -la dist/api/server.js

# 4. Push to trigger Railway
git push origin main
```

**Railway CLI Commands (After Railway CLI Setup):**

```bash
# Link to project
railway link

# Check current service status
railway status

# View recent deployments
railway logs --tail 100

# Trigger manual redeploy
railway up

# Check environment variables
railway variables

# Get service URL
railway domain
```

---

## 8. Diagnostic Checklist

### Pre-Deployment Verification

- [ ] **Git Branch:** Local `main` matches `origin/main`
- [ ] **Latest Commit:** `83ec7f1` is latest on both local and remote
- [ ] **Files Committed:** All source files are in git (`git ls-files`)
- [ ] **Local Build:** `npm run build` succeeds locally
- [ ] **Build Output:** `dist/` contains all required files
- [ ] **Railway Branch:** Railway service is set to `main` branch
- [ ] **Railway Root:** Railway Root Directory is `/` (not subdirectory)
- [ ] **Railway Config:** `railway.json` is in repository root
- [ ] **Railway Cache:** Consider clearing cache or using cache-busting

### Post-Deployment Verification

- [ ] **Build Logs:** Railway build logs show latest commit hash
- [ ] **Build Success:** Railway build completes without errors
- [ ] **File Presence:** Railway build logs show `logger.js` being emitted
- [ ] **Server Starts:** Railway logs show "Server running"
- [ ] **Routes Work:** OAuth endpoints respond (not 404)
- [ ] **Health Check:** `/health` endpoint returns correct response

---

## 9. Immediate Action Items

### Step 1: Verify Railway Configuration

1. Go to Railway Dashboard
2. Select your service
3. Check **Settings → Source:**
   - Branch: Should be `main`
   - Repository: Should be `minute-repeater/restocked.new`
4. Check **Settings → Build:**
   - Root Directory: Should be `/` (empty)
   - Build Command: Should match `railway.json` or be `npm install && npm run build`

### Step 2: Force Fresh Build

**Option A: Manual Redeploy**
- Railway Dashboard → Deployments → Redeploy

**Option B: Clear Cache and Redeploy**
- Update `railway.json` buildCommand to: `rm -rf node_modules dist && npm install && npm run build`
- Commit and push
- Railway will rebuild from scratch

**Option C: Add Cache-Busting Variable**
- Railway Dashboard → Variables
- Add: `RAILWAY_BUILD_ID` = `$(date +%s)`
- Trigger redeploy

### Step 3: Verify Build Output

After redeploy, check Railway build logs for:
```
TSFILE: dist/api/utils/logger.js
TSFILE: dist/api/utils/errors.js
TSFILE: dist/api/utils/googleOAuth.js
TSFILE: dist/api/server.js
TSFILE: dist/api/routes/auth.js
```

### Step 4: Test Endpoints

After deployment completes:
```bash
curl -H "Origin: https://app.restocked.now" \
     https://restockednew-production.up.railway.app/auth/google/config-status

curl -H "Origin: https://app.restocked.now" \
     https://restockednew-production.up.railway.app/auth/google/url
```

---

## 10. Summary

**Current Status:**
- ✅ Local code is correct (commit `83ec7f1`)
- ✅ Remote code matches local
- ✅ All files exist and are committed
- ✅ Local build succeeds
- ❓ Railway may be using wrong branch, root directory, or cached build

**Required Actions:**
1. Verify Railway is using `main` branch
2. Verify Railway Root Directory is `/`
3. Force Railway to pull latest commit (redeploy)
4. Consider disabling/clearing build cache
5. Verify Railway build logs show correct files being built

**Expected Result:**
After fixes, Railway should:
- Build from latest commit (`83ec7f1`)
- Build from project root (`/`)
- Emit all files including `logger.js`
- Register all routes correctly
- OAuth endpoints should work
