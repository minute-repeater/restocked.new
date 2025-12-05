# OAuth CORS Error - Forensic Diagnostic Report

**Date:** 2025-12-04  
**Error Observed:** `{"error": {"code":"INTERNAL_ERROR","message":"Internal server error","details":{"message":"Not allowed by CORS"}}}`  
**Endpoint:** `GET /auth/google/url`  
**Status:** 🔍 Code Inspection Complete - No Changes Made

---

## A) CORS BEHAVIOR DIAGNOSTICS

### A.1 Exact Evaluation Order Inside Origin Callback

**File:** `src/api/server.ts`  
**Function:** `cors()` middleware `origin` callback  
**Lines:** 106-164

**Exact Evaluation Order:**

1. **Line 108-113:** Diagnostic logging (development only)
   ```typescript
   if (config.isDevelopment) {
     logger.debug({
       origin: origin || "(undefined)",
       originType: typeof origin,
     }, "CORS origin check");
   }
   ```
   - **Runs:** Only in development
   - **Does NOT affect decision:** Logging only

2. **Line 116-121:** Check for `undefined` origin
   ```typescript
   if (!origin) {
     if (config.isDevelopment) {
       logger.debug({ decision: "allowed", reason: "no_origin" }, "CORS: Allowing request (no origin)");
     }
     return callback(null, true);  // ✅ ALLOWS REQUEST
   }
   ```
   - **Condition:** `!origin` (falsy check)
   - **Result:** ✅ **ALLOWS** request, returns early
   - **Confirmation:** Both `undefined` and `null` (falsy) are allowed here

3. **Line 125-130:** Check for `"null"` string literal
   ```typescript
   if (origin === "null" || origin === null) {
     if (config.isDevelopment) {
       logger.debug({ decision: "allowed", reason: "null_origin" }, "CORS: Allowing request (null origin string)");
     }
     return callback(null, true);  // ✅ ALLOWS REQUEST
   }
   ```
   - **Condition:** `origin === "null"` OR `origin === null`
   - **Result:** ✅ **ALLOWS** request, returns early
   - **Confirmation:** String literal `"null"` is explicitly allowed

4. **Line 133-138:** Exact match check
   ```typescript
   if (allowedOrigins.includes(origin)) {
     if (config.isDevelopment) {
       logger.debug({ decision: "allowed", reason: "exact_match" }, "CORS: Allowing request (exact match)");
     }
     return callback(null, true);  // ✅ ALLOWS REQUEST
   }
   ```
   - **Condition:** `allowedOrigins.includes(origin)`
   - **Result:** ✅ **ALLOWS** if exact match found

5. **Line 141-146:** `.vercel.app` wildcard check
   ```typescript
   if (origin.endsWith('.vercel.app')) {
     if (config.isDevelopment) {
       logger.debug({ decision: "allowed", reason: "vercel_wildcard" }, "CORS: Allowing request (.vercel.app)");
     }
     return callback(null, true);  // ✅ ALLOWS REQUEST
   }
   ```
   - **Condition:** `origin.endsWith('.vercel.app')`
   - **Result:** ✅ **ALLOWS** if ends with `.vercel.app`

6. **Line 149-154:** `.up.railway.app` wildcard check
   ```typescript
   if (origin.endsWith('.up.railway.app')) {
     if (config.isDevelopment) {
       logger.debug({ decision: "allowed", reason: "railway_wildcard" }, "CORS: Allowing request (.up.railway.app)");
     }
     return callback(null, true);  // ✅ ALLOWS REQUEST
   }
   ```
   - **Condition:** `origin.endsWith('.up.railway.app')`
   - **Result:** ✅ **ALLOWS** if ends with `.up.railway.app`

7. **Line 157-164:** Rejection (if all checks fail)
   ```typescript
   logger.warn({
     origin: config.isProduction ? origin.substring(0, 50) + "..." : origin,
     allowedOriginsCount: allowedOrigins.length,
     decision: "rejected",
   }, "CORS request rejected");
   
   callback(new Error("Not allowed by CORS"));  // ❌ REJECTS REQUEST
   ```
   - **Condition:** All previous checks failed
   - **Result:** ❌ **REJECTS** request with error

