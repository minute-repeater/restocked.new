# Post-Environment-Variable Deployment Verification
**App:** `https://app.restocked.now`  
**Date:** December 4, 2025

---

## 🎯 Purpose

This checklist verifies that adding `VITE_API_BASE_URL` to Vercel has successfully enabled all functionality.

---

## ✅ Immediate Verification (After Adding Env Var)

### Step 1: Confirm Environment Variable is Set

**Vercel Dashboard:**
1. Go to: Vercel Dashboard → Project → Settings → Environment Variables
2. Verify: `VITE_API_BASE_URL` exists
3. Verify: Value is `https://restockednew-production.up.railway.app`
4. Verify: Applied to Production, Preview, Development

**Status:** [ ] ✅ Set [ ] ❌ Missing

---

### Step 2: Confirm Deployment Completed

**Vercel Dashboard:**
1. Go to: Vercel Dashboard → Project → Deployments
2. Verify: Latest deployment shows "Ready" status
3. Verify: Deployment completed after env var was added
4. Verify: Build succeeded (no errors)

**Status:** [ ] ✅ Deployed [ ] ⏳ Pending [ ] ❌ Failed

---

### Step 3: Verify Frontend Calls Railway Backend (Not Localhost)

**Browser DevTools Method:**

1. **Open:** `https://app.restocked.now/login`
2. **Open DevTools:** F12
3. **Go to:** Network tab
4. **Clear network log:** Click 🚫 icon
5. **Attempt login** (or just check page load)
6. **Look for API requests:**
   - ✅ **CORRECT:** Requests to `https://restockednew-production.up.railway.app`
   - ❌ **WRONG:** Requests to `http://localhost:3000`

**Expected Network Requests:**
```
✅ https://restockednew-production.up.railway.app/auth/login
✅ https://restockednew-production.up.railway.app/health (if called)
```

**NOT Expected:**
```
❌ http://localhost:3000/auth/login
❌ http://localhost:3000/health
```

**JavaScript Console Method:**

1. **Open DevTools:** F12 → Console tab
2. **Run:**
   ```javascript
   console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
   ```
3. **Expected Output:**
   ```
   API Base URL: https://restockednew-production.up.railway.app
   ```
4. **If Output is:**
   - `undefined` → Env var not set ❌
   - `http://localhost:3000` → Wrong value ❌
   - `https://restockednew-production.up.railway.app` → Correct ✅

**Status:** [ ] ✅ Correct Backend [ ] ❌ Still Localhost

---

## 🔍 Endpoint Response Verification

### Authentication Endpoints

#### POST /auth/register

**Request:**
```bash
POST https://restockednew-production.up.railway.app/auth/register
Content-Type: application/json
Origin: https://app.restocked.now

{
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```

**Expected Response (201 Created):**
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

**Status:** [ ] ✅ 201 Created [ ] ❌ Error

---

#### POST /auth/login

**Request:**
```bash
POST https://restockednew-production.up.railway.app/auth/login
Content-Type: application/json
Origin: https://app.restocked.now

{
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```

**Expected Response (200 OK):**
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

**Error Responses:**
- `401 Unauthorized`: Invalid email or password
- `400 Bad Request`: Missing email or password
- `500 Internal Server Error`: Backend error (check logs)

**Status:** [ ] ✅ 200 OK [ ] ❌ Error

---

### Protected Endpoints (Require Token)

#### GET /me/tracked-items

**Request:**
```bash
GET https://restockednew-production.up.railway.app/me/tracked-items
Authorization: Bearer <token>
Origin: https://app.restocked.now
```

**Expected Response (200 OK):**
```json
{
  "items": []
}
```

**Or with items:**
```json
{
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "variant_id": null,
      "product": { ... },
      "variant": null,
      "alias": null,
      "notifications_enabled": true,
      "created_at": "2025-12-04T...",
      "updated_at": "2025-12-04T..."
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Backend error

**Status:** [ ] ✅ 200 OK [ ] ❌ Error

---

#### POST /products

**Request:**
```bash
POST https://restockednew-production.up.railway.app/products
Content-Type: application/json
Origin: https://app.restocked.now

