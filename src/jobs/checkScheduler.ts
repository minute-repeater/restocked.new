import * as cron from "node-cron";
import { CheckWorker } from "./checkWorker.js";
import { config } from "../config.js";

/**
 * Configuration for check scheduler
 */
export interface CheckSchedulerConfig {
  /** Enable/disable scheduler (default: true) */
  enabled: boolean;
  /** Interval between runs in minutes (default: 30) */
  intervalMinutes: number;
}

const DEFAULT_CONFIG: CheckSchedulerConfig = {
  enabled: config.enableCheckScheduler,
  intervalMinutes: config.checkSchedulerIntervalMinutes,
};

/**
 * Scheduler for running background product checks
 */
class CheckScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private config: CheckSchedulerConfig;
  private worker: CheckWorker;

  constructor(config: Partial<CheckSchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.worker = new CheckWorker();
  }

  /**
   * Start the check scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      console.log("[CheckScheduler] Check scheduler is disabled");
      return;
    }

    if (this.cronJob) {
      console.log("[CheckScheduler] Check scheduler is already running");
      return;
    }

    console.log(
      `[CheckScheduler] Starting check scheduler (interval: ${this.config.intervalMinutes} minutes)`
    );

    // Calculate cron expression: run every X minutes
    const cronExpression = `*/${this.config.intervalMinutes} * * * *`;

    // Schedule the job
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.runChecks();
    });

    console.log("[CheckScheduler] Check scheduler started");
  }

  /**
   * Stop the check scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("[CheckScheduler] Check scheduler stopped");
    }
  }

  /**
   * Run checks immediately (manual trigger)
   * Returns the worker result for detailed reporting
   */
  async runChecks(): Promise<import("./checkWorker.js").CheckWorkerResult> {
    if (this.isRunning) {
      throw new Error("Check run already in progress");
    }

    this.isRunning = true;
    try {
      const result = await this.worker.runChecks();
      return result;
    } catch (error: any) {
      console.error("[CheckScheduler] Error in check run:", error);
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
      cronJobActive: this.cronJob !== null,
    };
  }
}

// Export singleton instance
export const checkScheduler = new CheckScheduler();