**Answer to A.1:**
- ✅ **`undefined` origin:** Allowed at line 116 (`!origin` check)
- ✅ **`"null"` string literal:** Allowed at line 125 (explicit check)
- ✅ **Both paths allow the request** and return early before other checks

---

### A.2 Exact AllowedOrigins Array Built at Runtime

**File:** `src/api/server.ts`  
**Function:** `createServer()`  
**Lines:** 60-95

**Runtime Construction Logic:**

```typescript
const allowedOrigins: string[] = [];  // Line 60 - Start empty

// Step 1: Add backend URL if set (Line 63-65)
if (config.backendUrl) {
  allowedOrigins.push(config.backendUrl);
}
// Result: If BACKEND_URL env var is set → adds config.backendUrl

// Step 2: Fallback for missing BACKEND_URL in production (Line 69-73)
if (config.isProduction && !config.backendUrl) {
  const railwayUrl = "https://restockednew-production.up.railway.app";
  allowedOrigins.push(railwayUrl);
  logger.warn({ railwayUrl }, "BACKEND_URL not set, using hardcoded Railway URL for CORS");
}
// Result: If production AND BACKEND_URL missing → adds hardcoded Railway URL

// Step 3: Add FRONTEND_URL from env if set (Line 76-78)
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
// Result: If FRONTEND_URL env var is set → adds it

// Step 4: Add production origins (Line 81-84)
allowedOrigins.push(
  "https://app.restocked.now",
  "https://restocked.now"
);
// Result: Always adds these two URLs

// Step 5: Add development origins (Line 87-95)
if (!config.isProduction) {
  allowedOrigins.push(
    "http://localhost:3000",
    "http://localhost:5173"
  );
  if (config.frontendUrl) {
    allowedOrigins.push(config.frontendUrl);
  }
}
// Result: Only in development → adds localhost URLs
```

**Runtime Array Contents (Production Scenario):**

**Scenario 1: BACKEND_URL is SET**
```typescript
allowedOrigins = [
  config.backendUrl,                    // e.g., "https://restockednew-production.up.railway.app"
  process.env.FRONTEND_URL,             // e.g., "https://app.restocked.now" (if set)
  "https://app.restocked.now",          // Always added
  "https://restocked.now"                // Always added
]
```

**Scenario 2: BACKEND_URL is MISSING (Production)**
```typescript
allowedOrigins = [
  "https://restockednew-production.up.railway.app",  // Hardcoded fallback (line 70)
  process.env.FRONTEND_URL,                           // e.g., "https://app.restocked.now" (if set)
  "https://app.restocked.now",                        // Always added
  "https://restocked.now"                             // Always added
]
```

**Answer to A.2:**
- **If BACKEND_URL is set:** Array includes `config.backendUrl` + `FRONTEND_URL` (if set) + hardcoded production URLs
- **If BACKEND_URL is missing:** Array includes hardcoded Railway URL + `FRONTEND_URL` (if set) + hardcoded production URLs
- **Note:** The hardcoded Railway URL fallback (line 70) only applies if `config.isProduction && !config.backendUrl`

---

### A.3 Does CORS Middleware Run Before Auth Routes?

**File:** `src/api/server.ts`  
**CORS Middleware Applied:** Line 104  
**Auth Routes Applied:** Line 180

**Order of Execution:**

```typescript
// Line 104: CORS middleware applied FIRST
app.use(
  cors({
    origin: (origin, callback) => { /* ... */ }
  })
);

// Line 176: Body parser middleware
app.use(express.json({ limit: "1mb" }));

// Line 177: Request logging middleware
app.use(requestLoggingMiddleware);

// Line 180: Auth routes applied AFTER CORS
app.use("/auth", authRoutes);
```

**Answer to A.3:**
- ✅ **YES** - CORS middleware runs **BEFORE** auth routes
- CORS is applied at line 104
- Auth routes are applied at line 180
- **Request flow:** CORS → Body Parser → Request Logging → Auth Routes
- **If CORS rejects:** Request never reaches `/auth/google/url` handler

---

## B) ENVIRONMENT VARIABLE DIAGNOSTICS

### B.1 Required Environment Variables in Production

**File:** `src/config.ts`  
**Function:** `loadConfig()`  
**Lines:** 110-206

