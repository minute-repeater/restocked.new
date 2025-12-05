import { Router, type Request, type Response } from "express";
import { query } from "../../db/client.js";
import { fetchProductPage } from "../../fetcher/index.js";
import { extractProductShell } from "../../extractor/index.js";
import { ProductRepository } from "../../db/repositories/productRepository.js";
import { VariantRepository } from "../../db/repositories/variantRepository.js";
import { ProductIngestionService } from "../../services/productIngestionService.js";
import { logger } from "../utils/logger.js";
import type { CheckRunResponse, ProductResponse } from "../types.js";
import { validateURL } from "../utils/urlValidation.js";
import {
  invalidURLError,
  invalidRequestError,
  notFoundError,
  fetchFailedError,
  internalError,
  formatError,
} from "../utils/errors.js";
import { postRateLimiter } from "../middleware/rateLimiting.js";

const router = Router();

// Initialize repositories and service
const productRepo = new ProductRepository();
const variantRepo = new VariantRepository();
const ingestionService = new ProductIngestionService(productRepo, variantRepo);

/**
 * POST /checks/run
 * Run a check on a URL (new or existing product)
 * Creates a check_runs record
 */
router.post("/run", postRateLimiter, async (req: Request, res: Response) => {
  const startedAt = new Date();
  let productId: number | null = null;

  try {
    const { url } = req.body;

    // Validate URL
    const urlValidation = validateURL(url);
    if (!urlValidation.valid) {
      return res.status(400).json(urlValidation.error);
    }

    // Step 1: Fetch the product page
    const fetchResult = await fetchProductPage(url);

    if (!fetchResult.success) {
      // Create failed check_run if product exists
      const existingProduct = await productRepo.findByURL(url);
      if (existingProduct) {
        const finishedAt = new Date();
        await query(
          `INSERT INTO check_runs (
            product_id, started_at, finished_at, status, error_message, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            existingProduct.id,
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
      }

      return res.status(400).json(
        fetchFailedError(
          fetchResult.error || "Failed to fetch product page",
          { modeUsed: fetchResult.modeUsed }
        )
      );
    }

    // Step 2: Extract ProductShell
    const productShell = await extractProductShell(fetchResult);

    // Step 3: Ingest into database
    const result = await ingestionService.ingest(productShell);
    productId = result.product.id;

    // Step 4: Create check_runs record
    const finishedAt = new Date();
    const checkRunResult = await query(
      `INSERT INTO check_runs (
        product_id, started_at, finished_at, status, metadata
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
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

    // Step 5: Return response
    const response: CheckRunResponse = {
      checkRun: checkRunResult.rows[0] as CheckRunResponse["checkRun"],
      product: result.product,
      variants: result.variants,
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error({ error: error.message, path: "/checks/run" }, "Error in POST /checks/run");

    // Create failed check_run if we have a productId
    if (productId) {
      try {
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
            error.message,
            JSON.stringify({ error: error.message }),
          ]
        );
      } catch (checkRunError) {
        logger.error({ error: checkRunError instanceof Error ? checkRunError.message : String(checkRunError) }, "Failed to create check_run record");
      }
    }

    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /checks/:productId
 * Manual re-check for an existing product
 * Fetches the product URL again, extracts, and ingests
 */
router.post("/:productId", postRateLimiter, async (req: Request, res: Response) => {
  const startedAt = new Date();
  const productId = parseInt(req.params.productId, 10);

  if (isNaN(productId)) {
    return res.status(400).json(
      invalidRequestError("Product ID must be a number", { productId: req.params.productId })
    );
  }

  try {
    // Step 1: Get product
    const product = await productRepo.getProductById(productId);

    if (!product) {
      return res.status(404).json(notFoundError("Product", productId));
    }

    // Step 2: Fetch the product page
    const fetchResult = await fetchProductPage(product.url);

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

      return res.status(400).json(
        fetchFailedError(
          fetchResult.error || "Failed to fetch product page",
          { modeUsed: fetchResult.modeUsed }
        )
      );
    }

    // Step 3: Extract ProductShell
    const productShell = await extractProductShell(fetchResult);

    // Step 4: Ingest into database (will update existing product)
    const result = await ingestionService.ingest(productShell);

    // Step 5: Create check_runs record
    const finishedAt = new Date();
    const checkRunResult = await query(
      `INSERT INTO check_runs (
        product_id, started_at, finished_at, status, metadata
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
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

    // Step 6: Return response
    const response: CheckRunResponse = {
      checkRun: checkRunResult.rows[0] as CheckRunResponse["checkRun"],
      product: result.product,
      variants: result.variants,
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error({ error: error.message, productId, path: "/checks/:productId" }, "Error in POST /checks/:productId");

    // Create failed check_run
    try {
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
          error.message,
          JSON.stringify({ error: error.stack }),
        ]
      );
      } catch (checkRunError) {
        logger.error({ 
          error: checkRunError instanceof Error ? checkRunError.message : String(checkRunError),
          productId 
        }, "Failed to create check_run record");
      }

    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

export { router as checkRoutes };


