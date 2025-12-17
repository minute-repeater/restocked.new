/**
 * Tracking Scheduler
 * 
 * Scheduler entrypoint: src/api/server.ts (lines 278-290)
 * Pattern: Uses node-cron like checkScheduler.ts and emailDeliveryScheduler.ts
 * 
 * Runs variant tracking every 15 minutes by default
 * Uses trackingService.ts to check variants for price/stock changes
 */

import * as cron from "node-cron";
import { 
  getVariantsNeedingTracking, 
  trackVariants 
} from "../services/trackingService.js";
import { config } from "../config.js";
import { logger } from "../api/utils/logger.js";

/**
 * Configuration for tracking scheduler
 */
export interface TrackingSchedulerConfig {
  /** Enable/disable scheduler (default: true) */
  enabled: boolean;
  /** Interval between runs in minutes (default: 15) */
  intervalMinutes: number;
  /** Batch concurrency for parallel processing (default: 5) */
  concurrency: number;
}

const DEFAULT_CONFIG: TrackingSchedulerConfig = {
  enabled: process.env.ENABLE_TRACKING_SCHEDULER !== "false",
  intervalMinutes: parseInt(process.env.TRACKING_INTERVAL_MINUTES || "15", 10),
  concurrency: parseInt(process.env.TRACKING_CONCURRENCY || "5", 10),
};

/**
 * Scheduler for running background variant tracking
 * Checks variants for price/stock changes and creates notifications
 */
class TrackingScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private config: TrackingSchedulerConfig;

  constructor(config: Partial<TrackingSchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the tracking scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info("Tracking scheduler is disabled");
      return;
    }

    if (this.cronJob) {
      logger.warn("Tracking scheduler is already running");
      return;
    }

    logger.info(
      {
        intervalMinutes: this.config.intervalMinutes,
        concurrency: this.config.concurrency,
      },
      "Starting tracking scheduler"
    );

    // Calculate cron expression: run every X minutes
    // Format: "*/X * * * *" means every X minutes
    const cronExpression = `*/${this.config.intervalMinutes} * * * *`;

    // Schedule the job
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.runTracking();
    });

    logger.info("Tracking scheduler started");
  }

  /**
   * Stop the tracking scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info("Tracking scheduler stopped");
    }
  }

  /**
   * Run tracking immediately (manual trigger)
   * Returns summary stats for reporting
   */
  async runTracking(variantIds?: number[]): Promise<{
    checked: number;
    notificationsCreated: number;
    errors: number;
    durationMs: number;
  }> {
    if (this.isRunning) {
      throw new Error("Tracking run already in progress");
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info(
        { variantIds: variantIds?.length || "all" },
        "Starting tracking run"
      );

      // Get variants to track
      const idsToTrack = variantIds || await getVariantsNeedingTracking();

      if (idsToTrack.length === 0) {
        logger.info("No variants need tracking");
        return {
          checked: 0,
          notificationsCreated: 0,
          errors: 0,
          durationMs: Date.now() - startTime,
        };
      }

      logger.info(
        { count: idsToTrack.length },
        "Tracking variants"
      );

      // Run tracking with configured concurrency
      const trackingResult = await trackVariants(idsToTrack, this.config.concurrency);

      // Calculate summary stats from the results array
      const allResults = trackingResult.results;
      const successful = allResults.filter((r) => r.ok);
      const failed = allResults.filter((r) => !r.ok);
      // Note: individual results don't track notifications_created, use 0 as placeholder
      const totalNotifications = 0; // trackVariants doesn't return per-result notification counts

      const duration = Date.now() - startTime;

      logger.info(
        {
          total: trackingResult.total,
          successful: trackingResult.succeeded,
          failed: trackingResult.failed,
          notifications: totalNotifications,
          duration: `${duration}ms`,
        },
        "Tracking run completed"
      );

      // Log errors if any
      if (failed.length > 0) {
        logger.warn(
          {
            errorCount: failed.length,
            errors: failed.map((r) => ({
              variant_id: r.variantId,
              error: r.error,
            })),
          },
          "Some variants failed during tracking"
        );
      }

      return {
        checked: trackingResult.total,
        notificationsCreated: totalNotifications,
        errors: trackingResult.failed,
        durationMs: duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          duration: `${duration}ms`,
        },
        "Tracking run failed"
      );
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      intervalMinutes: this.config.intervalMinutes,
      concurrency: this.config.concurrency,
      cronJobActive: this.cronJob !== null,
    };
  }
}

// Export singleton instance
export const trackingScheduler = new TrackingScheduler();
