# OAuth Safety Model

**Date:** 2025-12-04  
**Purpose:** Document how OAuth is safely disabled by default and how to enable it

---

## Overview

OAuth (Google + Apple) is **fully implemented** in the codebase but **disabled by default**. It will not be visible or functional until explicitly enabled via environment variables.

---

## Frontend Feature Flags

### Location
`frontend/src/pages/Login.tsx`

### Flags
- `VITE_GOOGLE_OAUTH_ENABLED` - Controls Google OAuth button visibility
- `VITE_APPLE_OAUTH_ENABLED` - Controls Apple OAuth button visibility

### Behavior

**When flags are NOT set or NOT equal to `'true'`:**
- ✅ OAuth buttons are **hidden** (not rendered)
- ✅ Email/password form is **always visible**
- ✅ Login page functions exactly as before OAuth was added
- ✅ No OAuth-related UI elements appear

**When flags ARE set to `'true'`:**
- ✅ OAuth buttons appear below email/password form
- ✅ Buttons are functional and call backend OAuth endpoints
- ✅ Email/password form remains visible and functional

### Implementation

```typescript
// Feature flags for OAuth providers
const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true';
const appleOAuthEnabled = import.meta.env.VITE_APPLE_OAUTH_ENABLED === 'true';
const showOAuthButtons = googleOAuthEnabled || appleOAuthEnabled;

// OAuth buttons only rendered if showOAuthButtons === true
{showOAuthButtons && (
  <>
    {/* OAuth buttons here */}
  </>
)}
```

**Key Safety Points:**
- Uses strict equality (`=== 'true'`) - only the string `'true'` enables OAuth
- Default behavior: if env var is unset, `undefined === 'true'` is `false`
- If env var is set to `'false'`, `'false' === 'true'` is `false`
- Only explicit `'true'` string enables OAuth

---

## Backend Safety

### Configuration Checks

All OAuth routes check configuration **before processing**:

**Google Routes:**
- `GET /auth/google/url` - Checks `isGoogleOAuthConfigured()` first
- `GET /auth/google/callback` - Checks `isGoogleOAuthConfigured()` first

**Apple Routes:**
- `GET /auth/apple/url` - Checks `isAppleOAuthConfigured()` first
- `POST /auth/apple/callback` - Checks `isAppleOAuthConfigured()` first

### Required Environment Variables

**Google OAuth:**
- `GOOGLE_CLIENT_ID` - Required
- `GOOGLE_CLIENT_SECRET` - Required
- `GOOGLE_REDIRECT_URL` - Optional (defaults to `${BACKEND_URL}/auth/google/callback`)

**Apple OAuth:**
- `APPLE_CLIENT_ID` - Required
- `APPLE_TEAM_ID` - Required
- `APPLE_KEY_ID` - Required
- `APPLE_PRIVATE_KEY` - Required
- `APPLE_REDIRECT_URL` - Optional (defaults to `${BACKEND_URL}/auth/apple/callback`)

### Behavior When Configuration is Missing

**URL Routes (`/auth/google/url`, `/auth/apple/url`):**
- ✅ Returns HTTP 400 with JSON error: `{ error: { code: "INVALID_REQUEST", message: "Google/Apple OAuth is not configured" } }`
- ✅ Logs warning with Pino: `logger.warn({ path: "/auth/..." }, "OAuth not configured")`
- ✅ No crashes, no unhandled errors
- ✅ Production-safe error response (no stack traces)

**Callback Routes (`/auth/google/callback`, `/auth/apple/callback`):**
- ✅ Checks configuration first (early return)
- ✅ Redirects to frontend login page with error: `/login?error=Google/Apple OAuth is not configured`
- ✅ Logs warning with Pino
- ✅ No crashes, no unhandled errors

**OAuth Utility Functions:**
- `getGoogleAuthUrl()` - Throws error if not configured (caught by route handler)
- `handleGoogleCallback()` - Throws error if not configured (caught by route handler)
- `getAppleAuthUrl()` - Throws error if not configured (caught by route handler)
- `handleAppleCallback()` - Throws error if not configured (caught by route handler)

### Error Handling

All OAuth routes use:
- ✅ `formatError()` for production-safe error responses (no stack traces)
- ✅ Pino structured logging (`logger.error()`, `logger.warn()`, `logger.info()`)
- ✅ Sentry error capture with tags (`oauth_provider`, `endpoint`)
- ✅ Try-catch blocks around all OAuth operations
- ✅ Graceful error responses (JSON for API routes, redirects for callbacks)

---

## What Happens When Flags/Envs Are Missing

### Scenario 1: No Frontend Flags Set

**Frontend:**
- ✅ OAuth buttons are **hidden**
- ✅ Email/password login works normally
- ✅ User sees no OAuth-related UI

