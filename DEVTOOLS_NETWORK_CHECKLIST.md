# DevTools Network Tab Checklist
**App:** `https://app.restocked.now`  
**Date:** December 4, 2025

---

## 🎯 Purpose

Exact checklist of what you should see in DevTools Network tab after adding `VITE_API_BASE_URL` and redeploying.

---

## ✅ Prerequisites

- [ ] `VITE_API_BASE_URL` added to Vercel
- [ ] Vercel deployment completed
- [ ] Browser cache cleared
- [ ] DevTools open (F12)

---

## 📋 Network Tab Checklist

### Step 1: Open DevTools and Clear Network Log

1. **Open:** `https://app.restocked.now/login`
2. **Open DevTools:** F12
3. **Go to:** Network tab
4. **Clear log:** Click 🚫 icon (or Cmd+K / Ctrl+K)
5. **Filter:** Select "Fetch/XHR" to show only API requests

**Status:** [ ] ✅ Ready [ ] ❌ Not Ready

---

### Step 2: Login Request Verification

#### Action: Attempt Login

1. **Enter credentials:**
   - Email: `test@example.com`
   - Password: `TestPassword123!`
2. **Click:** "Sign in" button

#### Expected Network Request:

**Request Details:**
```
Method: POST
URL: https://restockednew-production.up.railway.app/auth/login
Status: 200 OK
Type: fetch
```

**Request Headers:**
```
Content-Type: application/json
Origin: https://app.restocked.now
Referer: https://app.restocked.now/login
```

**Request Payload:**
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```

**Response Headers:**
```
Access-Control-Allow-Origin: https://app.restocked.now
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Content-Type: application/json
```

**Response Body:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "plan": "free",
    "created_at": "2025-12-04T...",
    "updated_at": "2025-12-04T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIuLi4iLCJpYXQiOjE3MzMzNzY4MDAsImV4cCI6MTczNDAwMTYwMH0..."
}
```

**Status:** [ ] ✅ Correct [ ] ❌ Wrong URL [ ] ❌ Error

**Common Issues:**
- ❌ Request to `http://localhost:3000` → Env var not set
- ❌ CORS error → Backend CORS misconfigured
- ❌ 401 Unauthorized → Wrong credentials
- ❌ 500 Internal Server Error → Backend error

---

### Step 3: Dashboard Load Requests

#### Action: After Login (Auto-redirect)

**Expected Requests (in order):**

**Request 1: Get Tracked Items**
```
Method: GET
URL: https://restockednew-production.up.railway.app/me/tracked-items
Status: 200 OK
Type: fetch
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Origin: https://app.restocked.now
Referer: https://app.restocked.now/dashboard
```

**Response Body:**
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
      "product": {
        "id": 1,
        "url": "https://example.com/product",
        "name": "Product Name",
        "main_image_url": "https://...",
        "created_at": "2025-12-04T...",
        "updated_at": "2025-12-04T..."
      },
      "variant": null,
      "alias": null,
      "notifications_enabled": true,
      "created_at": "2025-12-04T...",
      "updated_at": "2025-12-04T..."
    }
  ]
}
```

**Request 2: Get Notifications (Unread Count)**
```
Method: GET
URL: https://restockednew-production.up.railway.app/me/notifications?limit=1&offset=0
Status: 200 OK
Type: fetch
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Origin: https://app.restocked.now
```

**Response Body:**
```json
{
  "notifications": [],
  "pagination": {
    "limit": 1,
    "offset": 0,
    "count": 0
  },
  "unreadCount": 0,
  "unread_count": 0
}
```

**Status:** [ ] ✅ Both Requests Success [ ] ❌ Some Failed

---

### Step 4: Add Product Request

#### Action: Add Product via Dashboard

1. **Enter URL:** `https://example.com/product`
2. **Click:** "Add Product" button

**Expected Requests (in order):**

**Request 1: Create/Fetch Product**
```
Method: POST
URL: https://restockednew-production.up.railway.app/products
Status: 201 Created
Type: fetch
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Origin: https://app.restocked.now
```

**Request Payload:**
```json
{
  "url": "https://example.com/product"
}
```

**Response Body:**
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

**Request 2: Add to Tracked Items**
```
Method: POST
URL: https://restockednew-production.up.railway.app/me/tracked-items
Status: 201 Created
Type: fetch
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Origin: https://app.restocked.now
```

**Request Payload:**
```json
{
  "product_id": 1,
  "url": "https://example.com/product"
}
```

**Response Body:**
```json
{
  "tracked_item": {
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
}
```

**Request 3: Refresh Tracked Items (Auto)**
```
Method: GET
URL: https://restockednew-production.up.railway.app/me/tracked-items
Status: 200 OK
```

**Status:** [ ] ✅ All Requests Success [ ] ❌ Some Failed

---

### Step 5: Product Details Page Requests

#### Action: Navigate to Product Details

1. **Click:** "View Details" on a tracked item
2. **URL:** `/product/:id`

**Expected Request:**
```
Method: GET
URL: https://restockednew-production.up.railway.app/products/:id
Status: 200 OK
Type: fetch
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Origin: https://app.restocked.now
```

