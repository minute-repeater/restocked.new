# Guided Testing Sequence
**App:** `https://app.restocked.now`  
**Date:** December 4, 2025

---

## 🎯 Purpose

Step-by-step instructions to test the complete authentication and dashboard flow after adding `VITE_API_BASE_URL`.

---

## 📋 Prerequisites

- [ ] `VITE_API_BASE_URL` added to Vercel
- [ ] Vercel deployment completed
- [ ] Browser cache cleared (or hard refresh)
- [ ] DevTools ready (F12)

---

## 🧪 Test Sequence

### Test 1: Create User Account

#### Step 1.1: Navigate to Registration

1. **Open browser:** Chrome, Firefox, or Safari
2. **Go to:** `https://app.restocked.now/register`
3. **Expected:** Registration page loads
4. **Check:** No console errors (F12 → Console)

**Status:** [ ] ✅ Page Loads [ ] ❌ Error

---

#### Step 1.2: Fill Registration Form

1. **Enter Email:**
   - Use unique email: `test-$(date +%s)@example.com` or `test@example.com`
   - Format: Valid email address

2. **Enter Password:**
   - Minimum: 6 characters
   - Example: `TestPassword123!`

3. **Click:** "Sign up" button

**Status:** [ ] ✅ Form Filled [ ] ❌ Error

---

#### Step 1.3: Verify Registration Success

**Expected Behavior:**
- ✅ No error message
- ✅ Redirects to `/dashboard`
- ✅ Dashboard page loads

**Network Tab Check:**
1. **Open DevTools:** F12
2. **Go to:** Network tab
3. **Look for:** `POST /auth/register`
4. **Click** on the request
5. **Check:**
   - **Status:** `201 Created` ✅
   - **Request URL:** `https://restockednew-production.up.railway.app/auth/register` ✅
   - **Response:** Contains `user` and `token` ✅

**Expected Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "plan": "free",
    "created_at": "2025-12-04T...",
    "updated_at": "2025-12-04T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Status:** [ ] ✅ Registration Success [ ] ❌ Registration Failed

**If Failed:**
- Check error message on page
- Check Network tab for error response
- Check Console for JavaScript errors
- See "Common Errors" section below

---

### Test 2: Login

#### Step 2.1: Navigate to Login

1. **Go to:** `https://app.restocked.now/login`
2. **Expected:** Login page loads
3. **Check:** No console errors

**Status:** [ ] ✅ Page Loads [ ] ❌ Error

---

#### Step 2.2: Fill Login Form

1. **Enter Email:**
   - Use the email you registered with
   - Example: `test@example.com`

2. **Enter Password:**
   - Use the password you registered with
   - Example: `TestPassword123!`

3. **Click:** "Sign in" button

**Status:** [ ] ✅ Form Filled [ ] ❌ Error

---

#### Step 2.3: Verify Login Success

**Expected Behavior:**
- ✅ No error message
- ✅ Redirects to `/dashboard`
- ✅ Dashboard page loads

**Network Tab Check:**
1. **Open DevTools:** F12 → Network tab
2. **Look for:** `POST /auth/login`
3. **Click** on the request
4. **Check:**
   - **Status:** `200 OK` ✅
   - **Request URL:** `https://restockednew-production.up.railway.app/auth/login` ✅
   - **Response:** Contains `user` and `token` ✅

**Expected Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "plan": "free",
    "created_at": "2025-12-04T...",
    "updated_at": "2025-12-04T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Status:** [ ] ✅ Login Success [ ] ❌ Login Failed

---

### Test 3: Verify Network Traffic

#### Step 3.1: Check API Base URL

**JavaScript Console:**
1. **Open DevTools:** F12 → Console tab
2. **Run:**
   ```javascript
   console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
   ```
3. **Expected Output:**
   ```
   API Base URL: https://restockednew-production.up.railway.app
   ```
4. **If Output:**
   - `undefined` → Env var not set ❌
   - `http://localhost:3000` → Wrong value ❌
   - Correct URL → ✅

**Status:** [ ] ✅ Correct URL [ ] ❌ Wrong URL

