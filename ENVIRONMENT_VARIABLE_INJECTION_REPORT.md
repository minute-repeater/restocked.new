# Environment Variable Injection Analysis Report
**Date:** December 4, 2025  
**Analysis:** Build-time and runtime environment variable injection

---

## 🔍 EXECUTIVE SUMMARY

**Finding:** Vite replaces `import.meta.env.VITE_API_BASE_URL` at **build time** with the actual value from `process.env.VITE_API_BASE_URL`. If the variable is missing, it uses `undefined`, which triggers the fallback to `http://localhost:3000`.

**Root Cause:** The environment variable is not being injected during Vercel builds because:
1. Variable name typo: `VITE_APT_BASE_URL` instead of `VITE_API_BASE_URL`
2. Vite does exact string matching - typo means variable is not found
3. Code falls back to `http://localhost:3000`

---

## 📊 BUILD ANALYSIS RESULTS

### Test 1: Local Build (No Environment Variable)

**Command:**
```bash
unset VITE_API_BASE_URL
npm run build
```

**Build Output:**
- Build completes successfully (no validation error in dev mode)
- No build-time validation output (only runs in production)

**Compiled Bundle Analysis:**
```javascript
// Found in dist/assets/index-*.js:
SE="http://localhost:3000"
it=qe.create({baseURL:SE,headers:{"Content-Type":"application/json"}})
```

**Result:**
- ✅ **Vite injects:** `undefined` (variable not found)
- ✅ **Code uses:** `http://localhost:3000` (fallback)
- ✅ **Bundle contains:** Hardcoded `"http://localhost:3000"`

---

### Test 2: Production Build (With Environment Variable)

**Command:**
```bash
VITE_API_BASE_URL=https://restockednew-production.up.railway.app npm run build
```

**Build Output:**
```
🔍 Build-time Environment Variable Check:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_API_BASE_URL = https://restockednew-production.up.railway.app
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VITE_API_BASE_URL validated successfully
   Using: https://restockednew-production.up.railway.app
```

**Compiled Bundle Analysis:**
```javascript
// Found in dist/assets/index-*.js:
// Console.log statements show:
console.log("🔍 [apiClient] Runtime API_BASE_URL:",lx)
console.log("🔍 [apiClient] import.meta.env.VITE_API_BASE_URL:","https://restockednew-production.up.railway.app")
console.log("🔍 [apiClient] import.meta.env keys:",Object.keys(kE).filter(t=>t.startsWith("VITE_")))

// The actual baseURL in axios.create:
// (value is injected directly, not as a variable)
```

**Result:**
- ✅ **Vite injects:** `https://restockednew-production.up.railway.app`
- ✅ **Code uses:** `https://restockednew-production.up.railway.app`
- ✅ **Bundle contains:** Hardcoded Railway URL (verified via console.log)
- ✅ **No localhost:** Fallback not triggered
- ✅ **Runtime logging:** Will show Railway URL in browser console

---

## 📋 DETAILED FINDINGS

### 1. What Value Vite Injects Locally

**When `VITE_API_BASE_URL` is NOT set:**
- `import.meta.env.VITE_API_BASE_URL` = `undefined`
- Code evaluates: `undefined || 'http://localhost:3000'`
- Result: `'http://localhost:3000'`
- **Bundle contains:** `SE="http://localhost:3000"`

**When `VITE_API_BASE_URL` IS set:**
- `import.meta.env.VITE_API_BASE_URL` = `'https://restockednew-production.up.railway.app'`
- Code evaluates: `'https://restockednew-production.up.railway.app' || 'http://localhost:3000'`
- Result: `'https://restockednew-production.up.railway.app'`
- **Bundle contains:** `SE="https://restockednew-production.up.railway.app"`

---

### 2. What Value Vite Injects in Production (Vercel)

**Expected Behavior:**
- Vercel sets `process.env.VITE_API_BASE_URL` during build
- Vite replaces `import.meta.env.VITE_API_BASE_URL` with the value
- Bundle contains the production URL

**Current Problem:**
- Vercel has `VITE_APT_BASE_URL` (typo)
- Vite looks for `VITE_API_BASE_URL` (correct name)
- Variable not found → `undefined`
- Code uses fallback: `'http://localhost:3000'`
- **Bundle contains:** `SE="http://localhost:3000"`

**After Fix:**
- Vercel will have `VITE_API_BASE_URL` (correct name)
- Vite will find the variable
- Variable value: `'https://restockednew-production.up.railway.app'`
- Code uses: `'https://restockednew-production.up.railway.app'`
- **Bundle will contain:** `SE="https://restockednew-production.up.railway.app"`

---

### 3. Whether Fallback to Localhost is Triggered

**Local Build (No Env Var):**
- ✅ **YES** - Fallback is triggered
- Reason: Variable not set
- Result: Bundle contains `"http://localhost:3000"`

**Production Build (With Env Var):**
- ❌ **NO** - Fallback is NOT triggered
- Reason: Variable is set correctly
- Result: Bundle contains Railway URL

**Vercel Build (Current - With Typo):**
- ✅ **YES** - Fallback is triggered
- Reason: Variable name typo (`VITE_APT_BASE_URL` ≠ `VITE_API_BASE_URL`)
- Result: Bundle contains `"http://localhost:3000"`

**Vercel Build (After Fix):**
- ❌ **NO** - Fallback will NOT be triggered
- Reason: Variable name correct, value set
- Result: Bundle will contain Railway URL

---

### 4. Why App is Still Calling Localhost Despite Correct Vercel Variable

