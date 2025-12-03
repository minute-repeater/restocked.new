import { Router, type Request, type Response } from "express";
import { query } from "../../db/client.js";
import { VariantRepository } from "../../db/repositories/variantRepository.js";
import type { VariantResponse } from "../types.js";
import {
  invalidRequestError,
  notFoundError,
  internalError,
} from "../utils/errors.js";

const router = Router();
const variantRepo = new VariantRepository();

/**
 * GET /variants/:id
 * Get a variant by ID with full price and stock history
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json(
        invalidRequestError("Variant ID must be a number", { id: req.params.id })
      );
    }

    const variant = await variantRepo.getVariantById(id);

    if (!variant) {
      return res.status(404).json(notFoundError("Variant", id));
    }

    // Get price history
    const priceHistoryResult = await query(
      `SELECT * FROM variant_price_history 
       WHERE variant_id = $1 
       ORDER BY recorded_at DESC`,
      [id]
    );

    // Get stock history
    const stockHistoryResult = await query(
      `SELECT * FROM variant_stock_history 
       WHERE variant_id = $1 
       ORDER BY recorded_at DESC`,
      [id]
    );

    const response: VariantResponse = {
      variant,
      priceHistory: priceHistoryResult.rows as VariantResponse["priceHistory"],
      stockHistory: stockHistoryResult.rows as VariantResponse["stockHistory"],
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error in GET /variants/:id:", error);
    res.status(500).json(internalError(error.message));
  }
});

/**
 * GET /variants/products/:productId
 * Get all variants for a product
 * Note: This route should ideally be under /products/:productId/variants
 * but Express routing requires it to be under the variants router
 */
router.get("/products/:productId", async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId, 10);

    if (isNaN(productId)) {
      return res.status(400).json(
        invalidRequestError("Product ID must be a number", { productId: req.params.productId })
      );
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

export { router as variantRoutes };

