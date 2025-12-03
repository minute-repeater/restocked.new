import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

/**
 * PostgreSQL connection pool
 * Configured via DATABASE_URL environment variable
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
});

/**
 * Check if we're in development mode
 */
const isDevMode = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

/**
 * Execute a SQL query with optional parameters
 * Uses parameterized queries to prevent SQL injection
 * Logs queries with timing in development mode
 *
 * @param text - SQL query string with $1, $2, etc. placeholders
 * @param params - Array of parameter values
 * @returns Query result with typed rows
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const startTime = Date.now();

  try {
    const result = await pool.query<T>(text, params);

    if (isDevMode) {
      const duration = Date.now() - startTime;
      // Truncate long queries for readability
      const queryPreview = text.length > 100 ? text.substring(0, 100) + "..." : text;
      console.log(`[DB] ${duration}ms ${queryPreview}`);
    }

    return result;
  } catch (error) {
    if (isDevMode) {
      const duration = Date.now() - startTime;
      const queryPreview = text.length > 100 ? text.substring(0, 100) + "..." : text;
      console.error(`[DB] ${duration}ms ERROR ${queryPreview}`, error);
    }
    throw error;
  }
}

/**
 * Execute a function within a database transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 *
 * @param fn - Function that receives a PoolClient and returns a Promise
 * @returns Result of the function
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get the underlying pool instance
 * Useful for advanced operations or testing
 */
export function getPool(): Pool {
  return pool;
}

/**
 * Close all database connections
 * Should be called when shutting down the application
 */
export async function closePool(): Promise<void> {
  await pool.end();
}