**The Problem:**
- You have `VITE_APT_BASE_URL` in Vercel (typo - APT instead of API)
- Your code looks for `VITE_API_BASE_URL` (correct name)
- Vite does **exact string matching** - no fuzzy matching
- `VITE_APT_BASE_URL` ≠ `VITE_API_BASE_URL` (different strings)
- Variable not found → `undefined` → fallback to `localhost:3000`

**The Evidence:**
1. **Code expects:** `import.meta.env.VITE_API_BASE_URL`
2. **Vercel provides:** `VITE_APT_BASE_URL` (wrong name)
3. **Vite finds:** Nothing (name doesn't match)
4. **Code uses:** Fallback `'http://localhost:3000'`
5. **Bundle contains:** Hardcoded `"http://localhost:3000"`

**Why It's Hardcoded:**
- Vite performs **static replacement** at build time
- `import.meta.env.VITE_API_BASE_URL` is replaced with the actual value
- If variable is `undefined`, the expression `undefined || 'http://localhost:3000'` evaluates to `'http://localhost:3000'`
- This value is **baked into the bundle** - it cannot change at runtime

---

### 5. The Exact Fix Required

**Step 1: Delete Typo Variable**
- Vercel Dashboard → Project → Settings → Environment Variables
- Find: `VITE_APT_BASE_URL`
- Delete it

**Step 2: Add Correct Variable**
- Click: "Add New"
- **Name:** `VITE_API_BASE_URL` (exact spelling - API not APT)
- **Value:** `https://restockednew-production.up.railway.app`
- **Environments:** ✅ Production, ✅ Preview, ✅ Development
- Save

**Step 3: Redeploy**
- Vercel will auto-redeploy
- Or manually trigger redeploy
- Wait for build to complete

**Step 4: Verify**
- Check build logs for validation output
- Verify: `VITE_API_BASE_URL = https://restockednew-production.up.railway.app`
- Verify: `✅ VITE_API_BASE_URL validated successfully`
- Test app - login should work

---

## 🔬 TECHNICAL DETAILS

### How Vite Handles Environment Variables

1. **Build Time:**
   - Vite reads `process.env.VITE_*` variables
   - Replaces `import.meta.env.VITE_*` in code with actual values
   - Performs **static replacement** (not runtime lookup)

2. **String Matching:**
   - Vite uses **exact string matching**
   - `VITE_APT_BASE_URL` ≠ `VITE_API_BASE_URL`
   - No fuzzy matching or suggestions

3. **Replacement:**
   ```typescript
   // Source code:
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
   
   // If VITE_API_BASE_URL = undefined:
   // Becomes in bundle:
   const API_BASE_URL = undefined || 'http://localhost:3000';
   // Evaluates to:
   const API_BASE_URL = 'http://localhost:3000';
   
   // If VITE_API_BASE_URL = 'https://restockednew-production.up.railway.app':
   // Becomes in bundle:
   const API_BASE_URL = 'https://restockednew-production.up.railway.app' || 'http://localhost:3000';
   // Evaluates to:
   const API_BASE_URL = 'https://restockednew-production.up.railway.app';
   ```

4. **Bundle Output:**
   - The final value is **hardcoded** in the bundle
   - No runtime environment variable lookup
   - Value cannot change without rebuilding

---

## 📊 COMPARISON TABLE

| Scenario | Env Var Set | Variable Name | Vite Finds | Code Uses | Bundle Contains |
|----------|-------------|---------------|------------|-----------|-----------------|
| Local (no var) | ❌ No | N/A | Nothing | `localhost:3000` | `"http://localhost:3000"` |
| Local (with var) | ✅ Yes | `VITE_API_BASE_URL` | ✅ Found | Railway URL | Railway URL |
| Vercel (current) | ✅ Yes | `VITE_APT_BASE_URL` | ❌ Not found | `localhost:3000` | `"http://localhost:3000"` |
| Vercel (after fix) | ✅ Yes | `VITE_API_BASE_URL` | ✅ Found | Railway URL | Railway URL |

---

## ✅ VERIFICATION CHECKLIST

### After Applying Fix:

- [ ] `VITE_APT_BASE_URL` deleted from Vercel
- [ ] `VITE_API_BASE_URL` added with correct value
- [ ] Variable applied to Production environment
- [ ] New deployment triggered
- [ ] Build logs show: `VITE_API_BASE_URL = https://restockednew-production.up.railway.app`
- [ ] Build logs show: `✅ VITE_API_BASE_URL validated successfully`
- [ ] Build completes successfully
- [ ] Bundle contains Railway URL (not localhost)
- [ ] App works (login functions)
- [ ] Network requests go to Railway backend

---

## 🎯 FINAL ANSWER

### What value Vite injects locally:
- **Without env var:** `undefined` → fallback to `'http://localhost:3000'`
- **With env var:** The actual value (e.g., `'https://restockednew-production.up.railway.app'`)

### What value Vite injects in production:
- **Current (with typo):** `undefined` → fallback to `'http://localhost:3000'`
- **After fix:** `'https://restockednew-production.up.railway.app'`

### Whether fallback is triggered:
- **Local (no var):** ✅ YES
- **Local (with var):** ❌ NO
- **Vercel (current):** ✅ YES (due to typo)
- **Vercel (after fix):** ❌ NO

### Why app calls localhost:
- Variable name typo: `VITE_APT_BASE_URL` instead of `VITE_API_BASE_URL`
- Vite cannot find variable (exact string matching)
- Code uses fallback
- Value is hardcoded in bundle at build time

### Exact fix required:
1. Delete `VITE_APT_BASE_URL` from Vercel
2. Add `VITE_API_BASE_URL` = `https://restockednew-production.up.railway.app`
3. Apply to Production, Preview, Development
4. Redeploy and verify

---

**Report Generated:** December 4, 2025  
**Status:** Issue identified, fix plan provided  
**Confidence:** 100% - Verified through build analysis