{
  "url": "https://example.com/product"
}
```

**Expected Response (201 Created):**
```json
{
  "product": {
    "id": 1,
    "url": "https://example.com/product",
    "name": "Product Name",
    "main_image_url": "https://...",
    "created_at": "2025-12-04T...",
    "updated_at": "2025-12-04T..."
  },
  "variants": [
    {
      "id": 1,
      "product_id": 1,
      "attributes": { ... },
      "current_price": 29.99,
      "current_stock_status": "in_stock",
      "created_at": "2025-12-04T...",
      "updated_at": "2025-12-04T..."
    }
  ],
  "notes": []
}
```

**Error Responses:**
- `400 Bad Request`: Invalid URL or fetch failed
- `500 Internal Server Error`: Backend error

**Status:** [ ] ✅ 201 Created [ ] ❌ Error

---

#### GET /me/notifications

**Request:**
```bash
GET https://restockednew-production.up.railway.app/me/notifications?limit=50&offset=0
Authorization: Bearer <token>
Origin: https://app.restocked.now
```

**Expected Response (200 OK):**
```json
{
  "notifications": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 0
  },
  "unreadCount": 0,
  "unread_count": 0
}
```

**Status:** [ ] ✅ 200 OK [ ] ❌ Error

---

#### GET /me/plan

**Request:**
```bash
GET https://restockednew-production.up.railway.app/me/plan
Authorization: Bearer <token>
Origin: https://app.restocked.now
```

**Expected Response (200 OK):**
```json
{
  "plan": "free",
  "limits": {
    "maxTrackedItems": 10,
    "maxChecksPerDay": 50,
    "maxProductsPerHistoryPage": null,
    "allowVariantTracking": false,
    "minCheckIntervalMinutes": 30
  }
}
```

**Status:** [ ] ✅ 200 OK [ ] ❌ Error

---

## 🔐 JWT Storage and Authentication State Verification

### Step 1: Verify Token in localStorage

**Browser DevTools:**
1. **Open:** `https://app.restocked.now`
2. **Open DevTools:** F12
3. **Go to:** Application → Local Storage → `https://app.restocked.now`
4. **Look for:** Key `auth-storage`

**Expected Value:**
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
- ✅ Token exists
- ✅ Token is 192+ characters
- ✅ Token starts with `eyJ` (base64 JWT header)
- ✅ Token has 3 parts separated by `.` (header.payload.signature)

**Status:** [ ] ✅ Token Present [ ] ❌ Token Missing

---

### Step 2: Verify Token Persists After Refresh

1. **Login** to the app
2. **Verify** token in localStorage (Step 1)
3. **Refresh page:** F5 or Cmd+R
4. **Check:** Token should still be in localStorage
5. **Check:** User should still be logged in
6. **Check:** Dashboard should load automatically

**Status:** [ ] ✅ Persists [ ] ❌ Lost on Refresh

---

### Step 3: Verify Token Attached to Requests

**Browser DevTools:**
1. **Open:** `https://app.restocked.now/dashboard`
2. **Open DevTools:** F12 → Network tab
3. **Look for:** `GET /me/tracked-items` request
4. **Click** on the request
5. **Go to:** Headers tab
6. **Look for:** `Authorization: Bearer <token>`

**Expected Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Origin: https://app.restocked.now
```

**Status:** [ ] ✅ Token Attached [ ] ❌ Token Missing

---

### Step 4: Verify Authentication State in React

**Browser DevTools Console:**
1. **Open:** `https://app.restocked.now/dashboard`
2. **Open DevTools:** F12 → Console tab
3. **Run:**
   ```javascript
   // Access Zustand store
   const auth = JSON.parse(localStorage.getItem('auth-storage'));
   console.log('User:', auth?.state?.user);
   console.log('Token:', auth?.state?.token ? 'Present' : 'Missing');
   console.log('Plan:', auth?.state?.plan);
   ```

**Expected Output:**
```
User: { id: "...", email: "...", plan: "free", ... }
Token: Present
Plan: free
```

**Status:** [ ] ✅ State Correct [ ] ❌ State Missing

---

## 🐛 Debugging Login Problems

### Problem: Login Returns Error

**Symptoms:**
- Error message on login page
- Network request fails
- Console shows error

**Debug Steps:**

1. **Check Network Tab:**
   - [ ] Is request going to Railway backend? (not localhost)
   - [ ] What's the status code? (200, 401, 500?)
   - [ ] What's the response body?
   - [ ] Is CORS error present?

