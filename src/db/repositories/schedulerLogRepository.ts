import { BaseRepository } from "../baseRepository.js";

/**
 * Scheduler log as stored in the database
 */
export interface DBSchedulerLog {
  id: number;
  run_started_at: string; // ISO timestamp string
  run_finished_at: string | null;
  products_checked: number;
  items_checked: number;
  success: boolean;
  error: string | null;
  metadata: any; // JSONB
}

/**
 * Input type for creating a scheduler log
 */
export interface CreateSchedulerLogInput {
  run_started_at: Date;
  products_checked?: number;
  items_checked?: number;
  success?: boolean;
  error?: string | null;
  metadata?: any;
}

/**
 * Input type for updating a scheduler log (finishing a run)
 */
export interface UpdateSchedulerLogInput {
  run_finished_at: Date;
  products_checked?: number;
  items_checked?: number;
  success?: boolean;
  error?: string | null;
  metadata?: any;
}

/**
 * Repository for scheduler log database operations
 */
export class SchedulerLogRepository extends BaseRepository {
  /**
   * Create a new scheduler log entry (start of run)
   *
   * @param data - Scheduler log data
   * @returns Created log entry
   */
  async createLog(data: CreateSchedulerLogInput): Promise<DBSchedulerLog> {
    const sql = `
      INSERT INTO scheduler_logs (
        run_started_at,
        products_checked,
        items_checked,
        success,
        error,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const params = [
      data.run_started_at.toISOString(),
      data.products_checked ?? 0,
      data.items_checked ?? 0,
      data.success ?? false,
      data.error ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ];

    return this.insert<DBSchedulerLog>(sql, params);
  }

  /**
   * Update a scheduler log entry (end of run)
   *
   * @param id - Log entry ID
   * @param data - Update data
   * @returns Updated log entry
   */
  async updateLog(id: number, data: UpdateSchedulerLogInput): Promise<DBSchedulerLog> {
    const sql = `
      UPDATE scheduler_logs
      SET 
        run_finished_at = $2,
        products_checked = COALESCE($3, products_checked),
        items_checked = COALESCE($4, items_checked),
        success = COALESCE($5, success),
        error = COALESCE($6, error),
        metadata = COALESCE($7::jsonb, metadata)
      WHERE id = $1
      RETURNING *
    `;

    const params = [
      id,
      data.run_finished_at.toISOString(),
      data.products_checked ?? null,
      data.items_checked ?? null,
      data.success ?? null,
      data.error ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ];

    const result = await this.db<DBSchedulerLog>(sql, params);
    if (result.rows.length === 0) {
      throw new Error(`Scheduler log with id ${id} not found`);
    }
    return result.rows[0];
  }

  /**
   * Get the most recent scheduler log
   *
   * @returns Most recent log entry or null
   */
  async getLatestLog(): Promise<DBSchedulerLog | null> {
    const sql = `
      SELECT * FROM scheduler_logs
      ORDER BY run_started_at DESC
      LIMIT 1
    `;
    return this.findOne<DBSchedulerLog>(sql, []);
  }

  /**
   * Get scheduler logs with pagination
   *
   * @param limit - Maximum number of logs to return
   * @param offset - Number of logs to skip
   * @returns Array of log entries
   */
  async getLogs(limit: number = 50, offset: number = 0): Promise<DBSchedulerLog[]> {
    const sql = `
      SELECT * FROM scheduler_logs
      ORDER BY run_started_at DESC
      LIMIT $1 OFFSET $2
    `;
    return this.findMany<DBSchedulerLog>(sql, [limit, offset]);
  }
}