**Required Variables:**

1. **`DATABASE_URL`** (Line 116-119)
   ```typescript
   const databaseUrl = process.env.DATABASE_URL;
   if (!databaseUrl) {
     throw new Error("DATABASE_URL is required");
   }
   ```
   - **Required:** ✅ Yes (always)
   - **Missing:** ❌ **Server crashes** at startup

2. **`JWT_SECRET`** (Line 121-124)
   ```typescript
   const jwtSecret = process.env.JWT_SECRET;
   if (!jwtSecret) {
     throw new Error("JWT_SECRET is required");
   }
   ```
   - **Required:** ✅ Yes (always)
   - **Missing:** ❌ **Server crashes** at startup

3. **`FRONTEND_URL`** (Line 127, 130-132)
   ```typescript
   const frontendUrl = process.env.FRONTEND_URL || (isDevelopment ? "http://localhost:5173" : "");
   
   if (isProduction && !frontendUrl) {
     throw new Error("FRONTEND_URL is required in production");
   }
   ```
   - **Required:** ✅ Yes (production only)
   - **Missing:** ❌ **Server crashes** at startup in production

4. **`BACKEND_URL`** (Line 128, 244-246)
   ```typescript
   const backendUrl = process.env.BACKEND_URL || (isDevelopment ? "http://localhost:3000" : "");
   
   // In validateConfig() (line 244-246):
   if (config.isProduction) {
     if (!config.backendUrl) {
       throw new Error("BACKEND_URL is required in production");
     }
   }
   ```
   - **Required:** ✅ Yes (production only)
   - **Missing:** ❌ **Server crashes** at startup in production (via `validateConfig()` at line 328)