**Response Body:**
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
  ]
}
```

**Status:** [ ] ✅ Request Success [ ] ❌ Failed

---

### Step 6: Product History Page Requests

#### Action: Navigate to Variant History

1. **Click:** "View History" on a variant
2. **URL:** `/product/:id/history/:variantId`

**Expected Requests:**

**Request 1: Get Product (if not cached)**
```
Method: GET
URL: https://restockednew-production.up.railway.app/products/:id
Status: 200 OK
```

**Request 2: Get Variant History**
```
Method: GET
URL: https://restockednew-production.up.railway.app/variants/:variantId
Status: 200 OK
Type: fetch
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Origin: https://app.restocked.now
```

**Response Body:**
```json
{
  "variant": {
    "id": 1,
    "product_id": 1,
    "attributes": { ... },
    "current_price": 29.99,
    "current_stock_status": "in_stock",
    "created_at": "2025-12-04T...",
    "updated_at": "2025-12-04T..."
  },
  "priceHistory": [
    {
      "id": 1,
      "variant_id": 1,
      "price": 29.99,
      "currency": "USD",
      "recorded_at": "2025-12-04T..."
    }
  ],
  "stockHistory": [
    {
      "id": 1,
      "variant_id": 1,
      "status": "in_stock",
      "recorded_at": "2025-12-04T..."
    }
  ]
}
```

**Status:** [ ] ✅ Request Success [ ] ❌ Failed

---

### Step 7: Notifications Page Requests

#### Action: Navigate to Notifications

1. **Click:** Notifications icon in navbar
2. **URL:** `/notifications`

**Expected Request:**
```
Method: GET
URL: https://restockednew-production.up.railway.app/me/notifications?limit=50&offset=0
Status: 200 OK
Type: fetch
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Origin: https://app.restocked.now
```

**Response Body:**
```json
{
  "notifications": [
    {
      "id": 1,
      "user_id": "uuid-here",
      "product_id": 1,
      "variant_id": 1,
      "type": "PRICE",
      "message": "Price changed from $29.99 to $24.99",
      "old_price": 29.99,
      "new_price": 24.99,
      "old_status": null,
      "new_status": null,
      "created_at": "2025-12-04T...",
      "sent": false,
      "sent_at": null,
      "read": false,
      "notify_price_change": true,
      "notify_restock": true,
      "notify_oos": true,
      "metadata": {}
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 1
  },
  "unreadCount": 1,
  "unread_count": 1
}
```

**Status:** [ ] ✅ Request Success [ ] ❌ Failed

---

### Step 8: Settings Page Requests

#### Action: Navigate to Notification Settings

1. **Click:** Settings link
2. **URL:** `/settings/notifications`

**Expected Request:**
```
Method: GET
URL: https://restockednew-production.up.railway.app/me/settings/notifications
Status: 200 OK
Type: fetch
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Origin: https://app.restocked.now
```

**Response Body:**
```json
{
  "settings": {
    "user_id": "uuid-here",
    "email_enabled": true,
    "push_enabled": false,
    "threshold_percentage": 10,
    "created_at": "2025-12-04T...",
    "updated_at": "2025-12-04T..."
  }
}
```

**Status:** [ ] ✅ Request Success [ ] ❌ Failed

---

## 🔍 Token Verification in localStorage

### Step 1: Check Token Exists

1. **Open DevTools:** F12
2. **Go to:** Application → Local Storage → `https://app.restocked.now`
3. **Look for:** Key `auth-storage`

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

**Token Format:**
- ✅ Starts with `eyJ` (base64 JWT header)
- ✅ Has 3 parts separated by `.`
- ✅ 192+ characters long

**Status:** [ ] ✅ Token Present [ ] ❌ Token Missing

---

## ❌ Common Network Errors

### Error: Request to localhost

**Symptom:**
```
Request URL: http://localhost:3000/auth/login
```

**Cause:** `VITE_API_BASE_URL` not set

**Fix:**
1. Add `VITE_API_BASE_URL` to Vercel
2. Wait for redeploy
3. Clear browser cache

---

### Error: CORS Policy

**Symptom:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Cause:** Backend CORS not allowing frontend origin

**Fix:**
1. Check backend CORS configuration
2. Verify `https://app.restocked.now` is in allowed origins

---

### Error: 401 Unauthorized

**Symptom:**
```
Status: 401 Unauthorized
Response: { "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

**Cause:** Missing or invalid token

**Fix:**
1. Check token in localStorage
2. Verify token is attached to request headers
3. Log out and log back in

---

### Error: 500 Internal Server Error

**Symptom:**
```
Status: 500 Internal Server Error
Response: { "error": { "code": "INTERNAL_ERROR", "message": "..." } }
```

**Cause:** Backend error

**Fix:**
1. Check Railway logs
2. Verify database connection
3. Check backend environment variables

---

## ✅ Complete Network Checklist

### Authentication
- [ ] Login request goes to Railway backend
- [ ] Login returns 200 OK with user and token
- [ ] Token stored in localStorage
- [ ] Token format is valid JWT

### Dashboard
- [ ] GET /me/tracked-items returns 200 OK
- [ ] GET /me/notifications returns 200 OK
- [ ] All requests include Authorization header
- [ ] No CORS errors

### Product Management
- [ ] POST /products returns 201 Created
- [ ] POST /me/tracked-items returns 201 Created
- [ ] GET /products/:id returns 200 OK
- [ ] GET /variants/:variantId returns 200 OK

### Notifications
- [ ] GET /me/notifications returns 200 OK
- [ ] POST /me/notifications/mark-read returns 200 OK

### Settings
- [ ] GET /me/settings/notifications returns 200 OK
- [ ] POST /me/settings/notifications returns 200 OK

### General
- [ ] All requests go to Railway backend (not localhost)
- [ ] All requests include Authorization header (except auth endpoints)
- [ ] No CORS errors
- [ ] No network errors
- [ ] All responses return expected status codes

---

**Checklist Complete:** [ ] ✅ All Pass [ ] ⚠️ Some Issues [ ] ❌ Failed

**Issues Found:**
```
[List any issues here]
```

---

**Document Generated:** December 4, 2025  
**Next Step:** Run complete app testing sequence



