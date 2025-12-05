# CORS Audit Report

**Date:** 2025-12-04  
**Issue:** `/auth/google/url` returns "Not allowed by CORS" when accessed directly

---

## 1. Full CORS Audit

### 1.1 CORS Middleware Location

**Single CORS middleware found:** `src/api/server.ts` lines 104-143

```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      // CORS logic here
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);
```

**Applied:** Before all routes (line 104), affects all `/auth/*` routes including `/auth/google/url`

**No other CORS middleware found** - confirmed via grep search

---

### 1.2 Current CORS Options Function

**Current Logic (lines 106-135):**

```typescript
origin: (origin, callback) => {
  // 1. Allow requests with NO origin
  if (!origin) {
    return callback(null, true);
  }
  
  // 2. Exact match check
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  
  // 3. .vercel.app wildcard
  if (origin.endsWith('.vercel.app')) {
    return callback(null, true);
  }
  
  // 4. .up.railway.app wildcard
  if (origin.endsWith('.up.railway.app')) {
    return callback(null, true);
  }
  
  // 5. Reject with error
  callback(new Error("Not allowed by CORS"));
}
```

---

### 1.3 Allowed Origins Construction

**Current allowedOrigins array construction (lines 60-95):**

```typescript
const allowedOrigins: string[] = [];

// Add backend URL if set
if (config.backendUrl) {
  allowedOrigins.push(config.backendUrl);
}

// Fallback: Add Railway URL if BACKEND_URL not set
if (config.isProduction && !config.backendUrl) {
  const railwayUrl = "https://restockednew-production.up.railway.app";
  allowedOrigins.push(railwayUrl);
}

// Add FRONTEND_URL if set
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Add production origins
allowedOrigins.push(
  "https://app.restocked.now",
  "https://restocked.now"
);

// Add development origins (if not production)
if (!config.isProduction) {
  allowedOrigins.push(
    "http://localhost:3000",
    "http://localhost:5173"
  );
}
```

**Expected allowedOrigins in production (with BACKEND_URL set):**
- `https://restockednew-production.up.railway.app` (from config.backendUrl)
- `https://app.restocked.now` (hardcoded)
- `https://restocked.now` (hardcoded)
- `https://app.restocked.now` (from FRONTEND_URL, duplicate but harmless)

---

## 2. Origin Behavior Analysis

### 2.1 Direct Browser Navigation

**Scenario:** Opening `https://restockednew-production.up.railway.app/auth/google/url` directly in browser

**Browser Behavior:**
- For same-origin requests (URL matches the server), browsers typically send:
  - **No Origin header** (most common)
  - OR `Origin: null` (as string literal, rare)
  - OR `Origin: https://restockednew-production.up.railway.app` (same-origin, some browsers)

**CORS Library Behavior:**
- The `cors` library passes `undefined` when no Origin header is present
- The `cors` library passes the actual origin string when Origin header is present

**Expected Flow:**
1. If `origin === undefined` → `!origin` check passes → ✅ Allowed
2. If `origin === "https://restockednew-production.up.railway.app"` → Should match:
   - Exact match in allowedOrigins (if config.backendUrl is set correctly) → ✅ Allowed
   - OR `.up.railway.app` wildcard → ✅ Allowed

**Current Issue:**
- If browser sends `Origin: null` (as string literal), then:
  - `!origin` check fails (because `"null"` is truthy)
  - Exact match fails (not in allowedOrigins)
  - Wildcard checks fail (doesn't end with `.vercel.app` or `.up.railway.app`)
  - ❌ Rejected with "Not allowed by CORS"

---

### 2.2 Frontend Fetch Request

**Scenario:** Frontend at `https://app.restocked.now` calls `/auth/google/url` via fetch/Axios

**Browser Behavior:**
- Browser sends: `Origin: https://app.restocked.now`

**Expected Flow:**
1. `origin === "https://app.restocked.now"` → Exact match in allowedOrigins → ✅ Allowed

**Should work correctly** - no issue expected here

---

## 3. Root Cause Hypothesis

**Problem:** Browser sends `Origin: null` (as string literal `"null"`) for direct navigation

**Why this happens:**
- Some browsers (especially when opening URL directly) send `Origin: null` as a string
- The `cors` library receives `origin === "null"` (string)
- The check `if (!origin)` fails because `"null"` is a truthy string
- The exact match and wildcard checks fail because `"null"` doesn't match any pattern
- Request is rejected

**Solution:** Add explicit check for `origin === "null"` (string literal)

---

## 4. Error Handling

**When CORS rejects:**
- `callback(new Error("Not allowed by CORS"))` is called
- The `cors` library passes this error to Express error handler
- Error handler (lines 242-283) catches it and formats as:
  ```json
  {
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "Internal server error",
      "details": { "message": "Not allowed by CORS" }
    }
  }
  ```

**This matches the user's error response** - confirms CORS is rejecting the request

---

## 5. Fix Strategy

**Minimal fix:**
1. Add explicit check for `origin === "null"` (string literal) - treat same as `undefined`
2. Add explicit check for `origin === "null"` OR `origin === null` OR `!origin`
3. Ensure `config.backendUrl` is always added to allowedOrigins if set
4. Add diagnostic logging to see what origin is actually being received

**No changes needed to:**
- OAuth business logic
- Token logic
- Email/password auth
- Other routes


