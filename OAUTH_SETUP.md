# OAuth Setup Guide

This document describes how to configure Google and Apple OAuth authentication for the application.

---

## Overview

The application supports three authentication methods:
1. **Email/Password** - Traditional email and password authentication
2. **Google OAuth** - Sign in with Google account
3. **Apple Sign-In** - Sign in with Apple ID

All authentication methods create users in the same `users` table and use the same JWT token system.

---

## Backend Configuration

### Environment Variables

Add the following environment variables to your Railway backend service:

#### Google OAuth

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=https://your-backend-url.railway.app/auth/google/callback
```

#### Apple Sign-In

```bash
APPLE_CLIENT_ID=com.yourcompany.yourapp
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=XYZ789ABCD
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_REDIRECT_URL=https://your-backend-url.railway.app/auth/apple/callback
```

**Note:** For `APPLE_PRIVATE_KEY`, you need to include the full private key with newlines. In Railway, you can paste the key directly (it will handle newlines), or use `\n` to represent newlines.

---

## Frontend Configuration

### Environment Variables

Add the following to your Vercel frontend environment variables:

```bash
VITE_API_BASE_URL=https://your-backend-url.railway.app
```

The frontend will automatically use this URL for OAuth redirects.

---

## Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen if prompted
6. Select **Web application** as the application type
7. Add authorized redirect URIs:
   - `https://your-backend-url.railway.app/auth/google/callback`
   - `http://localhost:3000/auth/google/callback` (for local development)
8. Copy the **Client ID** and **Client Secret**

### 2. Configure Backend

Add the credentials to Railway environment variables:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=https://your-backend-url.railway.app/auth/google/callback
```

### 3. Test

1. Visit your frontend login page
2. Click "Sign in with Google"
3. Complete the Google OAuth flow
4. You should be redirected back to the dashboard

---

## Apple Sign-In Setup

### 1. Create Apple Developer Account

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Sign in with your Apple Developer account
3. Navigate to **Certificates, Identifiers & Profiles**

### 2. Create App ID

1. Go to **Identifiers** → **App IDs**
2. Click the **+** button to create a new App ID
3. Select **App** and click **Continue**
4. Enter a description and Bundle ID (e.g., `com.yourcompany.yourapp`)
5. Enable **Sign In with Apple** capability
6. Click **Continue** and **Register**

### 3. Create Service ID

1. Go to **Identifiers** → **Services IDs**
2. Click the **+** button to create a new Service ID
3. Enter a description and Identifier (e.g., `com.yourcompany.yourapp.web`)
4. Enable **Sign In with Apple**
5. Click **Configure** next to "Sign In with Apple"
6. Add your domain and redirect URLs:
   - **Primary App ID:** Select your App ID
   - **Website URLs:**
     - `https://your-backend-url.railway.app`
   - **Return URLs:**
     - `https://your-backend-url.railway.app/auth/apple/callback`
7. Click **Save** and **Continue**, then **Register**

### 4. Create Key

1. Go to **Keys**
2. Click the **+** button to create a new key
3. Enter a key name (e.g., "Sign In with Apple Key")
4. Enable **Sign In with Apple**
5. Click **Configure** and select your Primary App ID
6. Click **Save** and **Continue**
7. Click **Register**
8. **Download the key file** (`.p8` file) - you can only download it once!
9. Note the **Key ID** shown on the page

### 5. Get Team ID

1. Go to **Membership** in the Apple Developer portal
2. Find your **Team ID** (e.g., `ABC123DEFG`)

### 6. Extract Private Key

1. Open the downloaded `.p8` file in a text editor
2. Copy the entire contents including:
   ```
   -----BEGIN PRIVATE KEY-----
   ...
   -----END PRIVATE KEY-----
   ```

### 7. Configure Backend

Add the following to Railway environment variables:

```bash
APPLE_CLIENT_ID=com.yourcompany.yourapp.web  # Service ID, not App ID
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=XYZ789ABCD
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_REDIRECT_URL=https://your-backend-url.railway.app/auth/apple/callback
```

**Important Notes:**
- Use the **Service ID** (not App ID) for `APPLE_CLIENT_ID`
- The private key must include the full key with newlines
- In Railway, you can paste the key directly or use `\n` for newlines

### 8. Test

1. Visit your frontend login page
2. Click "Sign in with Apple"
3. Complete the Apple Sign-In flow
4. You should be redirected back to the dashboard

---

## API Endpoints

### Google OAuth

#### GET `/auth/google/url`

Returns the Google OAuth authorization URL.

**Response:**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### GET `/auth/google/callback`

Handles the Google OAuth callback. Redirects to frontend with token.

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - Optional state parameter

**Redirects to:**
- Success: `https://app.restocked.now/auth/callback?token=<jwt>`
- Error: `https://app.restocked.now/login?error=<message>`

### Apple Sign-In

#### GET `/auth/apple/url`

