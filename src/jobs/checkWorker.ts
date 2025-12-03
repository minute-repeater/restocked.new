import { query } from "../db/client.js";
import { ProductRepository } from "../db/repositories/productRepository.js";
import { VariantRepository } from "../db/repositories/variantRepository.js";
import type { DBVariant } from "../db/types.js";
import { TrackedItemsRepository } from "../db/repositories/trackedItemsRepository.js";
import { ProductIngestionService } from "../services/productIngestionService.js";
import { fetchProductPage } from "../fetcher/index.js";
import { extractProductShell } from "../extractor/index.js";
import { config } from "../config.js";

/**
 * Configuration for check worker
 */
export interface CheckWorkerConfig {
  /** Minimum minutes between checks for the same product (default: 30) */
  minCheckIntervalMinutes: number;
  /** Maximum number of products to check per run (default: 50) */
  maxProductsPerRun: number;
  /** Lock timeout in seconds (default: 300 = 5 minutes) */
  lockTimeoutSeconds: number;
}

const DEFAULT_CONFIG: CheckWorkerConfig = {
  minCheckIntervalMinutes: config.minCheckIntervalMinutes,
  maxProductsPerRun: config.maxProductsPerRun,
  lockTimeoutSeconds: config.checkLockTimeoutSeconds,
};

/**
 * Check worker result
 */
export interface CheckWorkerResult {
  productsChecked: number;
  productsSkipped: number;
  productsFailed: number;
  errors: string[];
  durationMs: number;
}

/**
 * Background check worker
 * Processes tracked products with concurrency-safe locking
 */
export class CheckWorker {
  private productRepo: ProductRepository;
  private variantRepo: VariantRepository;
  private trackedItemsRepo: TrackedItemsRepository;
  private ingestionService: ProductIngestionService;
  private config: CheckWorkerConfig;

  constructor(config: Partial<CheckWorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.productRepo = new ProductRepository();
    this.variantRepo = new VariantRepository();
    this.trackedItemsRepo = new TrackedItemsRepository();
    this.ingestionService = new ProductIngestionService(
      this.productRepo,
      this.variantRepo
    );
  }

  /**
   * Run checks for all tracked products
   * Uses PostgreSQL advisory locks for concurrency safety
   */
  async runChecks(): Promise<CheckWorkerResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let productsChecked = 0;
    let productsSkipped = 0;
    let productsFailed = 0;

    console.log(`[CheckWorker] Starting check run (config: ${JSON.stringify(this.config)})`);