**Answer to B.1:**
- **Required in production:** `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `BACKEND_URL`
- **All missing values:** ❌ **Crash server at startup** (throw errors)

---

### B.2 Environment Variable References and Missing Value Behavior

#### `BACKEND_URL`

**References:**

1. **`src/config.ts:128`**
   ```typescript
   const backendUrl = process.env.BACKEND_URL || (isDevelopment ? "http://localhost:3000" : "");
   ```
   - **Missing:** Returns empty string `""` in production
   - **Impact:** `config.backendUrl` becomes `""` (empty string)

2. **`src/config.ts:244-246`** (validation)
   ```typescript
   if (config.isProduction) {
     if (!config.backendUrl) {
       throw new Error("BACKEND_URL is required in production");
     }
   }
   ```
   - **Missing:** ❌ **Server crashes** at startup (called at line 328)

3. **`src/api/server.ts:63-65`** (CORS allowedOrigins)
   ```typescript
   if (config.backendUrl) {
     allowedOrigins.push(config.backendUrl);
   }
   ```
   - **Missing:** `config.backendUrl` is `""` (falsy) → **NOT added** to allowedOrigins
   - **Impact:** Backend URL not in CORS allowed list

4. **`src/api/server.ts:69-73`** (CORS fallback)
   ```typescript
   if (config.isProduction && !config.backendUrl) {
     const railwayUrl = "https://restockednew-production.up.railway.app";
     allowedOrigins.push(railwayUrl);
   }
   ```
   - **Missing:** ✅ **Adds hardcoded Railway URL** to allowedOrigins
   - **Impact:** CORS fallback works, but **server won't start** (validation fails first)

5. **`src/api/utils/googleOAuth.ts:10`** (redirect URL fallback)
   ```typescript
   const redirectUrl = process.env.GOOGLE_REDIRECT_URL 
     || process.env.GOOGLE_REDIRECT_URI 
     || `${config.backendUrl}/auth/google/callback`;
   ```
   - **Missing:** `config.backendUrl` is `""` → redirect URL becomes `"/auth/google/callback"` (invalid)
   - **Impact:** ❌ **OAuth URL generator creates invalid redirect URL**

**Missing Value Behavior:**
- ❌ **Server crashes** at startup (validation)
- ❌ **OAuth redirect URL invalid** (`"/auth/google/callback"` instead of full URL)

---

#### `FRONTEND_URL`

**References:**

1. **`src/config.ts:127`**
   ```typescript
   const frontendUrl = process.env.FRONTEND_URL || (isDevelopment ? "http://localhost:5173" : "");
   ```
   - **Missing:** Returns empty string `""` in production

2. **`src/config.ts:130-132`** (validation)
   ```typescript
   if (isProduction && !frontendUrl) {
     throw new Error("FRONTEND_URL is required in production");
   }
   ```
   - **Missing:** ❌ **Server crashes** at startup

3. **`src/api/routes/auth.ts:181,189,206,215`** (OAuth callback redirects)
   ```typescript
   const frontendErrorUrl = `${config.frontendUrl}/login?error=...`;
   const frontendCallbackUrl = `${config.frontendUrl}/auth/callback?token=...`;
   ```
   - **Missing:** `config.frontendUrl` is `""` → redirect URLs become `"/login?error=..."` (invalid)
   - **Impact:** ❌ **OAuth callback redirects fail**

**Missing Value Behavior:**
- ❌ **Server crashes** at startup (validation)
- ❌ **OAuth callback redirects invalid**

---

#### `GOOGLE_CLIENT_ID`

**References:**

1. **`src/api/utils/googleOAuth.ts:12`** (OAuth2 client creation)
   ```typescript
   return new google.auth.OAuth2(
     process.env.GOOGLE_CLIENT_ID,
     process.env.GOOGLE_CLIENT_SECRET,
     redirectUrl
   );
   ```
   - **Missing:** `undefined` passed to OAuth2 constructor
   - **Impact:** ❌ **OAuth2 client creation may fail** (depends on googleapis library)

2. **`src/api/utils/googleOAuth.ts:23`** (configuration check)
   ```typescript
   return !!(
     process.env.GOOGLE_CLIENT_ID &&
     process.env.GOOGLE_CLIENT_SECRET
   );
   ```
   - **Missing:** `isGoogleOAuthConfigured()` returns `false`
   - **Impact:** ✅ **Route handler returns 400** before OAuth URL generation

**Missing Value Behavior:**
- ✅ **Route handler returns 400** (doesn't crash server)
- ❌ **OAuth URL generator not called** (early return)

---

#### `GOOGLE_CLIENT_SECRET`

**References:**

1. **`src/api/utils/googleOAuth.ts:13`** (OAuth2 client creation)
   ```typescript
   return new google.auth.OAuth2(
     process.env.GOOGLE_CLIENT_ID,
     process.env.GOOGLE_CLIENT_SECRET,
     redirectUrl
   );
   ```
   - **Missing:** `undefined` passed to OAuth2 constructor
   - **Impact:** ❌ **OAuth2 client creation may fail**

2. **`src/api/utils/googleOAuth.ts:24`** (configuration check)
   ```typescript
   return !!(
     process.env.GOOGLE_CLIENT_ID &&
     process.env.GOOGLE_CLIENT_SECRET
   );
   ```
   - **Missing:** `isGoogleOAuthConfigured()` returns `false`
   - **Impact:** ✅ **Route handler returns 400** before OAuth URL generation

**Missing Value Behavior:**
- ✅ **Route handler returns 400** (doesn't crash server)
- ❌ **OAuth URL generator not called** (early return)

---

#### `GOOGLE_REDIRECT_URL` (Optional)

**References:**

1. **`src/api/utils/googleOAuth.ts:10`** (redirect URL fallback)
   ```typescript
   const redirectUrl = process.env.GOOGLE_REDIRECT_URL 
     || process.env.GOOGLE_REDIRECT_URI 
     || `${config.backendUrl}/auth/google/callback`;
   ```
   - **Missing:** Falls back to `GOOGLE_REDIRECT_URI` or `${config.backendUrl}/auth/google/callback`
   - **Impact:** ✅ **No error** (has fallback)

**Missing Value Behavior:**
- ✅ **No error** (optional, has fallback)
- ⚠️ **Uses fallback** (may be invalid if `BACKEND_URL` missing)

---

**Answer to B.2:**

| Variable | Missing Value Impact |
|----------|---------------------|
| `BACKEND_URL` | ❌ Server crashes at startup<br>❌ OAuth redirect URL invalid |
| `FRONTEND_URL` | ❌ Server crashes at startup<br>❌ OAuth callback redirects invalid |
| `GOOGLE_CLIENT_ID` | ✅ Route returns 400 (doesn't crash)<br>❌ OAuth URL generator not called |
| `GOOGLE_CLIENT_SECRET` | ✅ Route returns 400 (doesn't crash)<br>❌ OAuth URL generator not called |
| `GOOGLE_REDIRECT_URL` | ✅ No error (optional, has fallback) |

---

## C) GOOGLE OAUTH URL FLOW DIAGNOSTICS

### C.1 Exact Redirect URL Fallback Evaluation Order

**File:** `src/api/utils/googleOAuth.ts`  
**Function:** `getOAuth2Client()`  
**Line:** 10

**Exact Fallback Order:**

```typescript
const redirectUrl = process.env.GOOGLE_REDIRECT_URL      // 1st priority
  || process.env.GOOGLE_REDIRECT_URI                     // 2nd priority
  || `${config.backendUrl}/auth/google/callback`;        // 3rd priority (fallback)
