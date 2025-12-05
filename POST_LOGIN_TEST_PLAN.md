# Post-Login Test Plan
**App:** `https://app.restocked.now`  
**Date:** December 4, 2025

---

## 🎯 Test Objectives

1. Verify login works after environment variable fix
2. Verify token storage and usage
3. Verify dashboard loads and functions
4. Verify all API endpoints work
5. Identify any remaining issues

---

## 📋 Pre-Test Setup

### Step 1: Add Environment Variable to Vercel

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your frontend project

2. **Navigate to Environment Variables**
   - Settings → Environment Variables

3. **Add Variable**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://restockednew-production.up.railway.app`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

4. **Save and Wait**
   - Click "Save"
   - Wait for deployment to complete (2-5 minutes)
   - Verify deployment shows "Ready"

### Step 2: Clear Browser Cache

**Chrome:**
1. Open: `chrome://net-internals/#dns`
2. Click "Clear host cache"
3. Close and reopen browser

**Or Hard Refresh:**
- Mac: `Cmd+Shift+R`
- Windows/Linux: `Ctrl+Shift+R`

---

## 🧪 Test Execution

### Test 1: Create Test Account

**Method A: Registration Page**
1. Go to: `https://app.restocked.now/register`
2. Enter:
   - Email: `test-$(date +%s)@example.com` (unique email)
   - Password: `TestPassword123!`
3. Click "Sign up"
4. **Expected:** Account created, redirected to dashboard

**Method B: Backend API**
```bash
curl -X POST https://restockednew-production.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
```

**Verification:**
- ✅ Registration succeeds
- ✅ Returns user object and token
- ✅ Status code: 201

---

### Test 2: Login from Production Frontend

1. **Go to:** `https://app.restocked.now/login`

2. **Enter Credentials:**
   - Email: `test@example.com` (or your test email)
   - Password: `TestPassword123!`

3. **Click "Sign in"**

4. **Expected Results:**
   - ✅ No error message
   - ✅ Redirects to `/dashboard`
   - ✅ Dashboard page loads
   - ✅ No console errors

5. **If Login Fails:**
   - Check browser console for errors
   - Check Network tab for failed requests
   - Verify `VITE_API_BASE_URL` is set in Vercel
   - Verify deployment completed

---

### Test 3: Verify JWT Storage

**Browser DevTools Method:**

1. **Open DevTools** (F12)

2. **Go to:** Application → Local Storage → `https://app.restocked.now`

3. **Look for Key:** `auth-storage`

4. **Expected Value:**
   ```json
   {
     "state": {
       "user": {
         "id": "uuid-here",
         "email": "test@example.com",
         "plan": "free",
         "created_at": "2025-12-04T...",
         "updated_at": "2025-12-04T..."
       },
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "plan": "free"
     },
     "version": 0
   }
   ```

5. **Verify Token:**
   - Token should be 192+ characters
   - Token should start with `eyJ` (base64 JWT header)
   - Token should be a valid JWT format

**JavaScript Console Method:**
```javascript
// In browser console
const auth = JSON.parse(localStorage.getItem('auth-storage'));
console.log('Token:', auth?.state?.token);
console.log('User:', auth?.state?.user);
```

**Expected:**
- ✅ Token exists and is valid JWT
- ✅ User object contains email, id, plan
- ✅ Data persists after page refresh

---

### Test 4: Verify User Info / Dashboard Loads

**Dashboard Load Test:**

1. **After Login:**
   - Should automatically redirect to `/dashboard`
   - Dashboard should load without errors

2. **Check Network Tab:**
   - Open DevTools → Network tab
   - Look for: `GET /me/tracked-items`
   - **Expected:**
     - Status: `200 OK`
     - Request URL: `https://restockednew-production.up.railway.app/me/tracked-items`
     - Request Headers: `Authorization: Bearer <token>`
     - Response: `{ items: [...] }`

3. **Dashboard Content:**
   - **If no tracked items:** Shows "No tracked items yet" message
   - **If has items:** Shows list of tracked products
   - **Add Product form:** Should be visible

4. **Verify No Errors:**
   - Browser console: No red errors
   - Network tab: All requests return 200 OK
   - No CORS errors
   - No 401/403 errors

---

### Test 5: Test API Endpoints

#### Test 5.1: Get Tracked Items

**Expected Request:**
```
GET https://restockednew-production.up.railway.app/me/tracked-items
Headers: Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "items": []
}
```

**Verification:**
- ✅ Status: 200 OK
- ✅ Returns items array
- ✅ No authentication errors

#### Test 5.2: Add Product

1. **In Dashboard:**
   - Enter product URL: `https://example.com/product`
   - Click "Add Product"

2. **Expected Requests:**
   - `POST /products` - Creates/fetches product
   - `POST /me/tracked-items` - Adds to tracking

3. **Expected Results:**
   - ✅ Product created/fetched
   - ✅ Added to tracked items
   - ✅ Appears in dashboard list

#### Test 5.3: Get Notifications

**Expected Request:**
```
GET https://restockednew-production.up.railway.app/me/notifications?limit=1&offset=0
Headers: Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "notifications": [],
  "pagination": { "limit": 1, "offset": 0, "count": 0 },
  "unreadCount": 0
}
```

**Verification:**
- ✅ Status: 200 OK
- ✅ Returns notifications array
- ✅ Returns unreadCount

#### Test 5.4: Get User Plan

