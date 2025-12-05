import { Router, type Request, type Response } from "express";
import { AuthService } from "../../services/authService.js";
import { validateAuthInput } from "../utils/validation.js";
import { logger } from "../utils/logger.js";
import * as Sentry from "@sentry/node";
import {
  invalidRequestError,
  internalError,
  createErrorResponse,
  ErrorCodes,
  formatError,
} from "../utils/errors.js";
import { postRateLimiter } from "../middleware/rateLimiting.js";
import { getGoogleAuthUrl, handleGoogleCallback, isGoogleOAuthConfigured } from "../utils/googleOAuth.js";
import { getAppleAuthUrl, handleAppleCallback, isAppleOAuthConfigured } from "../utils/appleOAuth.js";
import { config } from "../../config.js";

const router = Router();

// Initialize auth service
const authService = new AuthService();

/**
 * POST /auth/register
 * Register a new user
 * Body: { email, password }
 * Returns: { user, token }
 */
router.post("/register", postRateLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = validateAuthInput(req.body);
    if (!validation.valid) {
      return res.status(400).json(validation.error);
    }

    const { email, password } = validation.data;

    // Register user
    try {
      const result = await authService.registerUser(email, password);

      res.status(201).json({
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      // Handle duplicate email
      if (error.message === "Email already registered") {
        return res.status(409).json(
          createErrorResponse(
            ErrorCodes.INVALID_REQUEST,
            "Email already registered"
          )
        );
      }
      throw error;
    }
  } catch (error: any) {
    logger.error({ error: error.message, path: "/auth/register" }, "Error in POST /auth/register");
    const errorResponse = formatError(error);
    res.status(errorResponse.error.code === "UNAUTHORIZED" ? 401 : 500).json(errorResponse);
  }
});

/**
 * POST /auth/login
 * Login an existing user
 * Body: { email, password }
 * Returns: { user, token }
 */
router.post("/login", postRateLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = validateAuthInput(req.body);
    if (!validation.valid) {
      return res.status(400).json(validation.error);
    }

    const { email, password } = validation.data;

    // Login user
    try {
      const result = await authService.loginUser(email, password);

      res.status(200).json({
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      // Handle invalid credentials
      if (
        error.message === "Invalid email or password" ||
        error.message.includes("Invalid email or password")
      ) {
        return res.status(401).json(
          createErrorResponse(
            ErrorCodes.UNAUTHORIZED,
            "Invalid email or password"
          )
        );
      }
      throw error;
    }
  } catch (error: any) {
    logger.error({ error: error.message, path: "/auth/login" }, "Error in POST /auth/login");
    const errorResponse = formatError(error);
    res.status(errorResponse.error.code === "UNAUTHORIZED" ? 401 : 500).json(errorResponse);
  }
});

/**
 * GET /auth/google/config-status
 * Check Google OAuth configuration status (diagnostic endpoint)
 * Returns: { googleOAuthConfigured, clientIdPresent, clientSecretPresent, redirectUrl }
 */