```

**Runtime Evaluation:**

1. **Check `GOOGLE_REDIRECT_URL`:**
   - If set → Use `process.env.GOOGLE_REDIRECT_URL`
   - If not set → Continue to next check

2. **Check `GOOGLE_REDIRECT_URI`:**
   - If set → Use `process.env.GOOGLE_REDIRECT_URI`
   - If not set → Continue to next check

3. **Fallback to `${config.backendUrl}/auth/google/callback`:**
   - Uses `config.backendUrl` from `src/config.ts:128`
   - If `BACKEND_URL` env var is set → Uses that value
   - If `BACKEND_URL` env var is missing → Uses `""` (empty string) → Result: `"/auth/google/callback"` (invalid)

**Answer to C.1:**
- **Fallback order:** `GOOGLE_REDIRECT_URL` → `GOOGLE_REDIRECT_URI` → `${config.backendUrl}/auth/google/callback`
- **If all missing:** Redirect URL becomes `"/auth/google/callback"` (relative path, invalid for OAuth)

---

### C.2 What Happens If BACKEND_URL is Missing?

**Scenario: Missing `BACKEND_URL` in Production**

**Step 1: Config Loading (`src/config.ts:128`)**
```typescript
const backendUrl = process.env.BACKEND_URL || (isDevelopment ? "http://localhost:3000" : "");
```
- **Result:** `config.backendUrl = ""` (empty string)

**Step 2: Config Validation (`src/config.ts:244-246`, called at `server.ts:328`)**
```typescript
if (config.isProduction) {
  if (!config.backendUrl) {
    throw new Error("BACKEND_URL is required in production");
  }
}
```
- **Result:** ❌ **Server crashes** at startup
- **Error:** `"BACKEND_URL is required in production"`

**Step 3: CORS AllowedOrigins (`src/api/server.ts:63-65`)**
```typescript
if (config.backendUrl) {
  allowedOrigins.push(config.backendUrl);
}
```
- **Result:** `config.backendUrl` is `""` (falsy) → **NOT added** to allowedOrigins

**Step 4: CORS Fallback (`src/api/server.ts:69-73`)**
```typescript
if (config.isProduction && !config.backendUrl) {
  const railwayUrl = "https://restockednew-production.up.railway.app";
  allowedOrigins.push(railwayUrl);
}
```
- **Result:** ✅ **Adds hardcoded Railway URL** to allowedOrigins
- **Note:** This code **never executes** because server crashes at Step 2

**Step 5: OAuth Redirect URL (`src/api/utils/googleOAuth.ts:10`)**
```typescript
const redirectUrl = process.env.GOOGLE_REDIRECT_URL 
  || process.env.GOOGLE_REDIRECT_URI 
  || `${config.backendUrl}/auth/google/callback`;