**Expected Request:**
```
GET https://restockednew-production.up.railway.app/me/plan
Headers: Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "plan": "free",
  "limits": {
    "maxTrackedItems": 10,
    "maxChecksPerDay": 50,
    "allowVariantTracking": false,
    "minCheckIntervalMinutes": 30
  }
}
```

**Verification:**
- ✅ Status: 200 OK
- ✅ Returns plan and limits

---

## 🔍 Debugging Guide

### Issue: Login Returns Error

**Symptoms:**
- Error message on login page
- Network request fails
- Console shows error

**Debug Steps:**

1. **Check Network Tab:**
   - Look for `POST /auth/login` request
   - Check request URL: Should be Railway backend
   - Check status code: 200, 401, 500?
   - Check response body: What error message?

2. **Check Console:**
   - Any JavaScript errors?
   - Any CORS errors?
   - Any network errors?

3. **Verify Environment Variable:**
   - Check Vercel dashboard: Is `VITE_API_BASE_URL` set?
   - Check deployment: Did it complete?
   - Hard refresh browser

4. **Test Backend Directly:**
   ```bash
   curl -X POST https://restockednew-production.up.railway.app/auth/login \
     -H "Content-Type: application/json" \
     -H "Origin: https://app.restocked.now" \
     -d '{"email":"test@example.com","password":"TestPassword123!"}'
   ```

### Issue: Dashboard Shows "Loading..." Forever

**Symptoms:**
- Dashboard stuck on loading
- No tracked items appear
- No error message

**Debug Steps:**

1. **Check Network Tab:**
   - Is `GET /me/tracked-items` called?
   - What's the status code?
   - What's the response?

2. **Check Token:**
   - Is token in localStorage?
   - Is token valid?
   - Is token expired?

3. **Check Console:**
   - Any JavaScript errors?
   - Any React errors?
   - Any API errors?

4. **Verify API Endpoint:**
   ```bash
   # Get token from localStorage first
   curl -H "Authorization: Bearer <token>" \
     -H "Origin: https://app.restocked.now" \
     https://restockednew-production.up.railway.app/me/tracked-items
   ```

### Issue: CORS Error

**Symptoms:**
- Console shows CORS error
- Network request fails with CORS
- "Not allowed by CORS" message

**Debug Steps:**

1. **Check Request Origin:**
   - Network tab → Request Headers → Origin
   - Should be: `https://app.restocked.now`

2. **Check Backend CORS:**
   - Verify backend allows this origin
   - Check Railway logs for CORS errors

3. **Test Preflight:**
   ```bash
   curl -X OPTIONS https://restockednew-production.up.railway.app/me/tracked-items \
     -H "Origin: https://app.restocked.now" \
     -H "Access-Control-Request-Method: GET" \
     -v
   ```

### Issue: 401 Unauthorized

**Symptoms:**
- Requests return 401
- User logged out automatically
- Redirected to login

**Debug Steps:**

1. **Check Token:**
   - Is token in localStorage?
   - Is token format correct?
   - Is token expired? (7-day expiration)

2. **Check Request Headers:**
   - Network tab → Request Headers
   - Should have: `Authorization: Bearer <token>`

3. **Verify Token:**
   - Decode token at jwt.io (decode only)
   - Check expiration date
   - Check userId in payload

4. **Solution:**
   - Log out and log back in
   - Token will be refreshed

---

## ✅ Success Criteria

### Login Test: ✅ PASS

- [ ] User can register new account
- [ ] User can login with credentials
- [ ] Login redirects to dashboard
- [ ] No error messages

### Token Test: ✅ PASS

- [ ] Token stored in localStorage
- [ ] Token is valid JWT format
- [ ] Token persists after refresh
- [ ] Token attached to requests

### Dashboard Test: ✅ PASS

- [ ] Dashboard loads after login
- [ ] `GET /me/tracked-items` returns 200
- [ ] Dashboard displays content
- [ ] No loading errors

### API Test: ✅ PASS

- [ ] All API endpoints accessible
- [ ] All requests return 200 OK
- [ ] No CORS errors
- [ ] No authentication errors

### Feature Test: ✅ PASS

- [ ] Can add products
- [ ] Can view tracked items
- [ ] Can delete tracked items
- [ ] Can view notifications
- [ ] Can view settings
- [ ] Can upgrade/downgrade plan

---

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________

Environment Variable: [ ] Set [ ] Not Set
Deployment Status: [ ] Ready [ ] Pending

Test 1: Registration
  [ ] Pass [ ] Fail
  Notes: ___________

Test 2: Login
  [ ] Pass [ ] Fail
  Notes: ___________

Test 3: Token Storage
  [ ] Pass [ ] Fail
  Token: [ ] Present [ ] Missing
  Notes: ___________

Test 4: Dashboard
  [ ] Pass [ ] Fail
  API Call: [ ] 200 OK [ ] Error
  Notes: ___________

Test 5: API Endpoints
  Tracked Items: [ ] Pass [ ] Fail
  Products: [ ] Pass [ ] Fail
  Notifications: [ ] Pass [ ] Fail
  Settings: [ ] Pass [ ] Fail
  Plan: [ ] Pass [ ] Fail
  Notes: ___________

Overall Status: [ ] ✅ PASS [ ] ❌ FAIL
Issues Found: ___________
```

---

**Plan Generated:** December 4, 2025  
**Ready for:** Post-env-var-fix testing



