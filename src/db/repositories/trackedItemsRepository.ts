import { BaseRepository } from "../baseRepository.js";

/**
 * Tracked item as stored in the database
 */
export interface DBTrackedItem {
  id: number;
  user_id: string; // UUID
  product_id: number;
  variant_id: number | null;
  alias: string | null;
  notifications_enabled: boolean;
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

/**
 * Tracked item with related product and variant data
 */
export interface TrackedItemWithRelations extends DBTrackedItem {
  product: {
    id: number;
    name: string | null;
    url: string;
    created_at: string;
    updated_at: string;
  };
  variant: {
    id: number;
    current_price: number | null;
    current_stock_status: string | null;
    attributes: any;
  } | null;
}

/**
 * Input type for creating a tracked item
 */
export interface CreateTrackedItemInput {
  user_id: string; // UUID
  product_id: number;
  variant_id?: number | null;
  alias?: string | null;
}

/**
 * Repository for tracked items database operations
 * Handles CRUD operations for the tracked_items table
 */
export class TrackedItemsRepository extends BaseRepository {
  /**
   * Create a new tracked item
   *
   * @param data - Tracked item data to insert
   * @returns Created tracked item
   */
  async createTrackedItem(data: CreateTrackedItemInput): Promise<DBTrackedItem> {
    const sql = `
      INSERT INTO tracked_items (user_id, product_id, variant_id, alias)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const params = [
      data.user_id,
      data.product_id,
      data.variant_id ?? null,
      data.alias ?? null,
    ];

    return this.insert<DBTrackedItem>(sql, params);
  }

  /**
   * Get all tracked items for a user with product and variant data
   *
   * @param user_id - User UUID
   * @returns Array of tracked items with relations
   */
  async getTrackedItemsByUser(user_id: string): Promise<TrackedItemWithRelations[]> {
    const sql = `
      SELECT 
        ti.id,
        ti.user_id,
        ti.product_id,
        ti.variant_id,
        ti.alias,
        ti.notifications_enabled,
        ti.created_at,
        ti.updated_at,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'url', p.url,
          'main_image_url', p.main_image_url,
          'created_at', p.created_at,
          'updated_at', p.updated_at
        ) as product,
        CASE 
          WHEN v.id IS NOT NULL THEN
            json_build_object(
              'id', v.id,
              'current_price', v.current_price,
              'current_stock_status', v.current_stock_status,
              'attributes', v.attributes
            )
          ELSE NULL
        END as variant
      FROM tracked_items ti
      INNER JOIN products p ON ti.product_id = p.id
      LEFT JOIN variants v ON ti.variant_id = v.id
      WHERE ti.user_id = $1
      ORDER BY ti.created_at DESC
    `;

    const result = await this.db<{
      id: number;
      user_id: string;
      product_id: number;
      variant_id: number | null;
      alias: string | null;
      notifications_enabled: boolean;
      created_at: string;
      updated_at: string;
      product: any;
      variant: any;
    }>(sql, [user_id]);

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      product_id: row.product_id,
      variant_id: row.variant_id,
      alias: row.alias,
      notifications_enabled: row.notifications_enabled,
      created_at: row.created_at,
      updated_at: row.updated_at,
      product: row.product,
      variant: row.variant,
    }));
  }

  /**
   * Get a tracked item by ID (for verification)
   *
   * @param id - Tracked item ID
   * @returns Tracked item or null if not found
   */
  async getTrackedItemById(id: number): Promise<DBTrackedItem | null> {
    const sql = `SELECT * FROM tracked_items WHERE id = $1`;
    return this.findOne<DBTrackedItem>(sql, [id]);
  }

  /**
   * Delete a tracked item (only if it belongs to the user)
   *
   * @param id - Tracked item ID
   * @param user_id - User UUID (for ownership verification)
   * @returns true if deleted, false if not found or not owned by user
   */
  async deleteTrackedItem(id: number, user_id: string): Promise<boolean> {
    const sql = `
      DELETE FROM tracked_items 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await this.db<{ id: number }>(sql, [id, user_id]);
    return result.rows.length > 0;
  }
}

