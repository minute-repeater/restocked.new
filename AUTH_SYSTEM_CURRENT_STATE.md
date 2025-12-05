# Current Authentication System State

**Date:** 2025-12-04  
**Status:** ✅ Email/Password + Optional OAuth (Google + Apple)

---

## Executive Summary

The authentication system consists of:
1. **Email/Password Login** - Fully functional, unchanged from original implementation
2. **OAuth Login (Google + Apple)** - Fully implemented, disabled by default via feature flags

Both systems are **additive** - OAuth does not modify or break existing email/password functionality.

---

## 1. Email/Password Login & Register Flow

### Frontend Flow

**Login Page:** `frontend/src/pages/Login.tsx`
- Email and password input fields
- Form submission calls `authApi.login(email, password)`
- On success: saves to `authStore` and redirects to `/dashboard`
- On error: displays error message

**Register Page:** `frontend/src/pages/Register.tsx`
- Email, password, and confirm password fields
- Form submission calls `authApi.register(email, password)`
- On success: saves to `authStore` and redirects to `/dashboard`
- On error: displays error message

**API Client:** `frontend/src/api/auth.ts`
- `login(email, password)` - POST to `/auth/login`
- `register(email, password)` - POST to `/auth/register`
- Both return `{ user, token }` format

**Auth Store:** `frontend/src/store/authStore.ts`
- Zustand store with localStorage persistence
- `login({ user, token })` - saves user and token
- `logout()` - clears user and token
- Shape: `{ user: User | null, token: string | null, plan: 'free' | 'pro' | null }`
- **Unchanged** - same shape as before OAuth

### Backend Flow

**Routes:** `src/api/routes/auth.ts`

**POST /auth/register:**
- Validates input via `validateAuthInput()`
- Calls `authService.registerUser(email, password)`
- Returns `{ user, token }` on success (201)
- Returns error on duplicate email (409) or server error (500)
- Uses Pino logging: `logger.error()` on errors
- Uses `formatError()` for production-safe error responses

**POST /auth/login:**
- Validates input via `validateAuthInput()`
- Calls `authService.loginUser(email, password)`
- Returns `{ user, token }` on success (200)
- Returns error on invalid credentials (401) or server error (500)
- Uses Pino logging: `logger.error()` on errors
- Uses `formatError()` for production-safe error responses

**Auth Service:** `src/services/authService.ts`

**registerUser(email, password):**
- Checks if email exists
- Hashes password with bcrypt (10 rounds)
- Creates user with `oauth_provider: 'local'`, `oauth_provider_id: null`
- Generates JWT token via `signToken(user.id)`
- Returns `{ user, token }`

**loginUser(email, password):**
- Finds user by email
- **Checks if user has password_hash** (rejects OAuth-only users)
- Verifies password with bcrypt
- Generates JWT token via `signToken(user.id)`
- Returns `{ user, token }`

**JWT Format:** `src/api/utils/jwtUtils.ts`
- Payload: `{ userId: string (UUID), iat?: number, exp?: number }`
- Signed with `JWT_SECRET` from env
- Expires in 7 days
- **Unchanged** - same format as before OAuth

**User Repository:** `src/db/repositories/userRepository.ts`
- `findByEmail(email)` - returns full user including `password_hash`
- `createUser(data)` - accepts `password_hash`, `oauth_provider`, `oauth_provider_id`
- `findByOAuthProvider(provider, providerId)` - finds OAuth users

---

## 2. OAuth Support (Google + Apple)

### Database Changes

**Migration:** `db/migrations/006_add_oauth_support.sql`
- Makes `password_hash` nullable (idempotent check)
- Adds `oauth_provider` column (TEXT, nullable)
- Adds `oauth_provider_id` column (TEXT, nullable)
- Constraint: `oauth_provider IN ('google', 'apple', 'local')`
- Index on `(oauth_provider, oauth_provider_id)`
- Unique constraint on `(oauth_provider, oauth_provider_id)` where not null

**User Table Schema:**
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NULL,  -- Nullable for OAuth users
  oauth_provider TEXT NULL,  -- 'google', 'apple', 'local', or NULL
  oauth_provider_id TEXT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Backend Routes

**GET /auth/google/url:**
- Checks `isGoogleOAuthConfigured()` first
- Returns 400 with clear error if not configured
- Returns `{ url: string }` if configured
- Uses Pino logging and Sentry error capture

**GET /auth/google/callback:**
- Handles Google OAuth callback
- Extracts `code` from query params
- Calls `handleGoogleCallback(code)` to get user info
- Calls `authService.oauthLogin(email, 'google', providerId)`
- Redirects to frontend `/auth/callback?token=...` on success
- Redirects to frontend `/login?error=...` on failure
- Uses Pino logging and Sentry error capture