**Backend:**
- ✅ OAuth routes exist but return errors if called
- ✅ Email/password routes work normally
- ✅ No impact on existing functionality

### Scenario 2: Frontend Flags Set, Backend Envs Missing

**Frontend:**
- ⚠️ OAuth buttons are **visible** (because flags are set)
- ⚠️ User can click OAuth buttons

**Backend:**
- ✅ OAuth routes return 400 errors with clear message
- ✅ User sees error message in UI
- ✅ No crashes, graceful degradation

**Recommendation:** Set backend env vars before enabling frontend flags to avoid user confusion.

### Scenario 3: Backend Envs Set, Frontend Flags Missing

**Frontend:**
- ✅ OAuth buttons are **hidden**
- ✅ User cannot access OAuth

**Backend:**
- ✅ OAuth routes are functional
- ✅ OAuth callbacks would work if accessed directly
- ✅ But user cannot initiate OAuth flow (no buttons)

**Recommendation:** Set frontend flags to enable OAuth UI.

### Scenario 4: Both Flags and Envs Set

**Frontend:**
- ✅ OAuth buttons are **visible**
- ✅ OAuth flow is functional

**Backend:**
- ✅ OAuth routes are functional
- ✅ OAuth callbacks work correctly
- ✅ Full OAuth flow operational

---

## Safety Guarantees

### ✅ No Auto-Enablement

- OAuth is **never** automatically enabled
- Requires explicit environment variable configuration
- Frontend requires explicit feature flag (`'true'` string)
- Backend requires explicit env vars

### ✅ No Breaking Changes

- Email/password login **unchanged**
- Existing users **unaffected**
- JWT format **unchanged**
- AuthStore shape **unchanged**
- API endpoints **unchanged**

### ✅ Graceful Degradation

- Missing config = clear error messages
- No crashes or unhandled errors
- Production-safe error responses
- Proper logging and monitoring

### ✅ Backwards Compatibility

- Existing code continues to work
- No assumptions about OAuth being enabled
- OAuth is purely additive
- Can be removed without breaking email/password

---

## How to Enable OAuth

### Step 1: Configure OAuth Providers

1. **Google Cloud Console:**
   - Create OAuth 2.0 credentials
   - Set authorized redirect URI: `https://your-backend.railway.app/auth/google/callback`
   - Copy Client ID and Client Secret

2. **Apple Developer Portal:**
   - Create Service ID
   - Configure Sign in with Apple
   - Set redirect URI: `https://your-backend.railway.app/auth/apple/callback`
   - Create private key and download
   - Copy Service ID, Team ID, Key ID, and private key

### Step 2: Set Backend Environment Variables (Railway)

Add to Railway project → Backend service → Variables:
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URL=https://your-backend.railway.app/auth/google/callback` (optional)
- `APPLE_CLIENT_ID=...`
- `APPLE_TEAM_ID=...`
- `APPLE_KEY_ID=...`
- `APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----`
- `APPLE_REDIRECT_URL=https://your-backend.railway.app/auth/apple/callback` (optional)

### Step 3: Set Frontend Environment Variables (Vercel)

Add to Vercel project → Settings → Environment Variables:
- `VITE_GOOGLE_OAUTH_ENABLED=true` (to show Google button)
- `VITE_APPLE_OAUTH_ENABLED=true` (to show Apple button)

### Step 4: Deploy

- Railway will auto-deploy backend
- Vercel will auto-deploy frontend
- OAuth buttons will appear and be functional

---

## How to Disable OAuth

### Option 1: Remove Frontend Flags (Recommended)

Remove or set to `false` in Vercel:
- `VITE_GOOGLE_OAUTH_ENABLED=false` (or remove)
- `VITE_APPLE_OAUTH_ENABLED=false` (or remove)

**Result:** OAuth buttons disappear, email/password continues to work.

### Option 2: Remove Backend Env Vars

Remove OAuth env vars from Railway.

**Result:** OAuth routes return 400 errors, no crashes.

### Option 3: Both

Remove both frontend flags and backend env vars.

**Result:** OAuth completely disabled, email/password unaffected.

---

## Verification Checklist

- [x] Frontend flags use strict equality (`=== 'true'`)
- [x] OAuth buttons only rendered when flags are `'true'`
- [x] Backend routes check configuration before processing
- [x] Missing config returns clear error messages
- [x] No crashes or unhandled errors
- [x] Production-safe error responses (no stack traces)
- [x] Proper logging and Sentry integration
- [x] Email/password login unaffected
- [x] No breaking changes to existing APIs

---

**Status:** ✅ **OAuth is safely disabled by default and requires explicit configuration to enable**

