import * as cron from "node-cron";
import { schedulerConfig } from "./schedulerConfig.js";
import { TrackedItemsRepository } from "../db/repositories/trackedItemsRepository.js";
import { ProductRepository } from "../db/repositories/productRepository.js";
import { VariantRepository } from "../db/repositories/variantRepository.js";
import { ProductIngestionService } from "../services/productIngestionService.js";
import { SchedulerLogRepository } from "../db/repositories/schedulerLogRepository.js";
import { query } from "../db/client.js";
import { fetchProductPage } from "../fetcher/index.js";
import { extractProductShell } from "../extractor/index.js";

/**
 * Scheduler service state
 */
interface SchedulerState {
  isRunning: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  currentRunId: number | null;
  cronJob: cron.ScheduledTask | null;
}

class SchedulerService {
  private state: SchedulerState = {
    isRunning: false,
    lastRun: null,
    nextRun: null,
    currentRunId: null,
    cronJob: null,
  };

  private trackedItemsRepo: TrackedItemsRepository;
  private productRepo: ProductRepository;
  private variantRepo: VariantRepository;
  private ingestionService: ProductIngestionService;
  private logRepo: SchedulerLogRepository;

  constructor() {
    this.trackedItemsRepo = new TrackedItemsRepository();
    this.productRepo = new ProductRepository();
    this.variantRepo = new VariantRepository();
    this.ingestionService = new ProductIngestionService(
      this.productRepo,
      this.variantRepo
    );
    this.logRepo = new SchedulerLogRepository();
  }

  /**
   * Start the scheduler service
   */
  start(): void {
    if (!schedulerConfig.ENABLE_SCHEDULER) {
      console.log("[Scheduler] Scheduler is disabled via ENABLE_SCHEDULER=false");
      return;
    }

    if (this.state.cronJob) {
      console.log("[Scheduler] Scheduler is already running");
      return;
    }

    const intervalMinutes = schedulerConfig.CHECK_INTERVAL_MINUTES;
    console.log(`[Scheduler] Starting scheduler with interval: ${intervalMinutes} minutes`);

    // Calculate cron expression: run every X minutes
    // node-cron format: "*/X * * * *" means every X minutes
    const cronExpression = `*/${intervalMinutes} * * * *`;

    // Schedule the job
    this.state.cronJob = cron.schedule(cronExpression, async () => {
      await this.runScheduledCheck();
    });

    // Calculate next run time
    this.updateNextRunTime();

    console.log(`[Scheduler] Scheduler started. Next run: ${this.state.nextRun?.toISOString()}`);
  }

