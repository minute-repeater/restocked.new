import { google } from "googleapis";
import { logger } from "./logger.js";
import { config } from "../../config.js";

/**
 * Google OAuth2 configuration
 */
// Lazy initialization of OAuth2 client to avoid errors if env vars are missing
function getOAuth2Client() {
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL || process.env.GOOGLE_REDIRECT_URI || `${config.backendUrl}/auth/google/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl
  );
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

/**
 * Generate Google OAuth authorization URL
 * 
 * @param state - Optional state parameter for CSRF protection
 * @returns Authorization URL
 * @throws Error if Google OAuth is not configured
 */
export function getGoogleAuthUrl(state?: string): string {
  if (!isGoogleOAuthConfigured()) {
    throw new Error("Google OAuth is not configured. Missing required environment variables.");
  }

  const oauth2Client = getOAuth2Client();
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: state || undefined,
  });

  logger.debug({ authUrl: authUrl.substring(0, 100) + "..." }, "Generated Google OAuth URL");
  return authUrl;
}

/**
 * Exchange authorization code for tokens and get user info
 * 
 * @param code - Authorization code from Google callback
 * @returns User email and profile information
 */
export async function handleGoogleCallback(code: string): Promise<{
  email: string;
  providerId: string;
  name?: string;
  picture?: string;
}> {
  if (!isGoogleOAuthConfigured()) {
    throw new Error("Google OAuth is not configured. Missing required environment variables.");
  }

  try {
    const oauth2Client = getOAuth2Client();
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email) {
      throw new Error("Google account does not have an email address");
    }

    if (!data.id) {
      throw new Error("Google account does not have a user ID");
    }

    logger.info({ email: data.email, providerId: data.id }, "Google OAuth callback successful");

    return {
      email: data.email.toLowerCase(),
      providerId: data.id,
      name: data.name || undefined,
      picture: data.picture || undefined,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, "Google OAuth callback failed");
    throw new Error(`Google authentication failed: ${error.message}`);
  }
}