---

#### Step 3.2: Verify All Requests Go to Railway

**Network Tab:**
1. **Open DevTools:** F12 → Network tab
2. **Clear network log:** Click 🚫 icon
3. **Navigate:** Go to dashboard (or refresh)
4. **Check all requests:**
   - ✅ All API requests go to `https://restockednew-production.up.railway.app`
   - ❌ No requests to `http://localhost:3000`

**Expected Requests:**
```
✅ GET https://restockednew-production.up.railway.app/me/tracked-items
✅ GET https://restockednew-production.up.railway.app/me/notifications?limit=1&offset=0
```

**NOT Expected:**
```
❌ GET http://localhost:3000/me/tracked-items
❌ GET http://localhost:3000/me/notifications
```

**Status:** [ ] ✅ All to Railway [ ] ❌ Some to Localhost

---

#### Step 3.3: Verify CORS Headers

**Network Tab:**
1. **Click** on any API request
2. **Go to:** Headers tab
3. **Check Response Headers:**
   - ✅ `Access-Control-Allow-Origin: https://app.restocked.now`
   - ✅ `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
   - ✅ `Access-Control-Allow-Headers: Content-Type, Authorization`

**Status:** [ ] ✅ CORS Headers Present [ ] ❌ CORS Error

---

### Test 4: Verify Token in localStorage

#### Step 4.1: Check Token Exists

**Browser DevTools:**
1. **Open DevTools:** F12
2. **Go to:** Application → Local Storage → `https://app.restocked.now`
3. **Look for:** Key `auth-storage`
4. **Click** on the key
5. **Check Value:**
   - ✅ Key exists
   - ✅ Value is valid JSON
   - ✅ Contains `token` field

**Status:** [ ] ✅ Token Present [ ] ❌ Token Missing

---

#### Step 4.2: Verify Token Format

**Expected Token Structure:**
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
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIuLi4iLCJpYXQiOjE3MzMzNzY4MDAsImV4cCI6MTczNDAwMTYwMH0...",
    "plan": "free"
  },
  "version": 0
}
```

**Token Verification:**
- ✅ Token is 192+ characters
- ✅ Token starts with `eyJ` (base64 JWT header)
- ✅ Token has 3 parts separated by `.` (header.payload.signature)

**JavaScript Console:**
```javascript
const auth = JSON.parse(localStorage.getItem('auth-storage'));
const token = auth?.state?.token;
console.log('Token length:', token?.length);
console.log('Token format:', token?.split('.').length === 3 ? 'Valid JWT' : 'Invalid');
```

**Status:** [ ] ✅ Valid Format [ ] ❌ Invalid Format

---

#### Step 4.3: Verify Token Persists

1. **Login** to the app
2. **Verify** token in localStorage (Step 4.1)
3. **Refresh page:** F5 or Cmd+R
4. **Check:** Token should still be in localStorage
5. **Check:** User should still be logged in
6. **Check:** Dashboard should load automatically

**Status:** [ ] ✅ Persists [ ] ❌ Lost on Refresh

---

### Test 5: Verify Dashboard First Load

#### Step 5.1: Check Dashboard Loads

1. **After login:** Should redirect to `/dashboard`
2. **Expected:** Dashboard page loads
3. **Check:** No console errors
4. **Check:** No network errors

**Status:** [ ] ✅ Dashboard Loads [ ] ❌ Error

---

#### Step 5.2: Check Dashboard Requests

**Network Tab:**
1. **Open DevTools:** F12 → Network tab
2. **Look for these requests:**

**Expected Requests:**
```
✅ GET /me/tracked-items
   Status: 200 OK
   Headers: Authorization: Bearer <token>
   Response: { items: [...] }

✅ GET /me/notifications?limit=1&offset=0
   Status: 200 OK
   Headers: Authorization: Bearer <token>
   Response: { notifications: [], unreadCount: 0 }
