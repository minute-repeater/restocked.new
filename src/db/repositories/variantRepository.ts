import { BaseRepository } from "../baseRepository.js";
import type { DBVariant, CreateVariantInput } from "../types.js";

/**
 * Repository for variant database operations
 * Handles CRUD operations for the variants table
 */
export class VariantRepository extends BaseRepository {
  /**
   * Create a new variant
   *
   * @param data - Variant data to insert
   * @returns Created variant
   */
  async createVariant(data: CreateVariantInput): Promise<DBVariant> {
    const sql = `
      INSERT INTO variants (
        product_id,
        sku,
        attributes,
        currency,
        current_price,
        current_stock_status,
        is_available,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      data.product_id,
      data.sku ?? null,
      data.attributes,
      data.currency ?? null,
      data.current_price ?? null,
      data.current_stock_status ?? null,
      data.is_available ?? null,
      data.metadata ?? {},
    ];

    return this.insert<DBVariant>(sql, params);
  }

  /**
   * Update an existing variant
   *
   * @param id - Variant ID
   * @param patch - Partial variant data to update
   * @returns Updated variant
   */
  async updateVariant(
    id: number,
    patch: Partial<DBVariant>
  ): Promise<DBVariant> {
    // Filter out fields that shouldn't be updated
    const { id: _, product_id, created_at, updated_at, ...updateableFields } = patch;
    const fields = Object.keys(updateableFields);
    const values = Object.values(updateableFields).map((val) => {
      // Handle JSONB fields (attributes, metadata)
      if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
        return JSON.stringify(val);
      }
      return val;
    });

    if (fields.length === 0) {
      const existing = await this.getVariantById(id);
      if (!existing) {
        throw new Error(`Variant with id ${id} not found`);
      }
      return existing;
    }

    const setClause = fields.map((f, i) => {
      // Add ::jsonb cast for JSONB fields
      if (f === "attributes" || f === "metadata") {
        return `${f} = $${i + 2}::jsonb`;
      }
      return `${f} = $${i + 2}`;
    }).join(", ");

    const sql = `
      UPDATE variants
      SET ${setClause}, updated_at = now()
      WHERE id = $1
      RETURNING *;
    `;

    return this.insert<DBVariant>(sql, [id, ...values]);
  }

  /**
   * Get a variant by ID
   *
   * @param id - Variant ID
   * @returns Variant or null if not found
   */
  async getVariantById(id: number): Promise<DBVariant | null> {
    const sql = `SELECT * FROM variants WHERE id = $1`;
    return this.findOne<DBVariant>(sql, [id]);
  }

  /**
   * Find all variants for a product
   *
   * @param productId - Product ID
   * @returns Array of variants
   */
  async findByProduct(productId: number): Promise<DBVariant[]> {
    const sql = `SELECT * FROM variants WHERE product_id = $1 ORDER BY created_at ASC`;
    return this.findMany<DBVariant>(sql, [productId]);
  }

  /**
   * Find a variant by SKU
   *
   * @param sku - Variant SKU
   * @returns Variant or null if not found
   */
  async findBySKU(sku: string): Promise<DBVariant | null> {
    const sql = `SELECT * FROM variants WHERE sku = $1`;
    return this.findOne<DBVariant>(sql, [sku]);
  }

  /**
   * Find a variant that matches the given attributes
   * Uses multiple matching strategies in order:
   * 1. Exact match (attributes identical)
   * 2. Subset match (existing variant attributes are subset of new)
   * 3. SKU match (if SKU exists)
   *
   * @param productId - Product ID
   * @param attributes - Variant attributes to match (as JSONB object)
   * @param sku - Optional SKU to match
   * @returns Variant or null if not found
   */
  async findMatchingVariant(
    productId: number,
    attributes: any,
    sku?: string | null
  ): Promise<DBVariant | null> {
    const attributesJson = JSON.stringify(attributes);

    // Strategy 1: Exact match (attributes identical)
    const exactMatchSql = `
      SELECT * FROM variants
      WHERE product_id = $1
        AND attributes @> $2::jsonb
        AND attributes <@ $2::jsonb
      LIMIT 1
    `;

    const exactMatch = await this.findOne<DBVariant>(exactMatchSql, [
      productId,
      attributesJson,
    ]);

    if (exactMatch) {
      return exactMatch;
    }

    // Strategy 2: Subset match (existing variant attributes are subset of new attributes)
    // This means: new attributes contain all existing attributes, but may have extras
    const subsetMatchSql = `
      SELECT * FROM variants
      WHERE product_id = $1
        AND $2::jsonb @> attributes
      LIMIT 1
    `;

    const subsetMatch = await this.findOne<DBVariant>(subsetMatchSql, [
      productId,
      attributesJson,
    ]);

    if (subsetMatch) {
      return subsetMatch;
    }

    // Strategy 3: SKU match (if SKU provided and exists)
    if (sku) {
      const skuMatch = await this.findBySKU(sku);
      if (skuMatch && skuMatch.product_id === productId) {
        return skuMatch;
      }
    }

    return null;
  }

  /**
   * Delete a variant
   *
   * @param id - Variant ID
   */
  async deleteVariant(id: number): Promise<void> {
    const sql = `DELETE FROM variants WHERE id = $1`;
    await this.execute(sql, [id]);
  }

  /**
   * Delete all variants for a product
   *
   * @param productId - Product ID
   */
  async deleteByProduct(productId: number): Promise<void> {
    const sql = `DELETE FROM variants WHERE product_id = $1`;
    await this.execute(sql, [productId]);
  }
}

