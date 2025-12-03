import { withTransaction } from "../db/client.js";
import { ProductRepository } from "../db/repositories/productRepository.js";
import { VariantRepository } from "../db/repositories/variantRepository.js";
import type { DBProduct, DBVariant } from "../db/types.js";
import type { ProductShell } from "../extractor/productTypes.js";
import { normalizeProductShell } from "./helpers/productMapping.js";
import { normalizeVariantShell } from "./helpers/variantMapping.js";
import { notificationService } from "./notificationService.js";
import type { PoolClient } from "pg";

/**
 * Result of product ingestion
 */
export interface IngestionResult {
  product: DBProduct;
  variants: DBVariant[];
}

/**
 * Service for ingesting extracted ProductShell data into the database
 * Handles product/variant upserts, price/stock history, and transactional safety
 */
export class ProductIngestionService {
  constructor(
    private productRepo: ProductRepository,
    private variantRepo: VariantRepository
  ) {}

  /**
   * Ingest a ProductShell into the database
   * - Upserts product
   * - Upserts variants (matches by attributes)
   * - Inserts price/stock history
   * - Updates variant current values
   * - Runs in a single transaction
   */
  async ingest(productShell: ProductShell): Promise<IngestionResult> {
    return withTransaction(async (client: PoolClient) => {
      // Create transactional repositories
      const productRepo = new ProductRepository(client);
      const variantRepo = new VariantRepository(client);

      // 1. Normalize ProductShell
      const normalizedProduct = normalizeProductShell(productShell);

      // 2. Upsert Product
      const product = await this.upsertProduct(
        productRepo,
        normalizedProduct
      );

      // 3. Process Variants
      const variants: DBVariant[] = [];
      const priceShell = productShell.pricing;
      const stockShell = productShell.stock;

      for (const variantShell of productShell.variants) {
        // Normalize variant
        const normalizedVariant = normalizeVariantShell(
          variantShell,
          priceShell,
          stockShell
        );

        // Find existing variant by attributes (with SKU fallback)
        const existingVariant = await variantRepo.findMatchingVariant(
          product.id,
          normalizedVariant.attributes,
          normalizedVariant.sku
        );

        let variant: DBVariant;
        const now = new Date().toISOString();
        if (existingVariant) {
          // Update existing variant
          variant = await variantRepo.updateVariant(existingVariant.id, {
            sku: normalizedVariant.sku,
            attributes: normalizedVariant.attributes,
            currency: normalizedVariant.currency,
            current_price: normalizedVariant.current_price,
            current_stock_status: normalizedVariant.current_stock_status,
            is_available: normalizedVariant.is_available,
            metadata: normalizedVariant.metadata,
            last_checked_at: now,
          } as Partial<DBVariant>);
        } else {
          // Create new variant - use direct SQL to set last_checked_at
          const createSql = `
            INSERT INTO variants (
              product_id,
              sku,
              attributes,
              currency,
              current_price,
              current_stock_status,
              is_available,
              metadata,
              last_checked_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
          `;
          // Use the client directly since we're in a transaction
          const result = await client.query<DBVariant>(createSql, [
            product.id,
            normalizedVariant.sku,
            normalizedVariant.attributes,
            normalizedVariant.currency,
            normalizedVariant.current_price,
            normalizedVariant.current_stock_status,
            normalizedVariant.is_available,
            normalizedVariant.metadata,
            now,
          ]);
          if (result.rows.length === 0) {
            throw new Error("Failed to create variant");
          }
          variant = result.rows[0];
        }

        // 4. Insert price history only if price changed
        if (
          normalizedVariant.current_price !== null &&
          normalizedVariant.current_price !== undefined
        ) {
          const shouldInsertPrice = await this.shouldInsertPriceHistory(
            client,
            variant.id,
            normalizedVariant.current_price,
            normalizedVariant.currency
          );

          if (shouldInsertPrice) {
            await this.insertPriceHistory(
              client,
              variant.id,
              normalizedVariant.current_price,
              normalizedVariant.currency,
              priceShell?.raw || null,
              priceShell?.metadata || {}
            );

            // Check for price changes and create notifications
            await notificationService.checkPriceChange(
              client,
              variant.id,
              normalizedVariant.current_price,
              normalizedVariant.currency
            );
          }
        }

        // 5. Insert stock history only if stock status changed
        if (normalizedVariant.current_stock_status) {
          const shouldInsertStock = await this.shouldInsertStockHistory(
            client,
            variant.id,
            normalizedVariant.current_stock_status
          );

          if (shouldInsertStock) {
            await this.insertStockHistory(
              client,
              variant.id,
              normalizedVariant.current_stock_status,
              stockShell?.raw || null,
              stockShell?.metadata || {}
            );

            // Check for stock changes and create notifications
            await notificationService.checkStockChange(
              client,
              variant.id,
              normalizedVariant.current_stock_status
            );
          }
        }

        variants.push(variant);
      }

      return {
        product,
        variants,
      };
    });
  }