**GET /auth/apple/url:**
- Checks `isAppleOAuthConfigured()` first
- Returns 400 with clear error if not configured
- Returns `{ url: string }` if configured
- Uses Pino logging and Sentry error capture

**POST /auth/apple/callback:**
- Handles Apple OAuth callback (POST, not GET)
- Extracts `code` and `id_token` from body
- Calls `handleAppleCallback(code, id_token)` to get user info
- Calls `authService.oauthLogin(email, 'apple', providerId)`
- Redirects to frontend `/auth/callback?token=...` on success
- Redirects to frontend `/login?error=...` on failure
- Uses Pino logging and Sentry error capture

**GET /me:**
- Protected route (requires JWT via `requireAuth` middleware)
- Returns `{ user }` for authenticated user
- Works for both email/password and OAuth users

### Backend OAuth Utilities

**Google OAuth:** `src/api/utils/googleOAuth.ts`
- `isGoogleOAuthConfigured()` - checks `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `getGoogleAuthUrl()` - generates Google OAuth URL (throws if not configured)
- `handleGoogleCallback(code)` - exchanges code for tokens, fetches user profile (throws if not configured)
- Uses `googleapis` library
- Reads: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL` (or defaults to `${BACKEND_URL}/auth/google/callback`)

**Apple OAuth:** `src/api/utils/appleOAuth.ts`
- `isAppleOAuthConfigured()` - checks `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`
- `getAppleAuthUrl()` - generates Apple OAuth URL (throws if not configured)
- `handleAppleCallback(code, id_token)` - exchanges code for tokens, decodes ID token (throws if not configured)
- Uses `jsonwebtoken` for client secret generation
- Reads: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_REDIRECT_URL` (or defaults to `${BACKEND_URL}/auth/apple/callback`)

**Auth Service OAuth Method:** `src/services/authService.ts`

**oauthLogin(email, provider, providerId):**
- First tries to find user by `(oauth_provider, oauth_provider_id)`
- If not found, tries to find by email (for linking existing accounts)
- If not found, creates new user with:
  - `password_hash: null`
  - `oauth_provider: provider`
  - `oauth_provider_id: providerId`
- Generates JWT token (same format as email/password)
- Returns `{ user, token }` (same format as email/password)

### Frontend OAuth Integration

**Login Page:** `frontend/src/pages/Login.tsx`
- Feature flags:
  - `googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true'`
  - `appleOAuthEnabled = import.meta.env.VITE_APPLE_OAUTH_ENABLED === 'true'`
  - `showOAuthButtons = googleOAuthEnabled || appleOAuthEnabled`
- OAuth buttons only rendered if `showOAuthButtons === true`
- Google button calls `authApi.getGoogleAuthUrl()` then redirects to URL
- Apple button calls `authApi.getAppleAuthUrl()` then redirects to URL
- Handles error query params from OAuth redirects

**OAuth Callback Page:** `frontend/src/pages/OAuthCallback.tsx`
- Route: `/auth/callback`
- Reads `token` from query params
- Calls `/me` endpoint to verify token and get user
- Saves to `authStore` using same `login()` method
- Redirects to `/dashboard` on success
- Shows error and redirects to `/login` on failure

**API Client:** `frontend/src/api/auth.ts`
- `getGoogleAuthUrl()` - GET `/auth/google/url`
- `getAppleAuthUrl()` - GET `/auth/apple/url`

**Routing:** `frontend/src/App.tsx`
- `/auth/callback` route registered
- Uses `OAuthCallback` component

---

## 3. Logging & Monitoring Integration

### Pino Logging

**Location:** `src/api/utils/logger.ts`
- Structured logging with Pino
- Used in all auth routes:
  - `logger.error()` - for errors
  - `logger.warn()` - for warnings (e.g., OAuth not configured)
  - `logger.info()` - for successful OAuth logins
  - `logger.debug()` - for OAuth URL generation

**Auth Routes Logging:**
- `/auth/register` - logs errors
- `/auth/login` - logs errors
- `/auth/google/url` - logs warnings if not configured, errors on failure
- `/auth/google/callback` - logs info on success, errors on failure
- `/auth/apple/url` - logs warnings if not configured, errors on failure
- `/auth/apple/callback` - logs info on success, errors on failure

### Sentry Integration

