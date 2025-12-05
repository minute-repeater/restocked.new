import "dotenv/config";

/**
 * Scheduler configuration
 * Can be overridden via environment variables
 */
export const schedulerConfig = {
  /**
   * Enable or disable the scheduler service
   * Set ENABLE_SCHEDULER=false to disable
   */
  ENABLE_SCHEDULER: process.env.ENABLE_SCHEDULER !== "false",

  /**
   * Interval between scheduler runs in minutes
   * Set CHECK_INTERVAL_MINUTES=60 for hourly checks
   */
  CHECK_INTERVAL_MINUTES: parseInt(process.env.CHECK_INTERVAL_MINUTES || "30", 10),
};