```

**Status:** [ ] ✅ All Requests Success [ ] ❌ Some Failed

---

#### Step 5.3: Verify Dashboard Content

**Empty State (No Tracked Items):**
- ✅ Shows "No tracked items yet" message
- ✅ Shows "Add a Product" form
- ✅ Form has URL input and "Add Product" button

**With Items:**
- ✅ Shows list of tracked products
- ✅ Each product shows image, name, URL
- ✅ Can click "View Details"
- ✅ Can delete items

**Status:** [ ] ✅ Content Correct [ ] ❌ Content Missing

---

## 🐛 Common Errors and Fixes

### Error: "Network Error" or "Failed to fetch"

**Symptoms:**
- Request fails immediately
- No response from server
- Console shows network error

**Causes:**
1. **Env var not set:** `VITE_API_BASE_URL` missing
2. **Wrong URL:** Points to localhost
3. **Backend down:** Railway service offline
4. **CORS error:** Origin not allowed

**Fixes:**
1. ✅ Verify `VITE_API_BASE_URL` is set in Vercel
2. ✅ Verify deployment completed
3. ✅ Hard refresh browser (Cmd+Shift+R)
4. ✅ Check Railway status
5. ✅ Check CORS configuration

---

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Symptoms:**
- CORS error in console
- Request blocked by browser
- Network tab shows CORS error

**Causes:**
1. **Origin not allowed:** Frontend origin not in CORS whitelist
2. **Preflight failed:** OPTIONS request failed
3. **Backend CORS misconfigured**

**Fixes:**
1. ✅ Verify frontend origin is `https://app.restocked.now`
2. ✅ Check backend CORS allows this origin
3. ✅ Verify preflight (OPTIONS) requests work
4. ✅ Check Railway logs for CORS errors

---

### Error: "401 Unauthorized"

**Symptoms:**
- Login works but dashboard fails
- Requests return 401
- User logged out automatically

**Causes:**
1. **Token missing:** Not stored in localStorage
2. **Token invalid:** Corrupted or expired
3. **Token not attached:** Missing Authorization header
4. **Token expired:** 7 days passed

**Fixes:**
1. ✅ Check token in localStorage
2. ✅ Verify token format (JWT with 3 parts)
3. ✅ Check token expiration (decode at jwt.io)
4. ✅ Log out and log back in
5. ✅ Check Authorization header in requests

---

### Error: "Login failed" or "Invalid email or password"

**Symptoms:**
- Login form shows error
- 401 response from backend
- Cannot log in

**Causes:**
1. **Wrong credentials:** Email or password incorrect
2. **User doesn't exist:** Not registered
3. **Password mismatch:** Wrong password

**Fixes:**
1. ✅ Verify email is correct
2. ✅ Verify password is correct
3. ✅ Try registering again
4. ✅ Check backend logs for details

---

### Error: Dashboard Shows "Loading..." Forever

**Symptoms:**
- Dashboard stuck on loading
- No content appears
- No error message

**Causes:**
1. **API request failed:** Network error
2. **Token invalid:** 401 response
3. **Backend error:** 500 response
4. **Request never completes:** Timeout

**Fixes:**
1. ✅ Check Network tab for failed requests
2. ✅ Check Console for errors
3. ✅ Verify token is valid
4. ✅ Check Railway logs
5. ✅ Try refreshing page

---

## ✅ Test Completion Checklist

### Authentication
- [ ] Registration works
- [ ] Login works
- [ ] Token stored in localStorage
- [ ] Token persists after refresh

### Network
- [ ] All requests go to Railway backend
- [ ] No requests to localhost
- [ ] CORS headers present
- [ ] No CORS errors

### Dashboard
- [ ] Dashboard loads after login
- [ ] API requests succeed (200 OK)
- [ ] Content displays correctly
- [ ] No console errors
- [ ] No network errors

### Token
- [ ] Token in localStorage
- [ ] Token valid JWT format
- [ ] Token attached to requests
- [ ] Token works for protected routes

---

**Test Sequence Complete:** [ ] ✅ All Pass [ ] ⚠️ Some Issues [ ] ❌ Failed

**Issues Found:**
```
[List any issues here]
```

---

**Document Generated:** December 4, 2025  
**Next Step:** Run launch stabilization checklist



