import { Router, type Request, type Response } from "express";
import { fetchProductPage } from "../../fetcher/index.js";
import { extractProductShell } from "../../extractor/index.js";
import { ProductRepository } from "../../db/repositories/productRepository.js";
import { VariantRepository } from "../../db/repositories/variantRepository.js";
import { ProductIngestionService } from "../../services/productIngestionService.js";
import type { ProductResponse } from "../types.js";
import { validateURL } from "../utils/urlValidation.js";
import {
  invalidURLError,
  invalidRequestError,
  notFoundError,
  fetchFailedError,
  internalError,
} from "../utils/errors.js";
import { postRateLimiter } from "../middleware/rateLimiting.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Initialize repositories and service
const productRepo = new ProductRepository();
const variantRepo = new VariantRepository();
const ingestionService = new ProductIngestionService(productRepo, variantRepo);

/**
 * POST /products
 * Add a new product by URL
 * Fetches, extracts, and ingests the product
 */
router.post("/", postRateLimiter, async (req: Request, res: Response) => {
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

    // Step 4: Return response
    const response: ProductResponse = {
      product: result.product,
      variants: result.variants,
      notes: productShell.notes,
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error("Error in POST /products:", error);
    res.status(500).json(internalError(error.message, { stack: error.stack }));
  }
});

/**
 * GET /products/:productId/variants
 * Get all variants for a product
 * Must come before /:id route to avoid route conflicts
 */
router.get("/:productId/variants", async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId, 10);

    if (isNaN(productId)) {
      return res.status(400).json(
        invalidRequestError("Product ID must be a number", { productId: req.params.productId })
      );
    }

    // Verify product exists
    const product = await productRepo.getProductById(productId);
    if (!product) {
      return res.status(404).json(notFoundError("Product", productId));
    }

    const variants = await variantRepo.findByProduct(productId);

    res.json({
      productId,
      variants,
      count: variants.length,
    });
  } catch (error: any) {
    console.error("Error in GET /products/:productId/variants:", error);
    res.status(500).json(internalError(error.message));
  }
});

/**
 * GET /products/:id
 * Get a product by ID with its variants
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json(
        invalidRequestError("Product ID must be a number", { id: req.params.id })
      );
    }

    const product = await productRepo.getProductById(id);

    if (!product) {
      return res.status(404).json(notFoundError("Product", id));
    }

    const variants = await variantRepo.findByProduct(id);

    const response: ProductResponse = {
      product,
      variants,
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error in GET /products/:id:", error);
    res.status(500).json(internalError(error.message));
  }
});

/**
 * GET /products
 * List products with optional filtering and pagination
 * Requires authentication
 * Query params:
 *   - url: Find product by URL
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { url, page, limit } = req.query;

    // If URL is provided, find by URL
    if (url && typeof url === "string") {
      const product = await productRepo.findByURL(url);
      if (!product) {
        return res.status(404).json(notFoundError("Product", url));
      }

      const variants = await variantRepo.findByProduct(product.id);
      const response: ProductResponse = {
        product,
        variants,
      };

      return res.json(response);
    }

    // Otherwise, list products with pagination
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit
      ? Math.min(parseInt(limit as string, 10), 100)
      : 20;

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      return res.status(400).json(
        invalidRequestError("Page and limit must be positive numbers", { page: pageNum, limit: limitNum })
      );
    }

    const offset = (pageNum - 1) * limitNum;
    const products = await productRepo.getAllProducts(limitNum, offset);

    // Get variants for each product
    const productsWithVariants = await Promise.all(
      products.map(async (product) => {
        const variants = await variantRepo.findByProduct(product.id);
        return {
          product,
          variants,
        };
      })
    );

    res.json({
      products: productsWithVariants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        count: products.length,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /products:", error);
    res.status(500).json(internalError(error.message));
  }
});

export { router as productRoutes };

