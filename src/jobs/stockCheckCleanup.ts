/**
 * Stock Check Cleanup Job
 * 
 * Runs retention policy on stock_checks table to maintain last N checks per tracked item.
 * Should be run daily via cron or scheduler.
 * 
 * Retention: Keeps last 100 checks per tracked_item_id, deletes older.
 */

import { stockCheckRepository } from "../db/repositories/stockCheckRepository.js";
import { logger } from "../api/utils/logger.js";

/**
 * Default retention limit (keep last N checks per tracked item)
 */
const DEFAULT_RETENTION_LIMIT = 100;

/**
 * Run stock check cleanup job
 * 
 * @param retentionLimit - Number of checks to keep per tracked item (default 100)
 * @returns Cleanup results
 */
export async function runStockCheckCleanup(
  retentionLimit: number = DEFAULT_RETENTION_LIMIT
): Promise<{
  success: boolean;
  totalItemsCleaned: number;
  totalChecksDeleted: number;
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    logger.info(
      { retentionLimit },
      "Starting stock check cleanup job"
    );

    // Run cleanup function
    const results = await stockCheckRepository.runCleanup(retentionLimit);

    // Calculate totals
    const totalItemsCleaned = results.length;
    const totalChecksDeleted = results.reduce(
      (sum, r) => sum + Number(r.deleted_count),
      0
    );

    const duration = Date.now() - startTime;

    logger.info(
      {
        retentionLimit,
        totalItemsCleaned,
        totalChecksDeleted,
        duration: `${duration}ms`,
      },
      "Stock check cleanup completed successfully"
    );

    return {
      success: true,
      totalItemsCleaned,
      totalChecksDeleted,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      {
        retentionLimit,
        error: errorMessage,
        duration: `${duration}ms`,
      },
      "Stock check cleanup failed"
    );

    return {
      success: false,
      totalItemsCleaned: 0,
      totalChecksDeleted: 0,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Main entry point when running as standalone script
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const retentionLimit = process.argv[2]
    ? parseInt(process.argv[2], 10)
    : DEFAULT_RETENTION_LIMIT;

  runStockCheckCleanup(retentionLimit)
    .then((result) => {
      console.log("Cleanup result:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Cleanup failed:", error);
      process.exit(1);
    });
}
