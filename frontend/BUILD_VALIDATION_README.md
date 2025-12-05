# Build-Time Environment Variable Validation

## Overview

The Vite build process now includes automatic validation of `VITE_API_BASE_URL` during production builds. This prevents deploying builds with missing or incorrect API URLs.

## What It Does

1. **Logs the environment variable value** during build
2. **Validates** that `VITE_API_BASE_URL` is set
3. **Rejects builds** if:
   - Variable is missing/undefined
   - Variable is empty string
   - Variable equals `http://localhost:3000` (development fallback)

## When It Runs

- ✅ **Production builds only** (`vite build` with `mode: 'production'`)
- ❌ **Not in development** (`vite dev`)
- ❌ **Not in preview** (`vite preview`)

## Build Output

### Success (Valid Variable)
```
🔍 Build-time Environment Variable Check:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_API_BASE_URL = https://restockednew-production.up.railway.app
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VITE_API_BASE_URL validated successfully
   Using: https://restockednew-production.up.railway.app
```

### Failure (Missing/Invalid Variable)
```
🔍 Build-time Environment Variable Check:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_API_BASE_URL = (undefined)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ VITE_API_BASE_URL missing — production build aborted.

📋 Required Action:
   1. Go to Vercel Dashboard → Project → Settings → Environment Variables
   2. Add variable: VITE_API_BASE_URL
   3. Set value: https://restockednew-production.up.railway.app
   4. Ensure it's applied to Production environment

Error: ❌ VITE_API_BASE_URL missing — production build aborted.
```

## Implementation

The validation is implemented as a Vite plugin in `vite.config.ts`:

```typescript
function validateApiBaseUrl(): Plugin {
  // Checks VITE_API_BASE_URL during buildStart hook
  // Only runs in production mode
  // Throws error if validation fails
}
```

## Testing

### Test with Missing Variable
```bash
# Unset the variable
unset VITE_API_BASE_URL

# Try to build
npm run build

# Expected: Build fails with error message
```

### Test with Localhost
```bash
# Set to localhost
export VITE_API_BASE_URL=http://localhost:3000

# Try to build
npm run build

# Expected: Build fails with error message
```

### Test with Valid Variable
```bash
# Set to production URL
export VITE_API_BASE_URL=https://restockednew-production.up.railway.app

# Try to build
npm run build

# Expected: Build succeeds with validation message
```

## Vercel Integration

When deploying to Vercel:

1. **Set the environment variable** in Vercel Dashboard
2. **Variable name must be:** `VITE_API_BASE_URL` (exact spelling)
3. **Value must be:** `https://restockednew-production.up.railway.app`
4. **Applied to:** Production environment

If the variable is missing or incorrect, the build will fail with a clear error message.

## Code Location

- **Plugin:** `frontend/vite.config.ts`
- **API Client:** `frontend/src/lib/apiClient.ts` (uses the variable)



