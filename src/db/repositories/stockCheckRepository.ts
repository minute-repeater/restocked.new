/**
 * Stock Check Repository
 * 
 * Manages stock_checks table for historical stock detection metadata.
 * Provides methods to:
 * - Create new stock check records
 * - Query check history per tracked item
 * - Run retention cleanup
 * 
 * Uses PostgreSQL schema from migration 010_stock_detection_metadata.sql
 */

import { query, withTransaction } from "../client.js";
import type { PoolClient } from "pg";

/**
 * Stock status enum matching database type
 */
export type StockStatusType = 'in_stock' | 'out_of_stock' | 'low_stock' | 'preorder' | 'unknown';

/**
 * Stock check record from database
 */
export interface StockCheck {
  id: bigint;
  tracked_item_id: bigint;
  checked_at: string; // ISO timestamp
  availability: StockStatusType;
  confidence: number | null;
  strategy_name: string;
  reason_code: string | null;
  evidence: string[] | null;
  raw_metadata: Record<string, any> | null;
}

/**
 * Input data for creating a stock check
 */
export interface CreateStockCheckInput {
  tracked_item_id: bigint;
  availability: StockStatusType;
  confidence?: number | null;
  strategy_name: string;
  reason_code?: string | null;
  evidence?: string[] | null;
  raw_metadata?: Record<string, any> | null;
}

/**
 * Result from cleanup operation
 */
export interface CleanupResult {
  tracked_item_id: bigint;
  deleted_count: bigint;
}

/**
 * Stock Check Repository
 */
