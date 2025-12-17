/**
 * PostgreSQL Advisory Lock Utilities
 * 
 * Uses PostgreSQL advisory locks to prevent duplicate concurrent scheduler runs
 * across multiple worker instances. This is essential for:
 * - Preventing duplicate job execution when scaling horizontally
 * - Ensuring only one worker runs a scheduled job at a time
 * - Automatic lock release on connection close or process termination
 * 
 * Lock IDs are 64-bit integers. We use a namespace (high 32 bits) + job ID (low 32 bits).
 */

import { getPool } from "../db/client.js";
import { logger } from "../api/utils/logger.js";

/**
 * Lock namespace for scheduler jobs
 * Using a fixed namespace prevents collision with other advisory lock users
 */
const SCHEDULER_LOCK_NAMESPACE = 0x53544B43; // "STKC" in hex

/**
 * Known scheduler job IDs
 * Each scheduler type gets a unique ID
 */
export const SchedulerLockIds = {
  PRODUCT_CHECK: 1,
  EMAIL_DELIVERY: 2,
  TRACKING: 3,
  MAIN_SCHEDULER: 4,
} as const;

export type SchedulerLockId = typeof SchedulerLockIds[keyof typeof SchedulerLockIds];

/**
 * Combine namespace and job ID into a single 64-bit lock key
 * PostgreSQL advisory locks use bigint (64-bit signed integer)
 */
function getLockKey(jobId: SchedulerLockId): string {
  // Combine namespace (32 bits) + job ID (32 bits) as a bigint string
  const lockKey = BigInt(SCHEDULER_LOCK_NAMESPACE) << BigInt(32) | BigInt(jobId);
  return lockKey.toString();
}

/**
 * Attempt to acquire an advisory lock (non-blocking)
 * Returns true if lock was acquired, false if already held by another session
 * 
 * Uses pg_try_advisory_lock which:
 * - Returns immediately (non-blocking)
 * - Returns true if lock acquired, false if not
 * - Lock is held until explicitly released or session ends
 * 
 * @param jobId - The scheduler job ID to lock
 * @returns true if lock acquired, false if already held
 */
export async function tryAcquireLock(jobId: SchedulerLockId): Promise<boolean> {
  const lockKey = getLockKey(jobId);
  const pool = getPool();
  
  try {
    const result = await pool.query<{ pg_try_advisory_lock: boolean }>(
      `SELECT pg_try_advisory_lock($1::bigint) as pg_try_advisory_lock`,
      [lockKey]
    );
    
    const acquired = result.rows[0]?.pg_try_advisory_lock ?? false;
    
    if (acquired) {
      logger.debug({ jobId, lockKey }, "Advisory lock acquired");
    } else {
      logger.debug({ jobId, lockKey }, "Advisory lock not available (held by another session)");
    }
    
    return acquired;
  } catch (error) {
    logger.error({ jobId, lockKey, error }, "Failed to acquire advisory lock");
    return false;
  }
}

/**
 * Release an advisory lock
 * 
 * Uses pg_advisory_unlock which:
 * - Returns true if lock was held and released
 * - Returns false if lock was not held by this session
 * 
 * @param jobId - The scheduler job ID to unlock
 * @returns true if lock was released, false if not held
 */
export async function releaseLock(jobId: SchedulerLockId): Promise<boolean> {
  const lockKey = getLockKey(jobId);
  const pool = getPool();
  
  try {
    const result = await pool.query<{ pg_advisory_unlock: boolean }>(
      `SELECT pg_advisory_unlock($1::bigint) as pg_advisory_unlock`,
      [lockKey]
    );
    
    const released = result.rows[0]?.pg_advisory_unlock ?? false;
    
    if (released) {
      logger.debug({ jobId, lockKey }, "Advisory lock released");
    } else {
      logger.warn({ jobId, lockKey }, "Advisory lock was not held by this session");
    }
    
    return released;
  } catch (error) {
    logger.error({ jobId, lockKey, error }, "Failed to release advisory lock");
    return false;
  }
}

/**
 * Check if an advisory lock is currently held (by any session)
 * 
 * Queries pg_locks to see if the lock is held
 * Useful for debugging and monitoring
 * 
 * @param jobId - The scheduler job ID to check
 * @returns true if lock is held by any session
 */
export async function isLockHeld(jobId: SchedulerLockId): Promise<boolean> {
  const lockKey = getLockKey(jobId);
  const pool = getPool();
  
  try {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM pg_locks 
       WHERE locktype = 'advisory' 
       AND classid = $1 
       AND objid = $2`,
      [SCHEDULER_LOCK_NAMESPACE, jobId]
    );
    
    return parseInt(result.rows[0]?.count ?? "0", 10) > 0;
  } catch (error) {
    logger.error({ jobId, lockKey, error }, "Failed to check advisory lock status");
    return false;
  }
}

/**
 * Execute a function with an advisory lock
 * Automatically acquires lock before execution and releases after
 * 
 * @param jobId - The scheduler job ID to lock
 * @param fn - Function to execute while holding the lock
 * @param options - Options for lock behavior
 * @returns Result of the function, or null if lock couldn't be acquired
 */
export async function withLock<T>(
  jobId: SchedulerLockId,
  fn: () => Promise<T>,
  options: { skipIfLocked?: boolean } = {}
): Promise<{ success: true; result: T } | { success: false; reason: "locked" | "error"; error?: Error }> {
  const { skipIfLocked = true } = options;
  
  // Try to acquire lock
  const acquired = await tryAcquireLock(jobId);
  
  if (!acquired) {
    if (skipIfLocked) {
      logger.info({ jobId }, "Job skipped - lock held by another worker");
      return { success: false, reason: "locked" };
    }
    // Could implement blocking wait here if needed
    return { success: false, reason: "locked" };
  }
  
  try {
    const result = await fn();
    return { success: true, result };
  } catch (error) {
    logger.error({ jobId, error }, "Error during locked execution");
    return { 
      success: false, 
      reason: "error", 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  } finally {
    // Always release the lock
    await releaseLock(jobId);
  }
}

/**
 * Get status of all scheduler locks
 * Useful for health checks and debugging
 */
export async function getAllLockStatuses(): Promise<Record<string, boolean>> {
  const statuses: Record<string, boolean> = {};
  
  for (const [name, id] of Object.entries(SchedulerLockIds)) {
    statuses[name] = await isLockHeld(id as SchedulerLockId);
  }
  
  return statuses;
}