**Location:** `src/api/routes/auth.ts`
- Sentry imported: `import * as Sentry from "@sentry/node"`
- Used in OAuth routes only (email/password routes don't need it as they use `formatError()`)
- `Sentry.captureException(error, { tags: { oauth_provider: "google|apple", endpoint: "/auth/..." } })`
- Captures errors in:
  - `/auth/google/url`
  - `/auth/google/callback`
  - `/auth/apple/url`
  - `/auth/apple/callback`

---

## 4. Backwards Compatibility Guarantees

### ✅ JWT Format Unchanged
- Same payload structure: `{ userId: string }`
- Same signing algorithm and expiration (7 days)
- Same verification logic
- Works for both email/password and OAuth users

### ✅ AuthStore Shape Unchanged
- Same interface: `{ user: User | null, token: string | null, plan: 'free' | 'pro' | null }`
- Same `login({ user, token })` method
- Same `logout()` method
- Same localStorage persistence
- OAuth users saved the same way as email/password users

### ✅ API Endpoints Unchanged
- `/auth/login` - same request/response format
- `/auth/register` - same request/response format
- `/me` - same response format (works for all user types)

### ✅ Email/Password Flow Unchanged
- Registration still requires email + password
- Login still requires email + password
- Password hashing still uses bcrypt (10 rounds)
- Error messages unchanged
- Rate limiting unchanged

### ✅ Database Compatibility
- Existing users with `password_hash` continue to work
- Migration is idempotent (safe to run multiple times)
- No data loss or corruption
- OAuth fields are nullable (don't affect existing users)

---

## 5. Feature Flags & Safety

### Frontend Feature Flags

**Location:** `frontend/src/pages/Login.tsx`
- `VITE_GOOGLE_OAUTH_ENABLED` - must be exactly `'true'` (string)
- `VITE_APPLE_OAUTH_ENABLED` - must be exactly `'true'` (string)
- Default behavior: if flags are unset or not `'true'`, OAuth buttons are **hidden**
- Email/password form always visible

### Backend Safety

**Configuration Checks:**
- All OAuth routes check `isGoogleOAuthConfigured()` or `isAppleOAuthConfigured()` first
- If not configured, routes return 400 with clear error message
- No crashes or unhandled errors
- Errors logged with Pino and captured in Sentry

**Error Handling:**
- Uses `formatError()` for production-safe error responses (no stack traces)
- All errors caught and handled gracefully
- OAuth utilities throw errors that are caught by route handlers

---

## 6. Current State Summary

### What Works Now

✅ **Email/Password Login:**
- Registration with email + password
- Login with email + password
- JWT token generation and validation
- Protected routes via `requireAuth` middleware
- Frontend authStore persistence

✅ **OAuth Infrastructure (Disabled by Default):**
- Database schema supports OAuth users
- Backend routes exist but return errors if not configured
- Frontend buttons exist but hidden unless feature flags set
- OAuth utilities ready but throw errors if not configured

### What's Required to Enable OAuth

**Backend (Railway):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URL` (optional, defaults to `${BACKEND_URL}/auth/google/callback`)
- `APPLE_CLIENT_ID`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`
- `APPLE_REDIRECT_URL` (optional, defaults to `${BACKEND_URL}/auth/apple/callback`)

**Frontend (Vercel):**
- `VITE_GOOGLE_OAUTH_ENABLED=true` (to show Google button)
- `VITE_APPLE_OAUTH_ENABLED=true` (to show Apple button)

### Default Behavior (No Env Vars Set)

- ✅ Email/password login works normally
- ✅ OAuth buttons are hidden
- ✅ OAuth routes return 400 errors if called directly
- ✅ No crashes or unhandled errors
- ✅ System behaves exactly as before OAuth was added

---

## 7. Files Modified/Added for OAuth

### Database
- `db/migrations/006_add_oauth_support.sql` - OAuth schema changes

### Backend
- `src/api/routes/auth.ts` - OAuth routes added
- `src/api/utils/googleOAuth.ts` - Google OAuth utility
- `src/api/utils/appleOAuth.ts` - Apple OAuth utility
- `src/services/authService.ts` - `oauthLogin()` method added
- `src/db/repositories/userRepository.ts` - `findByOAuthProvider()` method added

### Frontend
- `frontend/src/pages/Login.tsx` - OAuth buttons added (feature-flagged)
- `frontend/src/pages/OAuthCallback.tsx` - OAuth callback handler
- `frontend/src/api/auth.ts` - OAuth API methods added
- `frontend/src/App.tsx` - OAuth callback route added

### Documentation
- `OAUTH_SETUP.md` - Setup instructions
- `OAUTH_ENV_VARS.md` - Environment variables reference
- `OAUTH_FINALIZATION_CHECKLIST.md` - Testing checklist
- `OAUTH_IMPLEMENTATION_AUDIT.md` - Implementation audit
- `OAUTH_FINALIZATION_SUMMARY.md` - Finalization summary

---

## 8. Verification Checklist

- [x] Email/password registration works
- [x] Email/password login works
- [x] JWT tokens are valid and work with protected routes
- [x] AuthStore shape unchanged
- [x] OAuth routes exist but return errors when not configured
- [x] OAuth buttons hidden when feature flags not set
- [x] Migration is idempotent
- [x] Existing users unaffected
- [x] Pino logging integrated
- [x] Sentry error capture integrated
- [x] No breaking changes to existing APIs

---

**Status:** ✅ **System is production-ready and backwards compatible**