```
- **Result:** If `GOOGLE_REDIRECT_URL` and `GOOGLE_REDIRECT_URI` are missing → `redirectUrl = "/auth/google/callback"` (invalid)
- **Impact:** ❌ **OAuth2 client created with invalid redirect URL**

**Answer to C.2:**
- ❌ **Config loader crashes** at startup (validation at line 328)
- ❌ **OAuth fallback generates invalid URL** (`"/auth/google/callback"` instead of full URL)
- ⚠️ **Server never starts** (validation fails before CORS fallback can execute)

---

### C.3 Does `isGoogleOAuthConfigured()` Return True Based on Railway Variables?

**File:** `src/api/utils/googleOAuth.ts`  
**Function:** `isGoogleOAuthConfigured()`  
**Lines:** 21-26

**Implementation:**
```typescript
export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}
```

**Evaluation Logic:**
- Checks if `GOOGLE_CLIENT_ID` is truthy
- Checks if `GOOGLE_CLIENT_SECRET` is truthy
- Returns `true` only if **both** are truthy

**Truthy Check Behavior:**
- ✅ **Non-empty string:** `"abc123"` → truthy
- ❌ **Empty string:** `""` → falsy
- ❌ **`undefined`:** → falsy
- ❌ **`null`:** → falsy

**Answer to C.3:**
- **Returns `true`** only if:
  - `GOOGLE_CLIENT_ID` is set to a non-empty string
  - `GOOGLE_CLIENT_SECRET` is set to a non-empty string
- **Returns `false`** if either is missing, empty, or falsy
- **Cannot verify actual Railway values** without runtime inspection (use `/auth/google/config-status` endpoint)

---

## D) ROUTE EXECUTION / ERROR PATH DIAGNOSTICS

### D.1 All Early-Return Paths in `/auth/google/url`

**File:** `src/api/routes/auth.ts`  
**Route:** `GET /auth/google/url`  
**Lines:** 146-168

**All Execution Paths:**

**Path 1: Invalid Config (Early Return)**
```typescript
// Line 148-156
if (!isGoogleOAuthConfigured()) {
  logger.warn({ path: "/auth/google/url" }, "Google OAuth not configured");
  return res.status(400).json(
    createErrorResponse(
      ErrorCodes.INVALID_REQUEST,
      "Google OAuth is not configured"
    )
  );
}
```
- **Condition:** `isGoogleOAuthConfigured()` returns `false`
- **Response:** `400 Bad Request` with error message
- **Logs:** Warning log
- **Does NOT reach:** OAuth URL generation

**Path 2: OAuth URL Generation Success**
```typescript
// Line 158-159
const authUrl = getGoogleAuthUrl();
res.json({ url: authUrl });
```
- **Condition:** `isGoogleOAuthConfigured()` returns `true` AND `getGoogleAuthUrl()` succeeds
- **Response:** `200 OK` with `{ url: "..." }`
- **Logs:** Debug log (if enabled) from `getGoogleAuthUrl()`

**Path 3: Exception from OAuth Client (Catch Block)**
```typescript
// Line 160-167
catch (error: any) {
  logger.error({ error: error.message, path: "/auth/google/url" }, "Error in GET /auth/google/url");
  Sentry.captureException(error, {
    tags: { oauth_provider: "google", endpoint: "/auth/google/url" },
  });
  const errorResponse = formatError(error);
  res.status(500).json(errorResponse);
}
```
- **Condition:** `getGoogleAuthUrl()` throws an exception
- **Possible Exceptions:**
  - `isGoogleOAuthConfigured()` returns `false` inside `getGoogleAuthUrl()` (line 36-38 of `googleOAuth.ts`)
  - OAuth2 client creation fails (line 11-14 of `googleOAuth.ts`)
  - `generateAuthUrl()` fails (line 46 of `googleOAuth.ts`)
- **Response:** `500 Internal Server Error` with formatted error
- **Logs:** Error log + Sentry capture

**Path 4: CORS Rejection (Before Route Handler)**
```typescript
// File: src/api/server.ts, Line 164
callback(new Error("Not allowed by CORS"));
```
- **Condition:** CORS middleware rejects request (all checks fail)
- **Response:** `500 Internal Server Error` with CORS error
- **Logs:** Warning log: `"CORS request rejected"` (line 157)
- **Does NOT reach:** Route handler (rejected at middleware level)

**Answer to D.1:**

| Path | Condition | Response | Reaches Route Handler? |
|------|-----------|----------|------------------------|
| Invalid Config | `isGoogleOAuthConfigured()` = `false` | `400 Bad Request` | ✅ Yes (early return) |
| OAuth URL Success | Config valid, URL generated | `200 OK` | ✅ Yes |
| Exception from OAuth | `getGoogleAuthUrl()` throws | `500 Internal Server Error` | ✅ Yes (catch block) |
| CORS Rejection | CORS middleware rejects | `500 Internal Server Error` | ❌ No (rejected before route) |

---

### D.2 Does Route Get Executed When Called Directly in Browser?

**To Determine Execution:**

**Check 1: CORS Logging**
- **File:** `src/api/server.ts:157-161`
- **If CORS rejects:** Logs `"CORS request rejected"` with origin details
- **If CORS allows:** No rejection log (request proceeds)

**Check 2: Route Handler Logging**
- **File:** `src/api/routes/auth.ts:149` (invalid config)
- **If config invalid:** Logs `"Google OAuth not configured"`
- **File:** `src/api/routes/auth.ts:161` (exception)
- **If exception:** Logs `"Error in GET /auth/google/url"`

**Check 3: Request Logging Middleware**
- **File:** `src/api/server.ts:177`
- **Applied:** After CORS, before routes
- **If request reaches middleware:** Logs request details

**Execution Flow:**

```
Request arrives
  ↓
