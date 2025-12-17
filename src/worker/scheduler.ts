#!/usr/bin/env node
/**
 * Scheduler Worker Process
 * 
 * Dedicated worker for running scheduled background jobs.
 * Separated from the API server for:
 * - Independent scaling (can run multiple API servers, single scheduler)
 * - Process isolation (scheduler crash doesn't affect API)
 * - Resource management (scheduler can use more memory for Playwright)
 * 
 * Uses PostgreSQL advisory locks to prevent duplicate concurrent runs
 * when multiple worker instances are deployed.
 * 
 * Includes a minimal HTTP server for health checks:
 * - GET /healthz → Liveness probe (returns 200 if worker is alive)
 * - GET /readyz  → Readiness probe (returns 200 if worker has lock and is processing)
 * - GET /status  → Detailed status (scheduler states, next runs, etc.)
 * 
 * Usage:
 *   npm run start:worker
 *   node dist/worker/scheduler.js
 * 
 * Environment Variables:
 *   WORKER_PORT=3001               - Health check server port (default: 3001)
 *   ENABLE_SCHEDULER=true          - Master switch for all schedulers
 *   ENABLE_CHECK_SCHEDULER=true    - Product check scheduler
 *   ENABLE_EMAIL_SCHEDULER=true    - Email delivery scheduler
 *   ENABLE_TRACKING_SCHEDULER=true - Variant tracking scheduler
 */

import "dotenv/config";
import * as http from "http";
import * as Sentry from "@sentry/node";
import { config, validateConfig, getAppVersionAsync } from "../config.js";
import { logger } from "../api/utils/logger.js";
import { query, closePool, getPool } from "../db/client.js";
import { 
  withLock, 
  SchedulerLockIds, 
  getAllLockStatuses,
  releaseLock 
} from "./advisoryLock.js";

// ============================================================================
// Sentry Initialization
// ============================================================================

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || config.appEnv,
    release: process.env.APP_VERSION || undefined,
    beforeSend(event) {
      if (config.isDevelopment) {
        logger.debug({ event }, "Sentry event (not sent in dev)");
        return null;
      }
      return event;
    },
  });
  logger.info("Sentry initialized for scheduler worker");
} else if (config.isProduction) {
  logger.warn("Sentry DSN not configured for scheduler worker");
}

// ============================================================================
// Worker State
// ============================================================================

interface WorkerState {
  isShuttingDown: boolean;
  activeJobs: Set<string>;
  startedAt: Date;
  hasMainLock: boolean;
  schedulersStarted: number;
  lastHeartbeat: Date;
}

const workerState: WorkerState = {
  isShuttingDown: false,
  activeJobs: new Set(),
  startedAt: new Date(),
  hasMainLock: false,
  schedulersStarted: 0,
  lastHeartbeat: new Date(),
};

// Health check server port (default: 3001, or next available after API server)
const WORKER_PORT = parseInt(process.env.WORKER_PORT || "3001", 10);

// ============================================================================
// Health Check HTTP Server
// ============================================================================

let healthServer: http.Server | null = null;

/**
 * Start minimal HTTP server for health checks
 * This allows Railway/K8s to monitor worker liveness
 */
function startHealthServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    healthServer = http.createServer(async (req, res) => {
      const url = req.url || "/";
      
      // Set JSON content type for all responses
      res.setHeader("Content-Type", "application/json");
      
      try {
        // GET /healthz - Liveness probe
        // Returns 200 if process is alive (even if not ready)
        if (url === "/healthz" || url === "/health") {
          const response = {
            ok: true,
            uptime: Math.round((Date.now() - workerState.startedAt.getTime()) / 1000),
            lockHeld: workerState.hasMainLock,
            shuttingDown: workerState.isShuttingDown,
            timestamp: new Date().toISOString(),
          };
          res.statusCode = workerState.isShuttingDown ? 503 : 200;
          res.end(JSON.stringify(response));
          return;
        }
        
        // GET /readyz - Readiness probe
        // Returns 200 only if worker is fully ready (has lock, schedulers running)
        if (url === "/readyz" || url === "/ready") {
          const isReady = workerState.hasMainLock && 
                          !workerState.isShuttingDown && 
                          workerState.schedulersStarted > 0;
          
          const response = {
            ready: isReady,
            lockHeld: workerState.hasMainLock,
            schedulersStarted: workerState.schedulersStarted,
            shuttingDown: workerState.isShuttingDown,
            timestamp: new Date().toISOString(),
          };
          res.statusCode = isReady ? 200 : 503;
          res.end(JSON.stringify(response));
          return;
        }
        
        // GET /status - Detailed status
        // Returns full scheduler status for debugging/monitoring
        if (url === "/status") {
          const status = await getWorkerStatus();
          res.statusCode = 200;
          res.end(JSON.stringify(status, null, 2));
          return;
        }
        
        // GET /metrics - Simple metrics (could be Prometheus format in future)
        if (url === "/metrics") {
          const uptime = Math.round((Date.now() - workerState.startedAt.getTime()) / 1000);
          const metrics = {
            worker_uptime_seconds: uptime,
            worker_lock_held: workerState.hasMainLock ? 1 : 0,
            worker_schedulers_active: workerState.schedulersStarted,
            worker_active_jobs: workerState.activeJobs.size,
            worker_shutting_down: workerState.isShuttingDown ? 1 : 0,
          };
          res.statusCode = 200;
          res.end(JSON.stringify(metrics));
          return;
        }
        
        // 404 for unknown paths
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Not found", path: url }));
        
      } catch (error) {
        logger.error({ error, url }, "Health check endpoint error");
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
    
    healthServer.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        logger.warn({ port: WORKER_PORT }, "Health check port in use, trying next port");
        // Try next port
        healthServer?.listen(WORKER_PORT + 1, () => {
          logger.info({ port: WORKER_PORT + 1 }, "Health check server started (alternate port)");
          resolve();
        });
      } else {
        logger.error({ error }, "Failed to start health check server");
        reject(error);
      }
    });
    
    healthServer.listen(WORKER_PORT, () => {
      logger.info({ port: WORKER_PORT }, "Health check server started");
      resolve();
    });
  });
}