Returns the Apple Sign-In authorization URL.

**Response:**
```json
{
  "url": "https://appleid.apple.com/auth/authorize?..."
}
```

#### POST `/auth/apple/callback`

Handles the Apple Sign-In callback. Redirects to frontend with token.

**Body:**
```json
{
  "code": "authorization_code",
  "id_token": "optional_id_token",
  "state": "optional_state"
}
```

**Redirects to:**
- Success: `https://app.restocked.now/auth/callback?token=<jwt>`
- Error: `https://app.restocked.now/login?error=<message>`

---

## User Creation

When a user signs in via OAuth for the first time:

1. The backend receives the OAuth callback with user email
2. The backend checks if a user with that email exists
3. If not, creates a new user with:
   - `email` - From OAuth provider
   - `password_hash` - `NULL` (OAuth users don't have passwords)
   - `plan` - `'free'` (default)
   - `role` - `'user'` (default)
4. Returns a JWT token and user object (same format as email/password login)

**Important:** OAuth users cannot use email/password login. They must use OAuth to sign in.

---

## Frontend Flow

1. User clicks "Sign in with Google" or "Sign in with Apple"
2. Frontend calls `/auth/google/url` or `/auth/apple/url`
3. Frontend redirects user to OAuth provider
4. User completes OAuth flow
5. OAuth provider redirects to backend callback URL
6. Backend processes OAuth callback and creates/logs in user
7. Backend redirects to frontend: `/auth/callback?token=<jwt>`
8. Frontend OAuth callback page:
   - Extracts token from URL
   - Calls `/me` to get user info
   - Saves token and user to authStore
   - Redirects to `/dashboard`

---

## Database Schema

The `users` table supports OAuth users:

```sql
CREATE TABLE users (
    id                UUID PRIMARY KEY,
    email             TEXT NOT NULL UNIQUE,
    password_hash     TEXT NULL,  -- NULL for OAuth users
    plan              TEXT NOT NULL DEFAULT 'free',
    role              TEXT NOT NULL DEFAULT 'user',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Migration:** `006_add_oauth_support.sql` makes `password_hash` nullable.

---

## Troubleshooting

### Google OAuth

**Error: "redirect_uri_mismatch"**
- Ensure `GOOGLE_REDIRECT_URL` matches exactly what's configured in Google Cloud Console
- Check for trailing slashes or protocol mismatches

**Error: "invalid_client"**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure credentials are for a "Web application" type

### Apple Sign-In

**Error: "invalid_client"**
- Verify `APPLE_CLIENT_ID` is the Service ID (not App ID)
- Ensure the Service ID has Sign In with Apple enabled

**Error: "invalid_grant"**
- Check that `APPLE_REDIRECT_URL` matches exactly what's configured in Apple Developer portal
- Verify the authorization code hasn't expired (they expire quickly)

**Error: "invalid_key"**
- Ensure `APPLE_PRIVATE_KEY` includes the full key with newlines
- Verify `APPLE_KEY_ID` matches the key you downloaded
- Check that `APPLE_TEAM_ID` is correct

**Error: "Email not provided"**
- Apple only provides email on the first authorization
- If user has already authorized, email may not be in the callback
- The backend will use the email from the ID token if available

---

## Security Considerations

1. **HTTPS Required:** OAuth providers require HTTPS in production
2. **State Parameter:** Consider implementing state parameter for CSRF protection
3. **Token Storage:** JWT tokens are stored in localStorage (same as email/password)
4. **Email Verification:** OAuth providers verify emails, so no additional verification needed
5. **Password Reset:** OAuth users cannot reset passwords (they don't have passwords)

---

## Testing Locally

### Backend

1. Set environment variables in `.env`:
   ```bash
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URL=http://localhost:3000/auth/google/callback
   ```

2. Add `http://localhost:3000/auth/google/callback` to Google OAuth redirect URIs

3. Run backend: `npm run dev`

### Frontend

1. Set `VITE_API_BASE_URL=http://localhost:3000` in `.env`

2. Run frontend: `npm run dev`

3. Test OAuth flow

---

## Production Checklist

- [ ] Google OAuth credentials configured in Railway
- [ ] Apple Sign-In credentials configured in Railway
- [ ] Redirect URLs match exactly in OAuth provider consoles
- [ ] Frontend `VITE_API_BASE_URL` points to production backend
- [ ] HTTPS enabled for both frontend and backend
- [ ] Database migration `006_add_oauth_support.sql` has been run
- [ ] Test Google OAuth flow end-to-end
- [ ] Test Apple Sign-In flow end-to-end
- [ ] Verify OAuth users can access all features
- [ ] Verify email/password login still works

---

## Support

For issues or questions:
1. Check backend logs in Railway
2. Check frontend console for errors
3. Verify environment variables are set correctly
4. Test OAuth URLs manually in browser
5. Check OAuth provider dashboards for error logs