export class StockCheckRepository {
  /**
   * Create a new stock check record
   * 
   * @param input - Stock check data
   * @param client - Optional transaction client
   * @returns Created stock check record
   */
  async create(
    input: CreateStockCheckInput,
    client?: PoolClient
  ): Promise<StockCheck> {
    const sql = `
      INSERT INTO stock_checks (
        tracked_item_id,
        availability,
        confidence,
        strategy_name,
        reason_code,
        evidence,
        raw_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      input.tracked_item_id,
      input.availability,
      input.confidence ?? null,
      input.strategy_name,
      input.reason_code ?? null,
      input.evidence ?? null,
      input.raw_metadata ? JSON.stringify(input.raw_metadata) : null,
    ];

    const result = await (client ? client.query(sql, values) : query(sql, values));
    return result.rows[0];
  }

  /**
   * Get check history for a tracked item
   * 
   * @param trackedItemId - Tracked item ID
   * @param limit - Maximum number of checks to return (default 50)
   * @returns Array of stock checks, newest first
   */
  async getCheckHistory(
    trackedItemId: bigint,
    limit: number = 50
  ): Promise<StockCheck[]> {
    const sql = `
      SELECT *
      FROM stock_checks
      WHERE tracked_item_id = $1
      ORDER BY checked_at DESC
      LIMIT $2
    `;

    const result = await query<StockCheck>(sql, [trackedItemId, limit]);
    return result.rows;
  }

  /**
   * Get latest check for a tracked item
   * 
   * @param trackedItemId - Tracked item ID
   * @returns Latest stock check or null if none exist
   */
  async getLatestCheck(trackedItemId: bigint): Promise<StockCheck | null> {
    const sql = `
      SELECT *
      FROM stock_checks
      WHERE tracked_item_id = $1
      ORDER BY checked_at DESC
      LIMIT 1
    `;

    const result = await query<StockCheck>(sql, [trackedItemId]);
    return result.rows[0] ?? null;
  }

  /**
   * Get check history for multiple tracked items (batched)
   * 
   * @param trackedItemIds - Array of tracked item IDs
   * @param limitPerItem - Max checks per item (default 10)
   * @returns Map of tracked_item_id -> array of checks
   */
  async getBatchCheckHistory(
    trackedItemIds: bigint[],
    limitPerItem: number = 10
  ): Promise<Map<bigint, StockCheck[]>> {
    if (trackedItemIds.length === 0) {
      return new Map();
    }

    const sql = `
      WITH ranked_checks AS (
        SELECT 
          *,
          ROW_NUMBER() OVER (PARTITION BY tracked_item_id ORDER BY checked_at DESC) AS rn
        FROM stock_checks
        WHERE tracked_item_id = ANY($1)
      )
      SELECT *
      FROM ranked_checks
      WHERE rn <= $2
      ORDER BY tracked_item_id, checked_at DESC
    `;

    const result = await query<StockCheck>(sql, [trackedItemIds, limitPerItem]);
    
    const checksMap = new Map<bigint, StockCheck[]>();
    for (const row of result.rows) {
      const id = row.tracked_item_id;
      if (!checksMap.has(id)) {
        checksMap.set(id, []);
      }
      checksMap.get(id)!.push(row);
    }

    return checksMap;
  }

  /**
   * Count checks for a tracked item
   * 
   * @param trackedItemId - Tracked item ID
   * @returns Total number of checks
   */
  async countChecks(trackedItemId: bigint): Promise<number> {
    const sql = `
      SELECT COUNT(*)::INT AS count
      FROM stock_checks
      WHERE tracked_item_id = $1
    `;

    const result = await query(sql, [trackedItemId]);
    return result.rows[0]?.count ?? 0;
  }

  /**
   * Run retention cleanup - delete old checks beyond retention limit
   * 
   * @param retentionLimit - Number of checks to keep per tracked item (default 100)
   * @returns Array of cleanup results showing deleted counts per tracked item
   */
  async runCleanup(retentionLimit: number = 100): Promise<CleanupResult[]> {
    const sql = `SELECT * FROM cleanup_old_stock_checks($1)`;
    const result = await query<CleanupResult>(sql, [retentionLimit]);
    return result.rows;
  }

  /**
   * Delete all checks for a tracked item
   * Used when a tracked item is deleted (usually CASCADE handles this)
   * 
   * @param trackedItemId - Tracked item ID
   * @returns Number of deleted checks
   */
  async deleteAllChecksForItem(trackedItemId: bigint): Promise<number> {
    const sql = `
      DELETE FROM stock_checks
      WHERE tracked_item_id = $1
    `;

    const result = await query(sql, [trackedItemId]);
    return result.rowCount ?? 0;
  }

  /**
   * Get aggregate stats for a tracked item
   * 
   * @param trackedItemId - Tracked item ID
   * @returns Stats about check history
   */
  async getCheckStats(trackedItemId: bigint): Promise<{
    total_checks: number;
    first_check: string | null;
    last_check: string | null;
    availability_breakdown: Record<StockStatusType, number>;
    most_common_strategy: string | null;
  }> {
    const sql = `
      WITH stats AS (
        SELECT
          COUNT(*)::INT AS total_checks,
          MIN(checked_at) AS first_check,
          MAX(checked_at) AS last_check,
          availability,
          strategy_name,
          COUNT(*) AS count
        FROM stock_checks
        WHERE tracked_item_id = $1
        GROUP BY availability, strategy_name
      ),
      availability_agg AS (
        SELECT
          availability,
          SUM(count)::INT AS count
        FROM stats
        GROUP BY availability
      ),
      strategy_agg AS (
        SELECT
          strategy_name,
          SUM(count)::INT AS count
        FROM stats
        GROUP BY strategy_name
        ORDER BY count DESC
        LIMIT 1
      ),
      totals AS (
        SELECT
          COUNT(*)::INT AS total_checks,
          MIN(checked_at) AS first_check,
          MAX(checked_at) AS last_check
        FROM stock_checks
        WHERE tracked_item_id = $1
      )
      SELECT
        t.total_checks,
        t.first_check,
        t.last_check,
        COALESCE(
          jsonb_object_agg(a.availability, a.count),
          '{}'::jsonb
        ) AS availability_breakdown,
        (SELECT strategy_name FROM strategy_agg) AS most_common_strategy
      FROM totals t
      LEFT JOIN availability_agg a ON true
      GROUP BY t.total_checks, t.first_check, t.last_check
    `;

    type StatsRow = {
      total_checks: number;
      first_check: string | null;
      last_check: string | null;
      availability_breakdown: Record<StockStatusType, number>;
      most_common_strategy: string | null;
    };
    
    const result = await query<StatsRow>(sql, [trackedItemId]);
    
    if (result.rows.length === 0) {
      return {
        total_checks: 0,
        first_check: null,
        last_check: null,
        availability_breakdown: {} as Record<StockStatusType, number>,
        most_common_strategy: null,
      };
    }

    return result.rows[0];
  }
}

// Export singleton instance
export const stockCheckRepository = new StockCheckRepository();
