import jwt from "jsonwebtoken";
import { logger } from "./logger.js";
import { config } from "../../config.js";

/**
 * Apple OAuth configuration
 */
interface AppleConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  redirectUrl: string;
}

/**
 * Check if Apple OAuth is configured
 */
export function isAppleOAuthConfigured(): boolean {
  return !!(
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  );
}

/**
 * Get Apple OAuth configuration from environment variables
 */
function getAppleConfig(): AppleConfig {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  const redirectUrl = process.env.APPLE_REDIRECT_URL || process.env.APPLE_REDIRECT_URI || `${config.backendUrl}/auth/apple/callback`;

  if (!clientId || !teamId || !keyId || !privateKey) {
    throw new Error("Apple OAuth is not fully configured. Missing required environment variables.");
  }

  return {
    clientId,
    teamId,
    keyId,
    privateKey: privateKey.replace(/\\n/g, "\n"), // Handle newlines in env var
    redirectUrl,
  };
}

/**
 * Generate Apple client secret (JWT)
 * Apple requires a JWT signed with your private key
 */
function generateAppleClientSecret(): string {
  const appleConfig = getAppleConfig();

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: appleConfig.teamId,
    iat: now,
    exp: now + 3600, // 1 hour expiration
    aud: "https://appleid.apple.com",
    sub: appleConfig.clientId,
  };

  return jwt.sign(payload, appleConfig.privateKey, {
    algorithm: "ES256",
    keyid: appleConfig.keyId,
  });
}

/**
 * Generate Apple OAuth authorization URL
 * 
 * @param state - Optional state parameter for CSRF protection
 * @returns Authorization URL
 * @throws Error if Apple OAuth is not configured
 */
export function getAppleAuthUrl(state?: string): string {
  if (!isAppleOAuthConfigured()) {
    throw new Error("Apple OAuth is not configured. Missing required environment variables.");
  }
  
  const appleConfig = getAppleConfig();

  const params = new URLSearchParams({
    client_id: appleConfig.clientId,
    redirect_uri: appleConfig.redirectUrl,
    response_type: "code",
    scope: "email name",
    response_mode: "form_post", // Apple requires form_post for web
    ...(state && { state }),
  });

  const authUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;

  logger.debug({ authUrl: authUrl.substring(0, 100) + "..." }, "Generated Apple OAuth URL");
  return authUrl;
}

/**
 * Exchange authorization code for tokens and get user info
 * 
 * @param code - Authorization code from Apple callback
 * @param idToken - ID token from Apple (contains user info)
 * @returns User email and name information
 */
export async function handleAppleCallback(
  code: string,
  idToken?: string
): Promise<{
  email: string;
  providerId: string;
  name?: string;
}> {
  if (!isAppleOAuthConfigured()) {
    throw new Error("Apple OAuth is not configured. Missing required environment variables.");
  }
  
  const appleConfig = getAppleConfig();

  try {
    // If idToken is provided, decode it to get user info
    // Apple sends user info in the id_token on first authorization
    let email: string | undefined;
    let providerId: string | undefined;
    let name: string | undefined;

    if (idToken) {
      try {
        // Decode without verification (Apple will verify on token exchange)
        const decoded = jwt.decode(idToken) as any;
        email = decoded?.email?.toLowerCase();
        providerId = decoded?.sub; // Apple uses 'sub' claim for user ID
        name = decoded?.name ? `${decoded.name.firstName || ""} ${decoded.name.lastName || ""}`.trim() : undefined;
      } catch (error) {
        logger.warn({ error }, "Failed to decode Apple ID token");
      }
    }

    // Exchange code for tokens
    const clientSecret = generateAppleClientSecret();
    const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: appleConfig.clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: appleConfig.redirectUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Apple token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json() as { id_token?: string; access_token?: string; token_type?: string };

    // If we didn't get email/providerId from idToken, try to decode the returned id_token
    if (tokenData.id_token) {
      try {
        const decoded = jwt.decode(tokenData.id_token) as any;
        if (!email) {
          email = decoded?.email?.toLowerCase();
        }
        if (!providerId) {
          providerId = decoded?.sub; // Apple uses 'sub' claim for user ID
        }
      } catch (error) {
        logger.warn({ error }, "Failed to decode Apple ID token from token response");
      }
    }

    if (!email) {
      throw new Error("Apple account does not provide an email address. Email is required.");
    }

    if (!providerId) {
      throw new Error("Apple account does not provide a user ID. This is required.");
    }

    logger.info({ email, providerId }, "Apple OAuth callback successful");

    return {
      email,
      providerId,
      name: name || undefined,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, "Apple OAuth callback failed");
    throw new Error(`Apple authentication failed: ${error.message}`);
  }
}