    try {
      // Get products that need checking (grouped by product_id)
      const productsToCheck = await this.getProductsToCheck();

      console.log(
        `[CheckWorker] Found ${productsToCheck.length} products to check (max: ${this.config.maxProductsPerRun})`
      );

      // Limit to max products per run
      const productsToProcess = productsToCheck.slice(0, this.config.maxProductsPerRun);

      // Process each product with locking
      for (const productInfo of productsToProcess) {
        try {
          const result = await this.checkProductWithLock(productInfo.productId, productInfo.url);
          if (result === "checked") {
            productsChecked++;
          } else if (result === "skipped") {
            productsSkipped++;
          } else if (result === "failed") {
            productsFailed++;
          }
        } catch (error: any) {
          productsFailed++;
          const errorMsg = `Product ${productInfo.productId}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`[CheckWorker] Error checking product ${productInfo.productId}:`, error);
        }
      }

      const durationMs = Date.now() - startTime;

      console.log(
        `[CheckWorker] Check run completed: ${productsChecked} checked, ${productsSkipped} skipped, ${productsFailed} failed (${durationMs}ms)`
      );

      return {
        productsChecked,
        productsSkipped,
        productsFailed,
        errors,
        durationMs,
      };
    } catch (error: any) {
      console.error("[CheckWorker] Fatal error in check run:", error);
      throw error;
    }
  }

  /**
   * Get products that need checking
   * Returns products with tracked items that haven't been checked recently
   */
  private async getProductsToCheck(): Promise<Array<{ productId: number; url: string }>> {
    // Use parameterized query for interval to prevent SQL injection
    const sql = `
      WITH tracked_products AS (
        SELECT DISTINCT ti.product_id
        FROM tracked_items ti
        INNER JOIN products p ON ti.product_id = p.id
      ),
      last_checks AS (
        SELECT 
          tp.product_id,
          MAX(cr.finished_at) as last_check_at
        FROM tracked_products tp
        LEFT JOIN check_runs cr ON tp.product_id = cr.product_id
        GROUP BY tp.product_id
      )
      SELECT 
        p.id as product_id,
        p.url
      FROM tracked_products tp
      INNER JOIN products p ON tp.product_id = p.id
      LEFT JOIN last_checks lc ON tp.product_id = lc.product_id
      WHERE 
        lc.last_check_at IS NULL 
        OR lc.last_check_at < NOW() - ($1::text || ' minutes')::INTERVAL
      ORDER BY 
        COALESCE(lc.last_check_at, '1970-01-01'::timestamptz) ASC
      LIMIT $2
    `;

    const result = await query<{ product_id: number; url: string }>(sql, [
      this.config.minCheckIntervalMinutes.toString(),
      this.config.maxProductsPerRun * 2, // Get more than we need to account for locks
    ]);

    return result.rows.map((row) => ({
      productId: row.product_id,
      url: row.url,
    }));
  }

  /**
   * Check a product with advisory lock to prevent concurrent checks
   * Returns: "checked" | "skipped" | "failed" | "locked"
   */
  private async checkProductWithLock(
    productId: number,
    url: string
  ): Promise<"checked" | "skipped" | "failed" | "locked"> {
    // Use PostgreSQL advisory lock (key based on product_id)
    // Lock key: 1000000 + productId to avoid conflicts with other locks
    const lockKey = 1000000 + productId;

    try {
      // Try to acquire lock (non-blocking)
      const lockResult = await query<{ pg_try_advisory_lock: boolean }>(
        `SELECT pg_try_advisory_lock($1) as pg_try_advisory_lock`,
        [lockKey]
      );

      if (!lockResult.rows[0]?.pg_try_advisory_lock) {
        console.log(`[CheckWorker] Product ${productId} is locked by another worker, skipping...`);
        return "locked";
      }

      try {
        // Set lock timeout
        await query(`SET lock_timeout = ${this.config.lockTimeoutSeconds * 1000}`);

        // Double-check if product was checked recently (race condition protection)
        const recentCheck = await query<{ finished_at: string | null }>(
          `SELECT finished_at 
           FROM check_runs 
           WHERE product_id = $1 
           ORDER BY finished_at DESC 
           LIMIT 1`,
          [productId]
        );

        if (recentCheck.rows[0]?.finished_at) {
          const lastCheck = new Date(recentCheck.rows[0].finished_at);
          const minutesSinceCheck =
            (Date.now() - lastCheck.getTime()) / (1000 * 60);

          if (minutesSinceCheck < this.config.minCheckIntervalMinutes) {
            console.log(
              `[CheckWorker] Product ${productId} was checked ${minutesSinceCheck.toFixed(1)} minutes ago, skipping...`
            );
            return "skipped";
          }
        }

        // Run the check
        await this.checkProduct(productId, url);
        return "checked";
      } finally {
        // Always release the lock
        await query(`SELECT pg_advisory_unlock($1)`, [lockKey]);
      }
    } catch (error: any) {
      // Release lock on error
      try {
        await query(`SELECT pg_advisory_unlock($1)`, [lockKey]);
      } catch (unlockError) {
        // Ignore unlock errors
      }

      // Check if it's a lock timeout
      if (error.message?.includes("lock_timeout") || error.message?.includes("timeout")) {
        console.log(`[CheckWorker] Lock timeout for product ${productId}, skipping...`);
        return "locked";
      }

      throw error;
    }
  }

  /**
   * Check a single product
   * Fetches, extracts, ingests, and creates check_runs entry
   */
  private async checkProduct(productId: number, url: string): Promise<void> {
    const startedAt = new Date();

    try {
      // Get product info for logging
      const product = await this.productRepo.getProductById(productId);
      const productTitle = product?.name || "Unknown Product";

      console.log(`[CHECK] Product ${productId} – ${productTitle}`);
      console.log(`[CHECK]   URL: ${url}`);

      // Step 1: Fetch the product page
      const fetchResult = await fetchProductPage(url);

      if (!fetchResult.success) {
        console.log(`[CHECK]   ❌ Fetch failed: ${fetchResult.error}`);
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

      // Step 3: Get old values before ingestion (for change detection logging)
      const oldVariantsResult = await query<DBVariant>(
        "SELECT * FROM variants WHERE product_id = $1",
        [productId]
      );
      const oldVariants = oldVariantsResult.rows;
      const oldPrices = new Map<number, number>();
      const oldStock = new Map<number, string>();

      for (const variant of oldVariants) {
        if (variant.current_price !== null) {
          oldPrices.set(variant.id, variant.current_price);
        }
        if (variant.current_stock_status) {
          oldStock.set(variant.id, variant.current_stock_status);
        }
      }

      // Step 4: Ingest into database (updates variants, creates notifications)
      const result = await this.ingestionService.ingest(productShell);

      // Step 5: Get new values after ingestion
      const newVariantsResult = await query<DBVariant>(
        "SELECT * FROM variants WHERE product_id = $1",
        [productId]
      );
      const newVariants = newVariantsResult.rows;
      let changesDetected = 0;
      const changeLog: string[] = [];

      for (const variant of newVariants) {
        const oldPrice = oldPrices.get(variant.id);
        const newPrice = variant.current_price;
        const oldStatus = oldStock.get(variant.id);
        const newStatus = variant.current_stock_status;

        if (oldPrice !== undefined && newPrice !== null && oldPrice !== newPrice) {
          const change = newPrice - oldPrice;
          const percent = ((change / oldPrice) * 100).toFixed(1);
          const direction = change < 0 ? "↓" : "↑";
          changeLog.push(
            `  Variant ${variant.id}: Price ${oldPrice} → ${newPrice} (${direction} ${Math.abs(parseFloat(percent))}%)`
          );
          changesDetected++;
        }

        if (oldStatus && newStatus && oldStatus !== newStatus) {
          changeLog.push(
            `  Variant ${variant.id}: Stock ${oldStatus} → ${newStatus}`
          );
          changesDetected++;
        }
      }

      if (changesDetected > 0) {
        console.log(`[CHECK]   ✅ Changes detected (${changesDetected}):`);
        changeLog.forEach((log) => console.log(log));
      } else {
        console.log(`[CHECK]   ℹ️  No changes detected`);
      }

      // Step 6: Create check_runs record
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
            changesDetected,
            notes: productShell.notes,
            metadata: fetchResult.metadata,
            durationMs: finishedAt.getTime() - startedAt.getTime(),
          }),
        ]
      );

      console.log(
        `[CHECK]   ✓ Check completed (${result.variants.length} variants, ${changesDetected} changes)`
      );
    } catch (error: any) {
      console.log(`[CHECK]   ❌ Error: ${error.message}`);
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
            JSON.stringify({
              error: error.stack,
              durationMs: finishedAt.getTime() - startedAt.getTime(),
            }),
          ]
        );
      } catch (checkRunError) {
        console.error(
          `[CheckWorker] Failed to create check_run record for product ${productId}:`,
          checkRunError
        );
      }
      throw error;
    }
  }
}

