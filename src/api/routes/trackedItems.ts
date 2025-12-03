import { Router, type Request, type Response } from "express";
import { TrackedItemsRepository } from "../../db/repositories/trackedItemsRepository.js";
import { ProductRepository } from "../../db/repositories/productRepository.js";
import { VariantRepository } from "../../db/repositories/variantRepository.js";
import { ProductIngestionService } from "../../services/productIngestionService.js";
import { validateCreateTrackedItem } from "../utils/trackedItemsValidation.js";
import {
  invalidRequestError,
  internalError,
  productNotFoundError,
  variantNotFoundError,
  forbiddenError,
  notFoundError,
} from "../utils/errors.js";
import { postRateLimiter } from "../middleware/rateLimiting.js";
import { fetchProductPage } from "../../fetcher/index.js";
import { extractProductShell } from "../../extractor/index.js";
import { validateURL } from "../utils/urlValidation.js";
import { invalidURLError, fetchFailedError } from "../utils/errors.js";
import { hasReachedTrackedItemsLimit, checkPlanFeature, getUpgradeRequiredError } from "../utils/planLimits.js";

const router = Router();

// Initialize repositories and service
const trackedItemsRepo = new TrackedItemsRepository();
const productRepo = new ProductRepository();
const variantRepo = new VariantRepository();
const ingestionService = new ProductIngestionService(productRepo, variantRepo);

/**
 * POST /me/tracked-items
 * Create a new tracked item for the authenticated user
 * Body: { product_id, variant_id?, url? }
 * Returns: { tracked_item: {...} }
 */
router.post(
  "/",
  postRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const userPlan = (req.user as any).plan || 'free';

      // Check if variant tracking is allowed for this plan
      const userPlanObj = { plan: userPlan as 'free' | 'pro' };
      if (req.body.variant_id && !checkPlanFeature(userPlanObj, 'variant_tracking')) {
        console.log(`[Plan] Free user ${userId} attempted variant tracking`);
        return res.status(403).json(getUpgradeRequiredError('variant tracking'));
      }

      // Check tracked items limit
      const currentItems = await trackedItemsRepo.getTrackedItemsByUser(userId);
      if (hasReachedTrackedItemsLimit(userPlanObj, currentItems.length)) {
        console.log(`[Plan] Free user ${userId} reached tracked items limit (${currentItems.length})`);
        return res.status(403).json({
          error: {
            code: "UPGRADE_REQUIRED",
            message: `You've reached the limit of ${currentItems.length} tracked items on the Free plan. Upgrade to Pro for unlimited tracking.`,
            currentCount: currentItems.length,
            maxAllowed: currentItems.length,
          },
        });
      }

      // Validate input
      const validation = validateCreateTrackedItem(req.body);
      if (!validation.valid) {
        return res.status(400).json(validation.error);
      }

      const { product_id, variant_id, url } = validation.data;

      let finalProductId = product_id;

      // If URL is provided, create/find the product first
      if (url) {
        // Validate URL
        const urlValidation = validateURL(url);
        if (!urlValidation.valid) {
          return res.status(400).json(urlValidation.error);
        }

        // Check if product already exists
        let existingProduct = await productRepo.findByURL(url);
        
        if (!existingProduct) {
          // Fetch and ingest the product
          const fetchResult = await fetchProductPage(url);
          if (!fetchResult.success) {
            return res.status(400).json(
              fetchFailedError(
                fetchResult.error || "Failed to fetch product page",
                { modeUsed: fetchResult.modeUsed }
              )
            );
          }

          const productShell = await extractProductShell(fetchResult);
          const result = await ingestionService.ingest(productShell);
          existingProduct = result.product;
        }

        finalProductId = existingProduct.id;

        // If variant_id was provided but doesn't match the product, validate it
        if (variant_id) {
          const variant = await variantRepo.getVariantById(variant_id);
          if (!variant || variant.product_id !== finalProductId) {
            return res.status(404).json(variantNotFoundError(variant_id));
          }
        }
      } else {
        // Validate product exists
        const product = await productRepo.getProductById(finalProductId);
        if (!product) {
          return res.status(404).json(productNotFoundError(finalProductId));
        }

        // Validate variant exists and belongs to product (if provided)
        if (variant_id) {
          const variant = await variantRepo.getVariantById(variant_id);
          if (!variant) {
            return res.status(404).json(variantNotFoundError(variant_id));
          }
          if (variant.product_id !== finalProductId) {
            return res.status(400).json(
              invalidRequestError("Variant does not belong to the specified product")
            );
          }
        }
      }

      // Create tracked item
      const trackedItem = await trackedItemsRepo.createTrackedItem({
        user_id: userId,
        product_id: finalProductId,
        variant_id: variant_id ?? null,
      });

      // Fetch the tracked item with relations
      const items = await trackedItemsRepo.getTrackedItemsByUser(userId);
      const createdItem = items.find((item) => item.id === trackedItem.id);

      if (!createdItem) {
        // Fallback: return basic tracked item if relations query fails
        res.status(201).json({
          tracked_item: {
            id: trackedItem.id,
            product_id: trackedItem.product_id,
            variant_id: trackedItem.variant_id,
            alias: trackedItem.alias,
            notifications_enabled: trackedItem.notifications_enabled,
            created_at: trackedItem.created_at,
            updated_at: trackedItem.updated_at,
          },
        });
        return;
      }

      res.status(201).json({
        tracked_item: createdItem,
      });
    } catch (error: any) {
      console.error("Error in POST /me/tracked-items:", error);
      
      // Handle unique constraint violation (duplicate tracking)
      if (error.code === "23505") {
        return res.status(409).json(
          invalidRequestError("This product/variant combination is already being tracked")
        );
      }

      res.status(500).json(internalError(error.message, { stack: error.stack }));
    }
  }
);

/**
 * GET /me/tracked-items
 * Get all tracked items for the authenticated user
 * Returns: { items: [...] }
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Set by requireAuth middleware

    const items = await trackedItemsRepo.getTrackedItemsByUser(userId);

    res.json({
      items,
    });
  } catch (error: any) {
    console.error("Error in GET /me/tracked-items:", error);
    res.status(500).json(internalError(error.message, { stack: error.stack }));
  }
});

/**
 * DELETE /me/tracked-items/:id
 * Delete a tracked item (only if it belongs to the authenticated user)
 * Returns: { success: true }
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Set by requireAuth middleware
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json(
        invalidRequestError("Tracked item ID must be a number", { id: req.params.id })
      );
    }

    // Verify tracked item exists
    const trackedItem = await trackedItemsRepo.getTrackedItemById(id);
    if (!trackedItem) {
      return res.status(404).json(notFoundError("Tracked item", id));
    }

    // Delete (only if owned by user)
    const deleted = await trackedItemsRepo.deleteTrackedItem(id, userId);
    if (!deleted) {
      return res.status(403).json(
        forbiddenError("You do not have permission to delete this tracked item")
      );
    }

    res.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Error in DELETE /me/tracked-items/:id:", error);
    res.status(500).json(internalError(error.message, { stack: error.stack }));
  }
});

export { router as trackedItemsRoutes };

