import "dotenv/config";
import * as Sentry from "@sentry/node";
import { expressIntegration, expressErrorHandler } from "@sentry/node";
import express, { type Express } from "express";
import cors from "cors";
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
    beforeSend(event, hint) {
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

  // CORS middleware - allow requests from specific origins
  const allowedOrigins: string[] = [];
  
  // Add backend URL itself (for same-origin requests and OAuth callbacks)
  if (config.backendUrl) {
    allowedOrigins.push(config.backendUrl);
  }
  
  // Fallback: Add Railway production URL if BACKEND_URL env var is not set
  // This ensures OAuth callbacks work even if BACKEND_URL is missing
  if (config.isProduction && !config.backendUrl) {
    const railwayUrl = "https://restockednew-production.up.railway.app";
    allowedOrigins.push(railwayUrl);
    logger.warn({ railwayUrl }, "BACKEND_URL not set, using hardcoded Railway URL for CORS");
  }
  
  // Add FRONTEND_URL from environment if set
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Add production origins
  allowedOrigins.push(
    "https://app.restocked.now",
    "https://restocked.now"
  );
  
  // Add development origins
  if (!config.isProduction) {
    allowedOrigins.push(
      "http://localhost:3000",
      "http://localhost:5173"
    );
    if (config.frontendUrl) {
      allowedOrigins.push(config.frontendUrl);
    }
  }

  // Log allowed origins for debugging (without sensitive data)
  logger.info({ 
    allowedOriginsCount: allowedOrigins.length,
    hasBackendUrl: !!config.backendUrl,
    isProduction: config.isProduction
  }, "CORS configuration initialized");

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with NO origin (for curl, mobile, OAuth redirects, direct browser navigation)
        if (!origin) {
          return callback(null, true);
        }
        
        // If origin EXACTLY matches any allowedOrigins entry, allow it
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // If origin ends with ".vercel.app", allow it (for Vercel preview deployments)
        if (origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }
        
        // If origin ends with ".up.railway.app", allow it (for Railway deployments)
        if (origin.endsWith('.up.railway.app')) {
          return callback(null, true);
        }
        
        // Log rejected origin for debugging (in production, log without exposing sensitive data)
        if (config.isProduction) {
          logger.warn({ origin: origin.substring(0, 50) + "..." }, "CORS request rejected");
        } else {
          logger.warn({ origin, allowedOrigins }, "CORS request rejected");
        }
        
        // Otherwise reject
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    })
  );

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
  
  // Admin routes (require authentication and admin role)
  app.use("/admin", adminRoutes);

  // Health check endpoint
  app.get("/health", async (req, res) => {
    try {
      // Test database connection
      const { query } = await import("../db/client.js");
      await query("SELECT 1");
      const dbStatus = "connected";

      // Get scheduler statuses
      const { checkScheduler } = await import("../jobs/checkScheduler.js");
      const { emailDeliveryScheduler } = await import("../jobs/emailDeliveryScheduler.js");
      const checkSchedulerStatus = checkScheduler.getStatus();
      const emailSchedulerStatus = emailDeliveryScheduler.getStatus();

      // Get app version (async)
      const { getAppVersionAsync } = await import("../config.js");
      const appVersion = await getAppVersionAsync();

      res.json({
        status: "ok",
        version: appVersion,
        environment: config.appEnv,
        database: dbStatus,
        schedulers: {
          check: {
            enabled: checkSchedulerStatus.enabled,
            running: checkSchedulerStatus.isRunning,
            intervalMinutes: checkSchedulerStatus.intervalMinutes,
          },
          email: {
            enabled: emailSchedulerStatus.enabled,
            running: emailSchedulerStatus.isRunning,
            intervalMinutes: emailSchedulerStatus.intervalMinutes,
          },
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
  
  // Start scheduler service if enabled (non-blocking)
  (async () => {
    try {
      const { schedulerService } = await import("../scheduler/schedulerService.js");
      const { schedulerConfig } = await import("../scheduler/schedulerConfig.js");
      
      if (schedulerConfig.ENABLE_SCHEDULER) {
        schedulerService.start();
        logger.info({ intervalMinutes: schedulerConfig.CHECK_INTERVAL_MINUTES }, "Scheduler started");
      } else {
        logger.info("Scheduler is disabled");
      }
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to start scheduler");
      // Don't exit - server can still run without scheduler
    }
  })();

  // Start email delivery scheduler (uses config) (non-blocking)
  (async () => {
    try {
      const { emailDeliveryScheduler } = await import("../jobs/emailDeliveryScheduler.js");
      emailDeliveryScheduler.start();
      if (config.enableEmailScheduler) {
        logger.info({ intervalMinutes: config.emailDeliveryIntervalMinutes }, "Email delivery scheduler started");
      }
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to start email delivery scheduler");
      // Don't exit - server can still run without email scheduler
    }
  })();

  // Start check scheduler (uses config) (non-blocking)
  (async () => {
    try {
      const { checkScheduler } = await import("../jobs/checkScheduler.js");
      checkScheduler.start();
      if (config.enableCheckScheduler) {
        logger.info({ intervalMinutes: config.checkSchedulerIntervalMinutes }, "Check scheduler started");
      }
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to start check scheduler");
      // Don't exit - server can still run without check scheduler
    }
  })();
  
  // Start server ONLY after database connection is verified
  app.listen(port, () => {
    logger.info({ port }, "Server running");
  });
}


