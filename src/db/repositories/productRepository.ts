import { BaseRepository } from "../baseRepository.js";
import type { DBProduct, CreateProductInput } from "../types.js";

/**
 * Repository for product database operations
 * Handles CRUD operations for the products table
 */
export class ProductRepository extends BaseRepository {
  /**
   * Create a new product
   *
   * @param data - Product data to insert
   * @returns Created product
   */
  async createProduct(data: CreateProductInput): Promise<DBProduct> {
    const sql = `
      INSERT INTO products (
        url,
        canonical_url,
        name,
        description,
        vendor,
        main_image_url,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const params = [
      data.url,
      data.canonical_url ?? null,
      data.name ?? null,
      data.description ?? null,
      data.vendor ?? null,
      data.main_image_url ?? null,
      data.metadata ?? {},
    ];

    return this.insert<DBProduct>(sql, params);
  }

  /**
   * Update an existing product
   *
   * @param id - Product ID
   * @param patch - Partial product data to update
   * @returns Updated product
   */
  async updateProduct(
    id: number,
    patch: Partial<DBProduct>
  ): Promise<DBProduct> {
    // Filter out fields that shouldn't be updated
    const { id: _, created_at, updated_at, ...updateableFields } = patch;
    const fields = Object.keys(updateableFields);
    const values = Object.values(updateableFields).map((val) =>
      val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)
        ? JSON.stringify(val)
        : val
    );

    if (fields.length === 0) {
      const existing = await this.getProductById(id);
      if (!existing) {
        throw new Error(`Product with id ${id} not found`);
      }
      return existing;
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");

    const sql = `
      UPDATE products
      SET ${setClause}, updated_at = now()
      WHERE id = $1
      RETURNING *;
    `;

    return this.insert<DBProduct>(sql, [id, ...values]);
  }

  /**
   * Get a product by ID
   *
   * @param id - Product ID
   * @returns Product or null if not found
   */
  async getProductById(id: number): Promise<DBProduct | null> {
    const sql = `SELECT * FROM products WHERE id = $1`;
    return this.findOne<DBProduct>(sql, [id]);
  }

  /**
   * Find a product by URL
   *
   * @param url - Product URL
   * @returns Product or null if not found
   */
  async findByURL(url: string): Promise<DBProduct | null> {
    const sql = `SELECT * FROM products WHERE url = $1`;
    return this.findOne<DBProduct>(sql, [url]);
  }

  /**
   * Find a product by canonical URL
   *
   * @param canonicalUrl - Canonical URL
   * @returns Product or null if not found
   */
  async findByCanonicalURL(canonicalUrl: string): Promise<DBProduct | null> {
    const sql = `SELECT * FROM products WHERE canonical_url = $1`;
    return this.findOne<DBProduct>(sql, [canonicalUrl]);
  }

  /**
   * Get all products (with optional pagination)
   *
   * @param limit - Maximum number of products to return
   * @param offset - Number of products to skip
   * @returns Array of products
   */
  async getAllProducts(limit: number = 100, offset: number = 0): Promise<DBProduct[]> {
    const sql = `SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    return this.findMany<DBProduct>(sql, [limit, offset]);
  }

  /**
   * Delete a product (cascades to variants)
   *
   * @param id - Product ID
   */
  async deleteProduct(id: number): Promise<void> {
    const sql = `DELETE FROM products WHERE id = $1`;
    await this.execute(sql, [id]);
  }
}

