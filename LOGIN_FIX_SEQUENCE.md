# Complete Login Fix Sequence
**Target:** Get login working on https://app.restocked.now  
**Date:** December 4, 2025

---

## 🎯 QUICK REFERENCE

**Problem:** Login fails because frontend calls `http://localhost:3000` instead of Railway backend.

**Root Cause:** Vercel environment variable typo (`VITE_APT_BASE_URL` instead of `VITE_API_BASE_URL`).

**Solution:** Fix environment variable in Vercel, clear cache, redeploy.

**Time Estimate:** 15-20 minutes

---

## 📋 STEP-BY-STEP SEQUENCE

### Step 1: Verify Current Problem (2 minutes)

1. **Open Production App:**
   - Navigate to: `https://app.restocked.now`
   - Open: Browser DevTools (F12)
   - Go to: Console tab

2. **Check Current State:**
   - Look for: "🔍 [apiClient] RUNTIME ENVIRONMENT DIAGNOSTIC"
   - Note: Current `API_BASE_URL` value (likely `http://localhost:3000`)
   - Note: Any errors

3. **Test Login:**
   - Go to: `/login` page
   - Try: Login with test credentials
   - Check: Network tab for request URL
   - Verify: Request goes to localhost (confirming problem)

---

### Step 2: Fix Vercel Environment Variables (3 minutes)

1. **Go to Vercel Dashboard:**
   - Navigate to: https://vercel.com/dashboard
   - Select: Your project
   - Go to: Settings → Environment Variables

2. **Delete Typo Variable:**
   - Find: `VITE_APT_BASE_URL` (if exists)
   - Click: Delete/Remove button
   - Confirm: Deletion
   - ✅ Verify: Variable no longer appears in list

3. **Add/Verify Correct Variable:**
   - Check: Does `VITE_API_BASE_URL` exist?
   - If **missing:**
     - Click: "Add New"
     - **Name:** `VITE_API_BASE_URL` (exact spelling - API not APT)
     - **Value:** `https://restockednew-production.up.railway.app`
     - **Environments:** 
       - ✅ Production
       - ✅ Preview (optional)
       - ✅ Development (optional)
     - Click: Save
   - If **exists:**
     - Click: Edit
     - Verify: Value is `https://restockednew-production.up.railway.app`
     - Verify: Production environment is selected
     - Save if changed

4. **Final Verification:**
   - ✅ Only `VITE_API_BASE_URL` exists (not `VITE_APT_BASE_URL`)
   - ✅ Value is correct Railway URL
   - ✅ Production environment is selected

---

### Step 3: Clear Cache and Redeploy (5 minutes)

1. **Go to Deployments:**
   - Navigate to: Vercel Dashboard → Deployments tab
   - Find: Latest deployment

2. **Trigger Redeploy:**
   - Click: "..." (three dots menu)
   - Click: "Redeploy"
   - **CRITICAL:** Uncheck "Use existing Build Cache"
   - Click: "Redeploy"
   - Wait: 2-5 minutes for build to complete

3. **Monitor Build:**
   - Click: "View Build Logs" (during build)
   - Watch: Build progress
   - Look for: "🔍 Build-time Environment Variable Diagnostic"
   - Verify:
     - ✅ `VITE_API_BASE_URL = https://restockednew-production.up.railway.app`
     - ✅ `VITE_APT_BASE_URL = (not found - good!)`
     - ✅ `✅ VITE_API_BASE_URL validated successfully`
   - Wait: For build to complete successfully

---

### Step 4: Verify Build Success (2 minutes)

1. **Check Build Logs:**
   - After build completes, review logs
   - Verify: No errors
   - Verify: Diagnostic output shows correct URL
   - Verify: Validation passes

2. **Check Deployment Status:**
   - Verify: Deployment status is "Ready"
   - Verify: No deployment errors
   - Note: Deployment URL (should be `https://app.restocked.now`)

---

### Step 5: Verify Runtime Fix (3 minutes)

1. **Open Production App:**
   - Navigate to: `https://app.restocked.now`
   - Open: Browser DevTools (F12)
   - Go to: Console tab
   - **Hard Refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check Runtime Diagnostic:**
   - Look for: "🔍 [apiClient] RUNTIME ENVIRONMENT DIAGNOSTIC"
   - Verify:
     - ✅ `Final API_BASE_URL value: https://restockednew-production.up.railway.app`
     - ✅ `import.meta.env.VITE_API_BASE_URL: https://restockednew-production.up.railway.app`
     - ✅ No localhost in output
     - ✅ Typo variable not found

3. **Check Network Tab:**
   - Go to: Network tab
   - Navigate to: `/login` page
   - Verify: No requests to `http://localhost:3000`
   - Verify: Any requests go to Railway backend

---

### Step 6: Test Login (3 minutes)