router.get("/google/config-status", async (req: Request, res: Response) => {
  try {
    const clientIdPresent = !!process.env.GOOGLE_CLIENT_ID;
    const clientSecretPresent = !!process.env.GOOGLE_CLIENT_SECRET;
    const googleOAuthConfigured = isGoogleOAuthConfigured();
    
    // Get redirect URL (same logic as googleOAuth.ts)
    const redirectUrl = process.env.GOOGLE_REDIRECT_URL || 
                       process.env.GOOGLE_REDIRECT_URI || 
                       `${config.backendUrl}/auth/google/callback`;

    res.json({
      googleOAuthConfigured,
      clientIdPresent,
      clientSecretPresent,
      redirectUrl,
    });
  } catch (error: any) {
    logger.error({ error: error.message, path: "/auth/google/config-status" }, "Error in GET /auth/google/config-status");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /auth/google/url
 * Get Google OAuth authorization URL
 * Returns: { url: string }
 */
router.get("/google/url", async (req: Request, res: Response) => {
  try {
    if (!isGoogleOAuthConfigured()) {
      logger.warn({ path: "/auth/google/url" }, "Google OAuth not configured");
      return res.status(400).json(
        createErrorResponse(
          ErrorCodes.INVALID_REQUEST,
          "Google OAuth is not configured"
        )
      );
    }

    const authUrl = getGoogleAuthUrl();
    res.json({ url: authUrl });
  } catch (error: any) {
    logger.error({ error: error.message, path: "/auth/google/url" }, "Error in GET /auth/google/url");
    Sentry.captureException(error, {
      tags: { oauth_provider: "google", endpoint: "/auth/google/url" },
    });
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 * Query params: { code, state? }
 * Redirects to frontend with token
 */
router.get("/google/callback", async (req: Request, res: Response) => {
  try {
    // Check configuration first
    if (!isGoogleOAuthConfigured()) {
      logger.warn({ path: "/auth/google/callback" }, "Google OAuth not configured");
      const frontendErrorUrl = `${config.frontendUrl}/login?error=${encodeURIComponent("Google OAuth is not configured")}`;
      return res.redirect(frontendErrorUrl);
    }

    const { code, state } = req.query;

    if (!code || typeof code !== "string") {
      logger.warn({ query: req.query }, "Google OAuth callback missing code parameter");
      const frontendErrorUrl = `${config.frontendUrl}/login?error=${encodeURIComponent("Authorization failed. Please try again.")}`;
      return res.redirect(frontendErrorUrl);
    }

    // Get user info from Google
    const googleUser = await handleGoogleCallback(code);

    // Create or login user
    const result = await authService.oauthLogin(googleUser.email, 'google', googleUser.providerId);

    logger.info({ 
      email: googleUser.email, 
      userId: result.user.id, 
      provider: 'google' 
    }, "Google OAuth login successful");

    // Redirect to frontend with token
    const frontendCallbackUrl = `${config.frontendUrl}/auth/callback?token=${encodeURIComponent(result.token)}`;
    res.redirect(frontendCallbackUrl);
  } catch (error: any) {
    logger.error({ error: error.message, path: "/auth/google/callback" }, "Error in GET /auth/google/callback");
    Sentry.captureException(error, {
      tags: { oauth_provider: "google", endpoint: "/auth/google/callback" },
    });
    const errorResponse = formatError(error);
    // Redirect to login page with error
    const frontendErrorUrl = `${config.frontendUrl}/login?error=${encodeURIComponent(errorResponse.error.message)}`;
    res.redirect(frontendErrorUrl);
  }
});

/**
 * GET /auth/apple/url
 * Get Apple OAuth authorization URL
 * Returns: { url: string }
 */
router.get("/apple/url", async (req: Request, res: Response) => {
  try {
    if (!isAppleOAuthConfigured()) {
      logger.warn({ path: "/auth/apple/url" }, "Apple OAuth not configured");
      return res.status(400).json(
        createErrorResponse(
          ErrorCodes.INVALID_REQUEST,
          "Apple OAuth is not configured"
        )
      );
    }

    const authUrl = getAppleAuthUrl();
    res.json({ url: authUrl });
  } catch (error: any) {
    logger.error({ error: error.message, path: "/auth/apple/url" }, "Error in GET /auth/apple/url");
    Sentry.captureException(error, {
      tags: { oauth_provider: "apple", endpoint: "/auth/apple/url" },
    });
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /auth/apple/callback
 * Handle Apple OAuth callback (Apple uses POST for callback)
 * Body: { code, id_token?, state? }
 * Redirects to frontend with token
 */
router.post("/apple/callback", async (req: Request, res: Response) => {
  try {
    // Check configuration first
    if (!isAppleOAuthConfigured()) {
      logger.warn({ path: "/auth/apple/callback" }, "Apple OAuth not configured");
      const frontendErrorUrl = `${config.frontendUrl}/login?error=${encodeURIComponent("Apple OAuth is not configured")}`;
      return res.redirect(frontendErrorUrl);
    }

    const { code, id_token, state } = req.body;

    if (!code || typeof code !== "string") {
      logger.warn({ body: { ...req.body, id_token: id_token ? "[REDACTED]" : undefined } }, "Apple OAuth callback missing code parameter");
      const frontendErrorUrl = `${config.frontendUrl}/login?error=${encodeURIComponent("Authorization failed. Please try again.")}`;
      return res.redirect(frontendErrorUrl);
    }

    // Get user info from Apple
    const appleUser = await handleAppleCallback(code, id_token);

    // Create or login user
    const result = await authService.oauthLogin(appleUser.email, 'apple', appleUser.providerId);

    logger.info({ 
      email: appleUser.email, 
      userId: result.user.id, 
      provider: 'apple' 
    }, "Apple OAuth login successful");

    // Redirect to frontend with token
    const frontendCallbackUrl = `${config.frontendUrl}/auth/callback?token=${encodeURIComponent(result.token)}`;
    res.redirect(frontendCallbackUrl);
  } catch (error: any) {
    logger.error({ error: error.message, path: "/auth/apple/callback" }, "Error in POST /auth/apple/callback");
    Sentry.captureException(error, {
      tags: { oauth_provider: "apple", endpoint: "/auth/apple/callback" },
    });
    const errorResponse = formatError(error);
    // Redirect to login page with error
    const frontendErrorUrl = `${config.frontendUrl}/login?error=${encodeURIComponent(errorResponse.error.message)}`;
    res.redirect(frontendErrorUrl);
  }
});

export { router as authRoutes };


