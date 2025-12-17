import "dotenv/config";
import * as Sentry from "@sentry/node";
import { expressIntegration, expressErrorHandler } from "@sentry/node";
import express, { type Express } from "express";
import { fileURLToPath } from "url";
import { productRoutes } from "./routes/products.js";
import { variantRoutes } from "./routes/variants.js";
import { checkRoutes } from "./routes/checks.js";
import { authRoutes } from "./routes/auth.js";
import { trackedItemsRoutes } from "./routes/trackedItems.js";
import { adminRoutes } from "./routes/admin.js";
import { notificationRoutes } from "./routes/notifications.js";
import { userSettingsRoutes } from "./routes/userSettings.js";
import { userPlanRoutes } from "./routes/userPlan.js";
import { requestLoggingMiddleware } from "./middleware/requestLogging.js";
import { postRateLimiter } from "./middleware/rateLimiting.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { corsMiddleware, getCorsConfig } from "./middleware/corsMiddleware.js";
import { config } from "../config.js";
import { formatError, payloadTooLargeError, ErrorCodes } from "./utils/errors.js";
import { logger } from "./utils/logger.js";

// Initialize Sentry at the top, before creating the server
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      expressIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
    // Environment
    environment: process.env.NODE_ENV || config.appEnv,
    // Release tracking (optional, can be set via environment variable)
    release: process.env.APP_VERSION || undefined,
    // Only send stack traces in production (not in dev)
    beforeSend(event: any, hint: any) {
      // In development, don't send to Sentry (just log)
      if (config.isDevelopment) {
        logger.debug({ event }, "Sentry event (not sent in dev)");
        return null; // Don't send in dev
      }
      return event;
    },
  });
} else if (config.isProduction) {
  logger.warn("Sentry DSN not configured. Error monitoring disabled.");
}

/**
 * Create and configure Express server
 */
export function createServer(): Express {
  const app = express();

  // Sentry Express integration automatically handles request tracing
  // No need for separate middleware - expressIntegration() handles it

  // CORS middleware - Security-hardened with origin whitelist
  // Configure via CORS_ALLOWED_ORIGINS env var or falls back to FRONTEND_URL
  app.use(corsMiddleware);
  
  // Log CORS config on startup (development only)
  if (config.isDevelopment) {
    logger.info({ corsConfig: getCorsConfig() }, "CORS configuration loaded");
  }

  // Middleware
  // Request size limit: 1MB to prevent DoS attacks
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLoggingMiddleware);

  // Routes (rate limiting applied within route handlers)
  app.use("/auth", authRoutes);
  app.use("/products", productRoutes);
  app.use("/variants", variantRoutes);
  app.use("/checks", checkRoutes);
  
  // Protected routes under /me/* (require authentication)
  app.use("/me", requireAuth);
  app.use("/me/tracked-items", trackedItemsRoutes);
  app.use("/me/notifications", notificationRoutes);
  app.use("/me/settings", userSettingsRoutes);
  app.use("/me", userPlanRoutes);
  
  // Notification routes (require authentication) - new API under /notifications
  app.use("/notifications", requireAuth, notificationRoutes);
  
  // Admin routes (require authentication and admin role)
  app.use("/admin", adminRoutes);

  // Health check endpoint
  app.get("/health", async (req, res) => {
    try {
      // Test database connection
      const { query } = await import("../db/client.js");
      await query("SELECT 1");
      const dbStatus = "connected";

      // Get app version (async)
      const { getAppVersionAsync } = await import("../config.js");
      const appVersion = await getAppVersionAsync();

      res.json({
        status: "ok",
        version: appVersion,
        environment: config.appEnv,
        database: dbStatus,
        // Schedulers run in separate worker process
        // Use /health on the worker service to check scheduler status
        schedulers: {
          note: "Schedulers run in separate worker process",
          workerRequired: true,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const { getAppVersionAsync } = await import("../config.js");
      const appVersion = await getAppVersionAsync();

      res.status(503).json({
        status: "error",
        version: appVersion,
        environment: config.appEnv,
        database: "disconnected",
        // Only include error message in development
        ...(config.isDevelopment ? { error: error.message } : {}),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Handle payload too large errors (from express.json limit)
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      // Check for payload too large error
      if (err instanceof Error && (err as any).type === "entity.too.large") {
        return res.status(413).json(payloadTooLargeError("1MB"));
      }
      // Pass to next error handler
      next(err);
    }
  );

  // Sentry error handler must be before other error handlers
  // This captures errors and sends them to Sentry
  app.use(expressErrorHandler());

  // Final error handling middleware
  // This ensures all errors return valid JSON responses
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      // Log error for debugging (full details in logs, not in response)
      logger.error({
        error: err.message,
        stack: config.isDevelopment ? err.stack : undefined,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.id,
      }, "API error");

      // Format error for response (production-safe)
      const errorResponse = formatError(err);

      // Ensure response is JSON and has proper status code
      if (!res.headersSent) {
        // Determine appropriate status code based on error type
        let statusCode = 500;
        if (errorResponse.error.code === ErrorCodes.UNAUTHORIZED) {
          statusCode = 401;
        } else if (errorResponse.error.code === ErrorCodes.FORBIDDEN) {
          statusCode = 403;
        } else if (errorResponse.error.code === ErrorCodes.NOT_FOUND) {
          statusCode = 404;
        } else if (errorResponse.error.code === ErrorCodes.INVALID_REQUEST || 
                   errorResponse.error.code === ErrorCodes.INVALID_URL) {
          statusCode = 400;
        } else if (errorResponse.error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
          statusCode = 429;
        } else if (errorResponse.error.code === ErrorCodes.PAYLOAD_TOO_LARGE) {
          statusCode = 413;
        }

        res.status(statusCode).json(errorResponse);
      }
    }
  );

  return app;
}

/**
 * CLI entrypoint - start the server
 */
// Check if this is the main module using fileURLToPath for proper comparison
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && __filename === process.argv[1];

if (isMainModule) {
  // Validate config on startup
  try {
    const { validateConfig } = await import("../config.js");
    validateConfig();
  } catch (error: any) {
    logger.error({ error: error.message }, "Configuration validation failed");
    process.exit(1);
  }

  const app = createServer();
  const port = config.port;
  
  // Test database connection before starting server (BLOCKING)
  // This must complete before server starts listening to prevent 502 errors
  try {
    const { query } = await import("../db/client.js");
    await query("SELECT 1");
    logger.info({ environment: config.appEnv }, "Database connected");
  } catch (error: any) {
    logger.error({ error: error.message }, "Database connection failed");
    process.exit(1);
  }
  
  // NOTE: Schedulers now run in a separate worker process
  // Start the worker with: npm run start:worker
  // This allows independent scaling and process isolation
  logger.info("API server running without schedulers (use npm run start:worker for background jobs)");
  
  // Start server ONLY after database connection is verified
  app.listen(port, () => {
    logger.info({ port }, "Server running");
  });
}


