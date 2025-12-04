# OAuth Environment Variables

This document lists all required environment variables for OAuth functionality.

## Backend (Railway)

### Google OAuth
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=https://your-backend-url.railway.app/auth/google/callback
# Note: GOOGLE_REDIRECT_URI is also supported as an alias
```

**Required:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`  
**Optional:** `GOOGLE_REDIRECT_URL` or `GOOGLE_REDIRECT_URI` (defaults to `${BACKEND_URL}/auth/google/callback`)

### Apple Sign-In
```bash
APPLE_CLIENT_ID=com.yourcompany.yourapp.web  # Service ID, not App ID
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=XYZ789ABCD
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_REDIRECT_URL=https://your-backend-url.railway.app/auth/apple/callback
# Note: APPLE_REDIRECT_URI is also supported as an alias
```

**Required:** `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`  
**Optional:** `APPLE_REDIRECT_URL` or `APPLE_REDIRECT_URI` (defaults to `${BACKEND_URL}/auth/apple/callback`)

### Existing (Required for OAuth)
```bash
JWT_SECRET=your-jwt-secret  # Already required
SENTRY_DSN=your-sentry-dsn  # Already configured
```

## Frontend (Vercel)

### OAuth Feature Flags
```bash
VITE_GOOGLE_OAUTH_ENABLED=true  # Set to 'true' to enable Google OAuth button
VITE_APPLE_OAUTH_ENABLED=true   # Set to 'true' to enable Apple OAuth button
```

**Note:** If these are not set or not 'true', OAuth buttons will be hidden. Email/password login always works.

### Existing (Required)
```bash
VITE_API_BASE_URL=https://your-backend-url.railway.app  # Already required
VITE_SENTRY_DSN=your-sentry-dsn  # Already configured
```

## Redirect URLs

The exact redirect URLs to configure in OAuth provider dashboards:

**Google Cloud Console:**
- `https://your-backend-url.railway.app/auth/google/callback`

**Apple Developer Portal:**
- `https://your-backend-url.railway.app/auth/apple/callback`

Replace `your-backend-url.railway.app` with your actual Railway backend URL.

## Notes

- All OAuth environment variables are optional - if not set, OAuth routes will return clean errors
- Email/password authentication works independently of OAuth
- OAuth buttons only appear when feature flags are enabled
- See `OAUTH_SETUP.md` for detailed setup instructions