2. **Check Console:**
   - [ ] Any JavaScript errors?
   - [ ] Any CORS errors?
   - [ ] Any network errors?

3. **Verify Environment Variable:**
   - [ ] Is `VITE_API_BASE_URL` set in Vercel?
   - [ ] Did deployment complete?
   - [ ] Hard refresh browser (Cmd+Shift+R)

4. **Test Backend Directly:**
   ```bash
   curl -X POST https://restockednew-production.up.railway.app/auth/login \
     -H "Content-Type: application/json" \
     -H "Origin: https://app.restocked.now" \
     -d '{"email":"test@example.com","password":"TestPassword123!"}'
   ```

**Common Issues:**

| Issue | Cause | Fix |
|-------|-------|-----|
| CORS error | Env var not set | Add `VITE_API_BASE_URL` |
| 401 Unauthorized | Wrong credentials | Check email/password |
| Network error | Backend down | Check Railway status |
| Mixed content | HTTP → HTTPS | Env var must be HTTPS |

---

### Problem: Token Not Stored

**Symptoms:**
- Login succeeds but token not in localStorage
- User logged out immediately
- Redirects to login after login

**Debug Steps:**

1. **Check localStorage:**
   - [ ] Does `auth-storage` key exist?
   - [ ] Is data valid JSON?
   - [ ] Is token present in data?

2. **Check Browser Console:**
   - [ ] Any errors during login?
   - [ ] Any errors from Zustand?
   - [ ] Any localStorage errors?

3. **Check Zustand Store:**
   ```javascript
   // In console
   const auth = JSON.parse(localStorage.getItem('auth-storage'));
   console.log('Auth state:', auth);
   ```

**Common Issues:**

| Issue | Cause | Fix |
|-------|-------|-----|
| localStorage disabled | Browser settings | Enable localStorage |
| Quota exceeded | Too much data | Clear other data |
| Private mode | Incognito mode | Use normal mode |

---

### Problem: 401 on Protected Routes

**Symptoms:**
- Dashboard shows error
- Requests return 401
- User logged out automatically

**Debug Steps:**

1. **Check Token:**
   - [ ] Is token in localStorage?
   - [ ] Is token valid JWT format?
   - [ ] Is token expired? (7-day expiration)

2. **Check Request Headers:**
   - [ ] Is `Authorization` header present?
   - [ ] Is header format correct? (`Bearer <token>`)
   - [ ] Is token value correct?

3. **Verify Token:**
   - Decode at jwt.io (decode only, don't verify)
   - Check expiration date
   - Check userId in payload

**Common Issues:**

| Issue | Cause | Fix |
|-------|-------|-----|
| Token expired | 7 days passed | Log in again |
| Invalid token | Corrupted | Clear localStorage, log in |
| Missing header | Interceptor issue | Check apiClient.ts |

---

## ✅ Verification Checklist Summary

### Environment Variable
- [ ] `VITE_API_BASE_URL` set in Vercel
- [ ] Value is `https://restockednew-production.up.railway.app`
- [ ] Applied to Production, Preview, Development
- [ ] Deployment completed

### Frontend → Backend Connection
- [ ] Requests go to Railway backend (not localhost)
- [ ] No CORS errors
- [ ] HTTPS → HTTPS (no mixed content)

### Authentication
- [ ] Registration works (201 Created)
- [ ] Login works (200 OK)
- [ ] Token stored in localStorage
- [ ] Token persists after refresh
- [ ] Token attached to requests

### Protected Endpoints
- [ ] `GET /me/tracked-items` works (200 OK)
- [ ] `POST /products` works (201 Created)
- [ ] `GET /me/notifications` works (200 OK)
- [ ] `GET /me/plan` works (200 OK)

### Dashboard
- [ ] Dashboard loads after login
- [ ] No errors in console
- [ ] No errors in network tab
- [ ] Can add products
- [ ] Can view tracked items

---

**Verification Complete:** [ ] ✅ All Pass [ ] ⚠️ Some Issues [ ] ❌ Failed

**Issues Found:**
```
[List any issues here]
```

---

**Document Generated:** December 4, 2025  
**Next Step:** Run guided testing sequence