CORS Middleware (line 104)
  ├─ If rejects → Log "CORS request rejected" → Return 500 → ❌ Route NOT executed
  └─ If allows → Continue
  ↓
Body Parser (line 176)
  ↓
Request Logging (line 177) → Logs request
  ↓
Auth Routes (line 180)
  ↓
GET /auth/google/url handler (line 146)
  ├─ If config invalid → Log "Google OAuth not configured" → Return 400 → ✅ Route executed
  ├─ If exception → Log "Error in GET /auth/google/url" → Return 500 → ✅ Route executed
  └─ If success → Return 200 → ✅ Route executed
```

**Answer to D.2:**

**If CORS rejects:**
- ❌ **Route handler NOT executed**
- ✅ **Logs:** `"CORS request rejected"` (line 157)
- ✅ **Response:** `500 Internal Server Error` with `"Not allowed by CORS"`

**If CORS allows:**
- ✅ **Route handler IS executed**
- ✅ **Logs:** Request logging middleware (line 177)
- ✅ **Possible logs:**
  - `"Google OAuth not configured"` (if config invalid)
  - `"Error in GET /auth/google/url"` (if exception)
  - No error log (if success)

**To Verify:**
- Check backend logs for `"CORS request rejected"` → If present, CORS is blocking
- Check backend logs for `"Error in GET /auth/google/url"` → If present, route executed but threw error
- Check backend logs for request logging → If present, request reached route handler

---

## SUMMARY

### Key Findings

1. **CORS Logic:**
   - ✅ Explicitly allows `undefined` origin (line 116)
   - ✅ Explicitly allows `"null"` string literal (line 125)
   - ✅ Should NOT block direct browser access

2. **Environment Variables:**
   - ❌ Missing `BACKEND_URL` → Server crashes at startup (validation)
   - ❌ Missing `FRONTEND_URL` → Server crashes at startup (validation)
   - ✅ Missing `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` → Route returns 400 (doesn't crash)

3. **OAuth Redirect URL:**
   - ⚠️ If `BACKEND_URL` missing → Redirect URL becomes `"/auth/google/callback"` (invalid)
   - ⚠️ Server won't start if `BACKEND_URL` missing (validation prevents it)

4. **Error Paths:**
   - **CORS rejection:** Route handler NOT executed, logs `"CORS request rejected"`
   - **Invalid config:** Route handler executed, returns 400
   - **OAuth exception:** Route handler executed, returns 500

### Critical Question

**If the error is `"Not allowed by CORS"`:**
- This error comes from `src/api/server.ts:164` (CORS middleware)
- **Route handler is NOT executed** (rejected at middleware level)
- **Backend logs should show:** `"CORS request rejected"` (line 157)

**Next Steps:**
1. Check backend logs for `"CORS request rejected"` message
2. Check backend logs for the actual `origin` value that was rejected
3. Verify `allowedOrigins` array contents at runtime
4. Use `/auth/google/config-status` endpoint to verify env vars

---

**Status:** 🔍 **Diagnostic Complete - Awaiting Runtime Logs to Confirm Root Cause**