/**
 * Stop the health check server
 */
function stopHealthServer(): Promise<void> {
  return new Promise((resolve) => {
    if (healthServer) {
      healthServer.close(() => {
        logger.info("Health check server stopped");
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// ============================================================================
// Scheduler Instances (lazy-loaded)
// ============================================================================

let schedulerService: typeof import("../scheduler/schedulerService.js").schedulerService | null = null;
let checkScheduler: typeof import("../jobs/checkScheduler.js").checkScheduler | null = null;
let emailDeliveryScheduler: typeof import("../jobs/emailDeliveryScheduler.js").emailDeliveryScheduler | null = null;
let trackingScheduler: typeof import("../jobs/trackingScheduler.js").trackingScheduler | null = null;

/**
 * Load scheduler modules
 */
async function loadSchedulers(): Promise<void> {
  logger.info("Loading scheduler modules...");
  
  const { schedulerService: ss } = await import("../scheduler/schedulerService.js");
  schedulerService = ss;
  
  const { checkScheduler: cs } = await import("../jobs/checkScheduler.js");
  checkScheduler = cs;
  
  const { emailDeliveryScheduler: eds } = await import("../jobs/emailDeliveryScheduler.js");
  emailDeliveryScheduler = eds;
  
  const { trackingScheduler: ts } = await import("../jobs/trackingScheduler.js");
  trackingScheduler = ts;
  
  logger.info("Scheduler modules loaded");
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Handle graceful shutdown
 * Stops all schedulers and releases locks before exiting
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (workerState.isShuttingDown) {
    logger.warn({ signal }, "Shutdown already in progress, forcing exit");
    process.exit(1);
  }
  
  workerState.isShuttingDown = true;
  logger.info({ signal }, "Graceful shutdown initiated");
  
  // Stop all schedulers
  try {
    logger.info("Stopping schedulers...");
    
    if (schedulerService) {
      schedulerService.stop();
      logger.info("Main scheduler stopped");
    }
    
    if (checkScheduler) {
      checkScheduler.stop();
      logger.info("Check scheduler stopped");
    }
    
    if (emailDeliveryScheduler) {
      emailDeliveryScheduler.stop();
      logger.info("Email delivery scheduler stopped");
    }
    
    if (trackingScheduler) {
      trackingScheduler.stop();
      logger.info("Tracking scheduler stopped");
    }
  } catch (error) {
    logger.error({ error }, "Error stopping schedulers");
  }
  
  // Release all advisory locks
  try {
    logger.info("Releasing advisory locks...");
    await releaseLock(SchedulerLockIds.MAIN_SCHEDULER);
    await releaseLock(SchedulerLockIds.PRODUCT_CHECK);
    await releaseLock(SchedulerLockIds.EMAIL_DELIVERY);
    await releaseLock(SchedulerLockIds.TRACKING);
    logger.info("Advisory locks released");
  } catch (error) {
    logger.error({ error }, "Error releasing advisory locks");
  }
  
  // Wait for active jobs to complete (with timeout)
  if (workerState.activeJobs.size > 0) {
    logger.info(
      { activeJobs: Array.from(workerState.activeJobs) },
      "Waiting for active jobs to complete..."
    );
    
    // Wait up to 30 seconds for jobs to finish
    const maxWait = 30000;
    const checkInterval = 1000;
    let waited = 0;
    
    while (workerState.activeJobs.size > 0 && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }
    
    if (workerState.activeJobs.size > 0) {
      logger.warn(
        { activeJobs: Array.from(workerState.activeJobs) },
        "Timeout waiting for jobs, forcing shutdown"
      );
    }
  }
  
  // Stop health check server
  try {
    await stopHealthServer();
  } catch (error) {
    logger.error({ error }, "Error stopping health check server");
  }
  
  // Close database pool
  try {
    logger.info("Closing database connections...");
    await closePool();
    logger.info("Database connections closed");
  } catch (error) {
    logger.error({ error }, "Error closing database pool");
  }
  
  const uptime = Math.round((Date.now() - workerState.startedAt.getTime()) / 1000);
  logger.info({ uptime: `${uptime}s` }, "Scheduler worker shutdown complete");
  
  process.exit(0);
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error({ error: error.message, stack: error.stack }, "Uncaught exception in scheduler worker");
  Sentry.captureException(error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled rejection in scheduler worker");
  Sentry.captureException(reason);
});

// ============================================================================
// Worker Status Endpoint (Optional Health Check)
// ============================================================================

/**
 * Get worker status for health checks
 */
export async function getWorkerStatus(): Promise<{
  status: "ok" | "degraded" | "error";
  uptime: number;
  uptimeFormatted: string;
  startedAt: string;
  lastHeartbeat: string;
  pid: number;
  lockHeld: boolean;
  schedulersStarted: number;
  schedulers: Record<string, any>;
  locks: Record<string, boolean>;
  activeJobs: string[];
  isShuttingDown: boolean;
  healthPort: number;
}> {
  const uptime = Math.round((Date.now() - workerState.startedAt.getTime()) / 1000);
  
  // Format uptime as human-readable
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;
  
  const schedulers = {
    main: schedulerService?.getStatus() ?? { enabled: false },
    check: checkScheduler?.getStatus() ?? { enabled: false },
    email: emailDeliveryScheduler?.getStatus() ?? { enabled: false },
    tracking: trackingScheduler?.getStatus() ?? { enabled: false },
  };
  
  const locks = await getAllLockStatuses();
  
  // Determine overall status
  let status: "ok" | "degraded" | "error" = "ok";
  if (workerState.isShuttingDown) {
    status = "degraded";
  } else if (!workerState.hasMainLock) {
    status = "error";
  } else if (workerState.schedulersStarted === 0) {
    status = "degraded";
  }
  
  return {
    status,
    uptime,
    uptimeFormatted,
    startedAt: workerState.startedAt.toISOString(),
    lastHeartbeat: workerState.lastHeartbeat.toISOString(),
    pid: process.pid,
    lockHeld: workerState.hasMainLock,
    schedulersStarted: workerState.schedulersStarted,
    schedulers,
    locks,
    activeJobs: Array.from(workerState.activeJobs),
    isShuttingDown: workerState.isShuttingDown,
    healthPort: WORKER_PORT,
  };
}

// ============================================================================
// Telegram Boot Ping
// ============================================================================

/**
 * Send a Telegram test ping on worker boot (if enabled)
 * Controlled by TELEGRAM_TEST_ON_BOOT env var
 */
async function sendTelegramBootPing(): Promise<void> {
  const shouldPing = process.env.TELEGRAM_TEST_ON_BOOT === "true";
  
  if (!shouldPing) {
    logger.debug("Telegram boot ping disabled (TELEGRAM_TEST_ON_BOOT != true)");
    return;
  }
  
  try {
    const { sendWorkerBootPing, isTelegramConfigured, logTelegramConfig } = await import("../services/telegramService.js");
    
    // Log config status for debugging
    logTelegramConfig();
    
    if (!isTelegramConfigured()) {
      logger.warn("Telegram boot ping enabled but not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)");
      return;
    }
    
    const success = await sendWorkerBootPing();
    
    if (success) {
      logger.info("✅ Telegram test ping sent successfully");
    } else {
      logger.error("❌ Telegram test ping failed - check logs above for details");
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to send Telegram boot ping"
    );
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  logger.info("═══════════════════════════════════════════════════════════");
  logger.info("Starting Scheduler Worker Process");
  logger.info("═══════════════════════════════════════════════════════════");
  
  // Start health check server early (so we can report status during startup)
  try {
    await startHealthServer();
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to start health server (non-fatal)");
    // Continue without health server - not fatal
  }
  
  // Validate configuration
  try {
    validateConfig();
    logger.info({ environment: config.appEnv }, "Configuration validated");
  } catch (error: any) {
    logger.error({ error: error.message }, "Configuration validation failed");
    process.exit(1);
  }
  
  // Test database connection
  try {
    await query("SELECT 1");
    logger.info("Database connection verified");
  } catch (error: any) {
    logger.error({ error: error.message }, "Database connection failed");
    process.exit(1);
  }
  
  // Acquire main scheduler lock
  // This prevents multiple scheduler workers from running simultaneously
  // Note: We manually manage this lock for the lifetime of the worker
  const { tryAcquireLock } = await import("./advisoryLock.js");
  const hasMainLock = await tryAcquireLock(SchedulerLockIds.MAIN_SCHEDULER);
  
  if (!hasMainLock) {
    logger.warn("Another scheduler worker is already running. Exiting.");
    // Keep health server running briefly so orchestrator sees clean exit
    setTimeout(() => process.exit(0), 1000);
    return;
  }
  
  workerState.hasMainLock = true;
  logger.info("Main scheduler lock acquired - this worker is the leader");
  
  // Load scheduler modules
  await loadSchedulers();
  
  // Log configuration
  const appVersion = await getAppVersionAsync();
  logger.info({
    version: appVersion,
    environment: config.appEnv,
    enableScheduler: config.enableScheduler,
    enableCheckScheduler: config.enableCheckScheduler,
    enableEmailScheduler: config.enableEmailScheduler,
    checkSchedulerIntervalMinutes: config.checkSchedulerIntervalMinutes,
    emailDeliveryIntervalMinutes: config.emailDeliveryIntervalMinutes,
  }, "Scheduler configuration");
  
  // Start schedulers based on configuration
  
  // 1. Main Scheduler Service (product ingestion)
  if (config.enableScheduler && schedulerService) {
    try {
      schedulerService.start();
      workerState.schedulersStarted++;
      logger.info("Main scheduler service started");
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to start main scheduler service");
    }
  } else {
    logger.info("Main scheduler service is disabled");
  }
  
  // 2. Check Scheduler (background product checks)
  if (config.enableCheckScheduler && checkScheduler) {
    try {
      checkScheduler.start();
      workerState.schedulersStarted++;
      logger.info(
        { intervalMinutes: config.checkSchedulerIntervalMinutes },
        "Check scheduler started"
      );
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to start check scheduler");
    }
  } else {
    logger.info("Check scheduler is disabled");
  }
  
  // 3. Email Delivery Scheduler
  if (config.enableEmailScheduler && emailDeliveryScheduler) {
    try {
      emailDeliveryScheduler.start();
      workerState.schedulersStarted++;
      logger.info(
        { intervalMinutes: config.emailDeliveryIntervalMinutes },
        "Email delivery scheduler started"
      );
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to start email delivery scheduler");
    }
  } else {
    logger.info("Email delivery scheduler is disabled");
  }
  
  // 4. Tracking Scheduler
  const enableTrackingScheduler = process.env.ENABLE_TRACKING_SCHEDULER !== "false";
  if (enableTrackingScheduler && trackingScheduler) {
    try {
      trackingScheduler.start();
      workerState.schedulersStarted++;
      const status = trackingScheduler.getStatus();
      logger.info(
        { 
          intervalMinutes: status.intervalMinutes,
          concurrency: status.concurrency,
        },
        "Tracking scheduler started"
      );
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to start tracking scheduler");
    }
  } else {
    logger.info("Tracking scheduler is disabled");
  }
  
  // Final status
  logger.info("═══════════════════════════════════════════════════════════");
  logger.info(
    { 
      schedulersStarted: workerState.schedulersStarted, 
      pid: process.pid,
      healthPort: WORKER_PORT,
    },
    "Scheduler Worker Ready"
  );
  logger.info("═══════════════════════════════════════════════════════════");
  
  if (workerState.schedulersStarted === 0) {
    logger.warn("No schedulers are enabled. Worker will stay alive but idle.");
  }
  
  // Send Telegram boot ping (if enabled via TELEGRAM_TEST_ON_BOOT=true)
  await sendTelegramBootPing();
  
  // Keep the process alive
  // The worker will run until a shutdown signal is received
  // Log periodic heartbeat for monitoring
  setInterval(() => {
    if (!workerState.isShuttingDown) {
      workerState.lastHeartbeat = new Date();
      const status = {
        uptime: Math.round((Date.now() - workerState.startedAt.getTime()) / 1000),
        activeJobs: workerState.activeJobs.size,
        lockHeld: workerState.hasMainLock,
        schedulers: {
          main: schedulerService?.getStatus().isRunning ?? false,
          check: checkScheduler?.getStatus().isRunning ?? false,
          email: emailDeliveryScheduler?.getStatus().isRunning ?? false,
          tracking: trackingScheduler?.getStatus().isRunning ?? false,
        },
        healthEndpoint: `http://localhost:${WORKER_PORT}/healthz`,
      };
      logger.debug(status, "Scheduler worker heartbeat");
    }
  }, 60000); // Every minute
}

// Run the worker
main().catch((error) => {
  logger.error({ error: error.message, stack: error.stack }, "Fatal error in scheduler worker");
  Sentry.captureException(error);
  process.exit(1);
});

