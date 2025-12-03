import { PoolClient, QueryResult, QueryResultRow } from "pg";
import { query } from "./client.js";

/**
 * Base repository class providing common database operations
 * All repositories should extend this class
 */
export abstract class BaseRepository {
  constructor(protected client?: PoolClient) {}

  /**
   * Get the database query function - uses transaction client if provided, otherwise uses pool
   */
  protected async db<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (this.client) {
      return this.client.query<T>(text, params);
    }
    return query<T>(text, params);
  }

  /**
   * Execute a SELECT query and return a single row
   * Returns null if no row is found
   *
   * @param sql - SQL query string with parameter placeholders
   * @param params - Query parameters
   * @returns Single row or null
   */
  protected async findOne<T extends QueryResultRow = QueryResultRow>(sql: string, params: any[] = []): Promise<T | null> {
    const result = await this.db<T>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a SELECT query and return all rows
   * Returns empty array if no rows found
   *
   * @param sql - SQL query string with parameter placeholders
   * @param params - Query parameters
   * @returns Array of rows
   */
  protected async findMany<T extends QueryResultRow = QueryResultRow>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await this.db<T>(sql, params);
    return result.rows;
  }

  /**
   * Execute a query that doesn't return rows (INSERT, UPDATE, DELETE)
   * Useful for operations where you don't need the result
   *
   * @param sql - SQL query string with parameter placeholders
   * @param params - Query parameters
   */
  protected async execute(sql: string, params: any[] = []): Promise<void> {
    await this.db(sql, params);
  }

  /**
   * Execute an INSERT query and return the inserted row
   * Assumes the query returns the inserted row (e.g., RETURNING *)
   *
   * @param sql - SQL INSERT query with RETURNING clause
   * @param params - Query parameters
   * @returns Inserted row
   */
  protected async insert<T extends QueryResultRow = QueryResultRow>(sql: string, params: any[] = []): Promise<T> {
    const result = await this.db<T>(sql, params);
    if (result.rows.length === 0) {
      throw new Error("Insert query did not return a row");
    }
    return result.rows[0];
  }

  /**
   * Execute an UPDATE query and return the updated row
   * Assumes the query returns the updated row (e.g., RETURNING *)
   *
   * @param sql - SQL UPDATE query with RETURNING clause
   * @param params - Query parameters
   * @returns Updated row or null if no row was updated
   */
  protected async update<T extends QueryResultRow = QueryResultRow>(sql: string, params: any[] = []): Promise<T | null> {
    const result = await this.db<T>(sql, params);
    return result.rows[0] || null;
  }
}