  /**
   * Stop the scheduler service
   */
  stop(): void {
    if (this.state.cronJob) {
      this.state.cronJob.stop();
      this.state.cronJob = null;
      console.log("[Scheduler] Scheduler stopped");
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus() {
    return {
      enabled: schedulerConfig.ENABLE_SCHEDULER,
      isRunning: this.state.isRunning,
      lastRun: this.state.lastRun?.toISOString() || null,
      nextRun: this.state.nextRun?.toISOString() || null,
      intervalMinutes: schedulerConfig.CHECK_INTERVAL_MINUTES,
      currentRunId: this.state.currentRunId,
    };
  }

  /**
   * Run a check immediately (manual trigger)
   */
  async runNow(): Promise<void> {
    if (this.state.isRunning) {
      throw new Error("Scheduler is already running a check");
    }
    await this.runScheduledCheck();
  }

  /**
   * Execute the scheduled check
   * This is the main logic that processes all tracked items
   */
  private async runScheduledCheck(): Promise<void> {
    // Prevent duplicate runs
    if (this.state.isRunning) {
      console.log("[Scheduler] Check already running, skipping...");
      return;
    }

    this.state.isRunning = true;
    const runStartedAt = new Date();
    let logId: number | null = null;

    try {
      console.log(`[Scheduler] Starting scheduled check at ${runStartedAt.toISOString()}`);

      // Create log entry
      const logEntry = await this.logRepo.createLog({
        run_started_at: runStartedAt,
        products_checked: 0,
        items_checked: 0,
        success: false,
      });
      logId = logEntry.id;
      this.state.currentRunId = logId;

      // Get all tracked items grouped by product_id
      const trackedItemsByProduct = await this.getTrackedItemsByProduct();

      const productIds = Array.from(trackedItemsByProduct.keys());
      const totalItems = Array.from(trackedItemsByProduct.values()).reduce(
        (sum, items) => sum + items.length,
        0
      );

      console.log(
        `[Scheduler] Found ${productIds.length} unique products with ${totalItems} tracked items`
      );

      let productsChecked = 0;
      let itemsChecked = 0;
      const errors: string[] = [];

      // Process each product
      for (const productId of productIds) {
        try {
          const product = await this.productRepo.getProductById(productId);
          if (!product) {
            console.warn(`[Scheduler] Product ${productId} not found, skipping...`);
            continue;
          }

          // Run check for this product (same logic as POST /checks/:productId)
          await this.checkProduct(product.id, product.url);

          productsChecked++;
          itemsChecked += trackedItemsByProduct.get(productId)!.length;

          console.log(`[Scheduler] ✓ Checked product ${productId} (${product.url})`);
        } catch (error: any) {
          const errorMsg = `Product ${productId}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`[Scheduler] ✗ Error checking product ${productId}:`, error.message);
        }
      }

      const runFinishedAt = new Date();
      const success = errors.length === 0;

      // Update log entry
      if (logId) {
        await this.logRepo.updateLog(logId, {
          run_finished_at: runFinishedAt,
          products_checked: productsChecked,
          items_checked: itemsChecked,
          success,
          error: errors.length > 0 ? errors.join("; ") : null,
          metadata: {
            productIds: productIds,
            errors: errors,
            duration_ms: runFinishedAt.getTime() - runStartedAt.getTime(),
          },
        });
      }

      this.state.lastRun = runStartedAt;
      this.updateNextRunTime();

      console.log(
        `[Scheduler] Check completed: ${productsChecked} products, ${itemsChecked} items checked. Success: ${success}`
      );
    } catch (error: any) {
      console.error("[Scheduler] Fatal error in scheduled check:", error);

      // Update log entry with error
      if (logId) {
        try {
          await this.logRepo.updateLog(logId, {
            run_finished_at: new Date(),
            success: false,
            error: error.message,
            metadata: { stack: error.stack },
          });
        } catch (logError) {
          console.error("[Scheduler] Failed to update log entry:", logError);
        }
      }
    } finally {
      this.state.isRunning = false;
      this.state.currentRunId = null;
    }
  }

  /**
   * Get all tracked items grouped by product_id
   */
  private async getTrackedItemsByProduct(): Promise<Map<number, any[]>> {
    // Get all unique product_ids from tracked_items
    const productIdsSql = `
      SELECT DISTINCT product_id
      FROM tracked_items
      ORDER BY product_id
    `;

    const productIdsResult = await query<{ product_id: number }>(productIdsSql, []);
    const productMap = new Map<number, any[]>();

    for (const row of productIdsResult.rows) {
      // Get all tracked items for this product
      const itemsSql = `
        SELECT *
        FROM tracked_items
        WHERE product_id = $1
      `;
      const itemsResult = await query(itemsSql, [row.product_id]);
      productMap.set(row.product_id, itemsResult.rows);
    }

    return productMap;
  }

  /**
   * Check a single product (same logic as POST /checks/:productId)
   */
  private async checkProduct(productId: number, url: string): Promise<void> {
    const startedAt = new Date();

    try {
      // Step 1: Fetch the product page
      const fetchResult = await fetchProductPage(url);

      if (!fetchResult.success) {
        // Create failed check_run
        const finishedAt = new Date();
        await query(
          `INSERT INTO check_runs (
            product_id, started_at, finished_at, status, error_message, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            productId,
            startedAt.toISOString(),
            finishedAt.toISOString(),
            "failed",
            fetchResult.error || "Failed to fetch product page",
            JSON.stringify({
              modeUsed: fetchResult.modeUsed,
              metadata: fetchResult.metadata,
            }),
          ]
        );
        throw new Error(fetchResult.error || "Failed to fetch product page");
      }

      // Step 2: Extract ProductShell
      const productShell = await extractProductShell(fetchResult);

      // Step 3: Ingest into database (will update existing product)
      const result = await this.ingestionService.ingest(productShell);

      // Step 4: Create check_runs record
      const finishedAt = new Date();
      await query(
        `INSERT INTO check_runs (
          product_id, started_at, finished_at, status, metadata
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          productId,
          startedAt.toISOString(),
          finishedAt.toISOString(),
          "success",
          JSON.stringify({
            modeUsed: fetchResult.modeUsed,
            variantsFound: result.variants.length,
            notes: productShell.notes,
            metadata: fetchResult.metadata,
          }),
        ]
      );
    } catch (error: any) {
      // Create failed check_run
      const finishedAt = new Date();
      try {
        await query(
          `INSERT INTO check_runs (
            product_id, started_at, finished_at, status, error_message, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            productId,
            startedAt.toISOString(),
            finishedAt.toISOString(),
            "failed",
            error.message,
            JSON.stringify({ error: error.stack }),
          ]
        );
      } catch (checkRunError) {
        console.error(`[Scheduler] Failed to create check_run record for product ${productId}:`, checkRunError);
      }
      throw error;
    }
  }

  /**
   * Update next run time based on interval
   */
  private updateNextRunTime(): void {
    if (this.state.lastRun) {
      const intervalMs = schedulerConfig.CHECK_INTERVAL_MINUTES * 60 * 1000;
      this.state.nextRun = new Date(this.state.lastRun.getTime() + intervalMs);
    } else {
      // If never run, next run is in interval minutes
      const intervalMs = schedulerConfig.CHECK_INTERVAL_MINUTES * 60 * 1000;
      this.state.nextRun = new Date(Date.now() + intervalMs);
    }
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();

