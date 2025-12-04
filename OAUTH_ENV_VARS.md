# OAuth Environment Variables

This document lists all required environment variables for OAuth functionality.

## Backend (Railway)

### Google OAuth
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=https://your-backend-url.railway.app/auth/google/callback
```

### Apple Sign-In
```bash
APPLE_CLIENT_ID=com.yourcompany.yourapp.web  # Service ID, not App ID
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=XYZ789ABCD
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_REDIRECT_URL=https://your-backend-url.railway.app/auth/apple/callback
```

### Existing (Required for OAuth)
```bash
JWT_SECRET=your-jwt-secret  # Already required
SENTRY_DSN=your-sentry-dsn  # Already configured
```

## Frontend (Vercel)

### Existing (Required for OAuth)
```bash
VITE_API_BASE_URL=https://your-backend-url.railway.app  # Already required
VITE_SENTRY_DSN=your-sentry-dsn  # Already configured
```

## Notes

- All OAuth environment variables are optional - if not set, OAuth routes will return errors
- Email/password authentication works independently of OAuth
- See `OAUTH_SETUP.md` for detailed setup instructions

