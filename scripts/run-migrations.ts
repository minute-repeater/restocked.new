#!/usr/bin/env node
/**
 * Run database migrations
 * Usage: npm run migrate
 * Or: NODE_OPTIONS='--loader ts-node/esm' node scripts/run-migrations.ts
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { query } from "../src/db/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get all migration files in order
 */
function getMigrationFiles(): string[] {
  const migrationsDir = join(__dirname, "../db/migrations");
  const files = [
    "001_init.sql",
    "002_update_users_auth.sql",
    "003_add_scheduler_and_admin.sql",
    "004_notifications_system.sql",
    "005_add_user_plans.sql",
  ];

  return files.map((file) => join(migrationsDir, file));
}

/**
 * Check if migration has been run
 */
async function isMigrationRun(migrationName: string): Promise<boolean> {
  try {
    const result = await query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [migrationName]
    );
    return result.rows.length > 0;
  } catch (error: any) {
    // If schema_migrations table doesn't exist, return false
    if (error.message.includes("does not exist")) {
      return false;
    }
    throw error;
  }
}

/**
 * Mark migration as run
 */
async function markMigrationRun(migrationName: string): Promise<void> {
  try {
    await query(
      "INSERT INTO schema_migrations (name, run_at) VALUES ($1, NOW()) ON CONFLICT (name) DO NOTHING",
      [migrationName]
    );
  } catch (error: any) {
    // If schema_migrations table doesn't exist, create it first
    if (error.message.includes("does not exist")) {
      await query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name VARCHAR(255) PRIMARY KEY,
          run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await query(
        "INSERT INTO schema_migrations (name, run_at) VALUES ($1, NOW())",
        [migrationName]
      );
    } else {
      throw error;
    }
  }
}

/**
 * Run a single migration file
 */
async function runMigration(filePath: string): Promise<void> {
  const fileName = filePath.split("/").pop() || "";
  const migrationName = fileName.replace(".sql", "");

  console.log(`[Migration] Checking ${migrationName}...`);

  // Check if already run
  if (await isMigrationRun(migrationName)) {
    console.log(`[Migration] ✓ ${migrationName} already run, skipping`);
    return;
  }

  console.log(`[Migration] Running ${migrationName}...`);

  try {
    const sql = readFileSync(filePath, "utf-8");

    // Execute migration in a transaction
    await query("BEGIN");
    try {
      // Split by semicolons and execute each statement
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        if (statement.trim()) {
          await query(statement);
        }
      }

      await markMigrationRun(migrationName);
      await query("COMMIT");

      console.log(`[Migration] ✓ ${migrationName} completed successfully`);
    } catch (error: any) {
      await query("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error(`[Migration] ✗ ${migrationName} failed:`, error.message);
    throw error;
  }
}

/**
 * Ensure schema_migrations table exists
 */
async function ensureSchemaMigrationsTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } catch (error: any) {
    // Table might already exist, that's fine
    if (!error.message.includes("already exists")) {
      throw error;
    }
  }
}

/**
 * Run all migrations
 */
async function runMigrations(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Database Migrations");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // Test database connection
    await query("SELECT 1");
    console.log("[Migration] Database connection successful\n");

    // Ensure schema_migrations table exists
    await ensureSchemaMigrationsTable();

    const migrationFiles = getMigrationFiles();

    for (const file of migrationFiles) {
      await runMigration(file);
    }

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("✓ All migrations completed successfully");
    console.log("═══════════════════════════════════════════════════════════════");
  } catch (error: any) {
    console.error("\n═══════════════════════════════════════════════════════════════");
    console.error("✗ Migration failed:", error.message);
    console.error("═══════════════════════════════════════════════════════════════");
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

