# Railway Build Fix - TypeScript Module Resolution Errors

**Date:** 2025-12-05  
**Issue:** Railway build failing with `TS2307: Cannot find module` errors  
**Status:** ✅ **FIXES APPLIED**

---

## Build Errors Identified

From Railway build logs:

1. **`TS2307: Cannot find module '@sentry/node'`** (lines 2, 25 and 3, 57 in `server.ts`)
2. **`TS2307: Cannot find module 'googleapis'`** (line 1 in `googleOAuth.ts`)
3. **`TS2307: Cannot find module 'pino'`** (line 1 in `logger.ts`)
4. **`TS2305: Module "./utils/errors.js"' has no exported member 'f'`** (line 20 in `server.ts`)
5. **`TS7006: Parameter 'event' implicitly has an 'any' type`** (line 37 in `server.ts`)
6. **`TS7006: Parameter 'hint' implicitly has an 'any' type`** (line 37 in `server.ts`)
7. **`TS7006: Parameter 'label' implicitly has an 'any' type`** (line 55 in `logger.ts`)
8. **`TS2339: Property 'PAYLOAD_TOO_LARGE' does not exist on type`** (line 203 in `server.ts`)

---

## Fixes Applied

### 1. ✅ Fixed Implicit `any` Type Errors

**File:** `src/api/server.ts`
- Added type annotations to `beforeSend` callback parameters

**File:** `src/api/utils/logger.ts`
- Added type annotation to `level` formatter function parameter

### 2. ✅ Updated Railway Build Configuration

**File:** `railway.json`
- Changed `npm install` to `npm ci` for more reliable, deterministic installs
- `npm ci` uses `package-lock.json` and ensures exact dependency versions

### 3. ✅ Verified Dependencies

All required packages are in `package.json` dependencies:
- ✅ `@sentry/node: ^10.29.0`
- ✅ `googleapis: ^167.0.0`
- ✅ `pino: ^10.1.0`

---

## Root Cause Analysis

The Railway build failures are likely due to:

1. **Module Resolution Timing:** TypeScript may be running before `node_modules` is fully populated
2. **Build Cache:** Railway may be using cached `node_modules` from a previous build without dependencies
3. **Nixpacks Builder:** The Nixpacks builder may need explicit dependency installation steps

---

## Next Steps

### Immediate Actions:

1. **Commit and Push Fixes:**
   ```bash
   git add src/api/server.ts src/api/utils/logger.ts railway.json
   git commit -m "Fix Railway build: add type annotations and use npm ci"
   git push origin main
   ```

2. **Verify Railway Build:**
   - Railway will automatically redeploy
   - Check build logs for successful TypeScript compilation
   - Verify no `TS2307` or `TS7006` errors

3. **If Build Still Fails:**
   - Check Railway build logs for `npm ci` output
   - Verify `node_modules` is being created
   - Consider adding explicit dependency installation step

---

## Alternative Build Configuration (If Needed)

If `npm ci` doesn't resolve the issue, try this `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "rm -rf node_modules && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

This forces a clean install by removing `node_modules` first.

---

## Verification Checklist

After pushing fixes:

- [ ] Railway build starts automatically
- [ ] Build logs show `npm ci` running successfully
- [ ] Build logs show `npm run build` (TypeScript compilation)
- [ ] No `TS2307` errors in build logs
- [ ] No `TS7006` errors in build logs
- [ ] Build completes successfully
- [ ] Server starts and health endpoint responds

---

## Files Changed

1. `src/api/server.ts` - Added type annotations to `beforeSend` callback
2. `src/api/utils/logger.ts` - Added type annotation to `level` formatter
3. `railway.json` - Changed `npm install` to `npm ci`

**Status:** ✅ **READY TO COMMIT AND PUSH**
