import cors from "cors";
import type { CorsOptions } from "cors";
import { config } from "../../config.js";
import { logger } from "../utils/logger.js";

/**
 * CORS Configuration
 * 
 * Security-hardened CORS middleware that:
 * - Restricts origins to a defined whitelist
 * - Rejects unknown origins safely (no information leakage)
 * - Allows only necessary HTTP methods
 * - Properly handles credentials
 * 
 * Configuration:
 * - CORS_ALLOWED_ORIGINS: Comma-separated list of allowed origins
 * - Falls back to FRONTEND_URL if CORS_ALLOWED_ORIGINS not set
 * - In development, localhost origins are automatically allowed
 */

/**
 * Validate if an origin is in the allowed list
 * Returns true if origin is allowed, false otherwise
 */
function isOriginAllowed(origin: string | undefined): boolean {
  // No origin header = same-origin request (e.g., server-to-server, Postman, curl)
  // We allow these as they don't have browser CORS restrictions
  if (!origin) {
    return true;
  }

  return config.corsAllowedOrigins.includes(origin);
}

/**
 * CORS origin callback
 * Validates the request origin against the allowed list
 */
function corsOriginCallback(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  if (isOriginAllowed(origin)) {
    // Origin is allowed
    callback(null, true);
  } else {
    // Origin not allowed - log for monitoring but don't expose details
    logger.warn({
      blockedOrigin: origin,
      allowedOrigins: config.corsAllowedOrigins,
    }, "CORS request blocked from unauthorized origin");
    
    // Return false to reject the request
    // This sends no Access-Control-Allow-Origin header, causing browser to block
    callback(null, false);
  }
}

/**
 * CORS configuration options
 */
const corsOptions: CorsOptions = {
  // Origin validation - uses callback for dynamic checking
  origin: corsOriginCallback,

  // Allowed HTTP methods - only what the API actually uses
  // Removed PATCH as it's not used, prevents unexpected behavior
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  // Allowed headers - minimal set required for API operation
  allowedHeaders: [
    "Content-Type",      // Required for JSON requests
    "Authorization",     // Required for JWT auth
    "X-Requested-With",  // Common AJAX header
  ],

  // Exposed headers - headers the browser can access from the response
  // Empty by default - add specific headers if frontend needs them
  exposedHeaders: [],

  // Credentials support
  // Only enable if your frontend needs to send cookies or auth headers
  // When true, browser enforces stricter origin checking
  credentials: true,

  // Preflight caching - how long browsers cache preflight responses
  // 24 hours in production, shorter in development for easier debugging
  maxAge: config.isProduction ? 86400 : 600,

  // Don't pass preflight to next handler
  preflightContinue: false,

  // Success status for OPTIONS requests
  // 204 No Content is standard for preflight responses
  optionsSuccessStatus: 204,
};

/**
 * Configured CORS middleware
 * Use: app.use(corsMiddleware)
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Get current CORS configuration for debugging/health checks
 */
export function getCorsConfig() {
  return {
    allowedOrigins: config.corsAllowedOrigins,
    methods: corsOptions.methods,
    allowedHeaders: corsOptions.allowedHeaders,
    credentials: corsOptions.credentials,
    maxAge: corsOptions.maxAge,
  };
}