1. **Navigate to Login Page:**
   - Go to: `https://app.restocked.now/login`
   - Verify: Login form loads

2. **Attempt Login:**
   - Enter: Test email (e.g., `test@example.com`)
   - Enter: Test password
   - Click: "Sign in"
   - Watch: Network tab

3. **Verify Login Request:**
   - Check: Network tab for POST request
   - Verify:
     - ✅ Request URL: `https://restockednew-production.up.railway.app/auth/login`
     - ✅ Status: 200 OK (or appropriate response)
     - ✅ No CORS errors
     - ✅ No mixed content errors
     - ✅ Response contains user data and token

4. **Verify Login Success:**
   - If login succeeds:
     - ✅ Redirect to dashboard
     - ✅ User info displayed
     - ✅ No errors in console
   - If login fails:
     - Check: Network tab for error details
     - Check: Console for error messages
     - Check: Backend logs (Railway)

---

### Step 7: Final Verification (2 minutes)

1. **Verify Dashboard:**
   - After login, verify:
     - ✅ Dashboard loads
     - ✅ API calls succeed
     - ✅ No 401/403 errors
     - ✅ Data displays correctly

2. **Verify All API Calls:**
   - Open: Network tab
   - Navigate: Through app
   - Verify: All requests go to Railway backend
   - Verify: No requests to localhost

3. **Clean Up (Optional):**
   - After confirming fix works:
     - Consider reducing console.log verbosity
     - Keep build-time validation (recommended)
     - Commit diagnostic improvements

---

## ✅ SUCCESS CRITERIA

### Build Logs Must Show:
- ✅ `VITE_API_BASE_URL = https://restockednew-production.up.railway.app`
- ✅ `VITE_APT_BASE_URL = (not found - good!)`
- ✅ `✅ VITE_API_BASE_URL validated successfully`
- ✅ No errors

### Runtime Console Must Show:
- ✅ `Final API_BASE_URL value: https://restockednew-production.up.railway.app`
- ✅ No localhost in output
- ✅ Typo variable not found

### Network Requests Must Show:
- ✅ Requests go to: `https://restockednew-production.up.railway.app`
- ✅ No requests to: `http://localhost:3000`
- ✅ No CORS errors
- ✅ No mixed content errors

### Functionality Must Work:
- ✅ Login succeeds
- ✅ Dashboard loads
- ✅ API calls succeed
- ✅ No authentication errors

---

## ❌ TROUBLESHOOTING

### Issue: Build Still Shows Localhost

**Check:**
1. Build cache cleared? (Uncheck "Use existing Build Cache")
2. Environment variable set correctly? (Check Vercel Dashboard)
3. Typo variable deleted? (Check Vercel Dashboard)
4. Variable applied to Production? (Check Vercel Dashboard)

**Fix:**
1. Double-check all steps
2. Clear cache and redeploy again
3. Verify variable name is exact: `VITE_API_BASE_URL`

---

### Issue: Runtime Still Shows Localhost

**Check:**
1. New deployment completed? (Check Vercel Dashboard)
2. Browser cache cleared? (Hard refresh: Ctrl+Shift+R)
3. CDN cache expired? (Wait 5-10 minutes)

**Fix:**
1. Hard refresh browser
2. Clear browser cache
3. Wait for CDN propagation
4. Check deployment is latest

---

### Issue: Login Still Fails

**Check:**
1. Backend is running? (Check Railway Dashboard)
2. Backend URL is correct? (Check Railway deployment)
3. CORS configured? (Check backend CORS settings)
4. Database connected? (Check Railway logs)

**Fix:**
1. Check Railway backend logs
2. Verify backend is accessible
3. Check CORS configuration
4. Verify database connection

---

## 📊 VERIFICATION CHECKLIST

### Pre-Deployment:
- [ ] `VITE_APT_BASE_URL` deleted in Vercel
- [ ] `VITE_API_BASE_URL` exists in Vercel
- [ ] Value is `https://restockednew-production.up.railway.app`
- [ ] Applied to Production environment
- [ ] Build cache cleared (unchecked)

### During Deployment:
- [ ] Build logs show correct variable
- [ ] Validation passes
- [ ] Build completes successfully
- [ ] No errors in build logs

### Post-Deployment:
- [ ] Runtime console shows Railway URL
- [ ] Network requests go to Railway backend
- [ ] Login succeeds
- [ ] Dashboard loads
- [ ] All API calls succeed

---

## 🎉 COMPLETION

Once all steps are complete and verification passes:

✅ **Login is working on https://app.restocked.now**

**Next Steps:**
1. Remove or reduce diagnostic logging (optional)
2. Test all app features
3. Monitor for any issues
4. Proceed with feature development

---

**Sequence Complete:** December 4, 2025  
**Status:** Ready to execute  
**Estimated Time:** 15-20 minutes



