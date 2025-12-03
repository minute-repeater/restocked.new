import "dotenv/config";
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

/**
 * Create and configure Express server
 */
export function createServer(): Express {
  const app = express();

  // CORS middleware - allow requests from frontend
  // In production, support multiple origins (landing site + app)
  const allowedOrigins = config.isProduction
    ? [
        config.frontendUrl,
        // Support app subdomain if different
        config.frontendUrl.replace(/^https?:\/\//, "https://app."),
        config.frontendUrl.replace(/^https?:\/\//, "https://www."),
      ].filter(Boolean)
    : [config.frontendUrl];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        // In development, allow localhost
        if (config.isDevelopment && origin.includes("localhost")) {
          return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Middleware
  app.use(express.json());
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
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Error handling middleware
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error("API Error:", err);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          details: { message: err.message },
        },
      });
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
    console.error("Configuration validation failed:", error.message);
    process.exit(1);
  }

  const app = createServer();
  const port = config.port;
  
  // Test database connection before starting server
  (async () => {
    try {
      const { query } = await import("../db/client.js");
      await query("SELECT 1");
      console.log(`[Server] Database connected (${config.appEnv})`);
    } catch (error: any) {
      console.error("Database connection failed:", error.message);
      process.exit(1);
    }
  })();
  
  // Start scheduler service if enabled
  (async () => {
    try {
      const { schedulerService } = await import("../scheduler/schedulerService.js");
      const { schedulerConfig } = await import("../scheduler/schedulerConfig.js");
      
      if (schedulerConfig.ENABLE_SCHEDULER) {
        schedulerService.start();
        console.log(`[Server] Scheduler started with interval ${schedulerConfig.CHECK_INTERVAL_MINUTES} minutes`);
      } else {
        console.log("[Server] Scheduler is disabled");
      }
    } catch (error: any) {
      console.error("Failed to start scheduler:", error.message);
      // Don't exit - server can still run without scheduler
    }
  })();

  // Start email delivery scheduler (uses config)
  (async () => {
    try {
      const { emailDeliveryScheduler } = await import("../jobs/emailDeliveryScheduler.js");
      emailDeliveryScheduler.start();
      if (config.enableEmailScheduler) {
        console.log(`[Server] Email delivery scheduler started (interval: ${config.emailDeliveryIntervalMinutes} minutes)`);
      }
    } catch (error: any) {
      console.error("Failed to start email delivery scheduler:", error.message);
      // Don't exit - server can still run without email scheduler
    }
  })();

  // Start check scheduler (uses config)
  (async () => {
    try {
      const { checkScheduler } = await import("../jobs/checkScheduler.js");
      checkScheduler.start();
      if (config.enableCheckScheduler) {
        console.log(`[Server] Check scheduler started (interval: ${config.checkSchedulerIntervalMinutes} minutes)`);
      }
    } catch (error: any) {
      console.error("Failed to start check scheduler:", error.message);
      // Don't exit - server can still run without check scheduler
    }
  })();
  
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}