  /**
   * Upsert product - find by URL or canonical_url, update if exists, create if not
   */
  private async upsertProduct(
    productRepo: ProductRepository,
    normalizedProduct: ReturnType<typeof normalizeProductShell>
  ): Promise<DBProduct> {
    // Try to find by URL first
    let existing = await productRepo.findByURL(normalizedProduct.url);

    // If not found and canonical_url exists, try canonical_url
    if (!existing && normalizedProduct.canonical_url) {
      existing = await productRepo.findByCanonicalURL(
        normalizedProduct.canonical_url
      );
    }

    if (existing) {
      // Update existing product
      return productRepo.updateProduct(existing.id, {
        canonical_url: normalizedProduct.canonical_url,
        name: normalizedProduct.name,
        description: normalizedProduct.description,
        vendor: normalizedProduct.vendor,
        main_image_url: normalizedProduct.main_image_url,
        metadata: normalizedProduct.metadata,
      });
    } else {
      // Create new product
      return productRepo.createProduct(normalizedProduct);
    }
  }

  /**
   * Insert price history record
   */
  private async insertPriceHistory(
    client: PoolClient,
    variantId: number,
    price: number,
    currency: string | null,
    raw: string | null,
    metadata: Record<string, any>
  ): Promise<void> {
    const sql = `
      INSERT INTO variant_price_history (
        variant_id,
        recorded_at,
        price,
        currency,
        raw,
        metadata
      )
      VALUES ($1, now(), $2, $3, $4, $5)
    `;

    await client.query(sql, [
      variantId,
      price,
      currency,
      raw,
      JSON.stringify(metadata),
    ]);
  }

  /**
   * Insert stock history record
   */
  private async insertStockHistory(
    client: PoolClient,
    variantId: number,
    status: string,
    raw: string | null,
    metadata: Record<string, any>
  ): Promise<void> {
    const sql = `
      INSERT INTO variant_stock_history (
        variant_id,
        recorded_at,
        status,
        raw,
        metadata
      )
      VALUES ($1, now(), $2, $3, $4)
    `;

    await client.query(sql, [
      variantId,
      status,
      raw,
      JSON.stringify(metadata),
    ]);
  }

  /**
   * Check if price history should be inserted (only if price changed)
   * Returns true if:
   * - No previous price history exists, OR
   * - Price or currency changed from last history entry
   */
  private async shouldInsertPriceHistory(
    client: PoolClient,
    variantId: number,
    newPrice: number,
    newCurrency: string | null
  ): Promise<boolean> {
    const sql = `
      SELECT price, currency
      FROM variant_price_history
      WHERE variant_id = $1
      ORDER BY recorded_at DESC
      LIMIT 1
    `;

    const result = await client.query(sql, [variantId]);

    // If no history exists, insert first record
    if (result.rows.length === 0) {
      return true;
    }

    const lastEntry = result.rows[0];

    // Insert if price or currency changed
    return (
      lastEntry.price !== newPrice ||
      lastEntry.currency !== newCurrency
    );
  }

  /**
   * Check if stock history should be inserted (only if status changed)
   * Returns true if:
   * - No previous stock history exists, OR
   * - Status changed from last history entry
   */
  private async shouldInsertStockHistory(
    client: PoolClient,
    variantId: number,
    newStatus: string
  ): Promise<boolean> {
    const sql = `
      SELECT status
      FROM variant_stock_history
      WHERE variant_id = $1
      ORDER BY recorded_at DESC
      LIMIT 1
    `;

    const result = await client.query(sql, [variantId]);

    // If no history exists, insert first record
    if (result.rows.length === 0) {
      return true;
    }

    const lastEntry = result.rows[0];

    // Insert only if status changed
    return lastEntry.status !== newStatus;
  }
}

