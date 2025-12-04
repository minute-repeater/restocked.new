#!/usr/bin/env node
/**
 * Verify database migrations and tables
 * Usage: npm run verify-migrations
 * Or: NODE_OPTIONS='--loader ts-node/esm' node scripts/verify-migrations.ts
 */

import "dotenv/config";
import { query } from "../src/db/client.js";

/**
 * Verify all required tables exist
 */
async function verifyTables(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Database Tables Verification");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const requiredTables = [
    "users",
    "products",
    "variants",
    "notifications",
    "checks", // check_runs table
    "tracked_items",
    "user_notification_settings",
    "scheduler_logs",
    "schema_migrations",
  ];

  const results: { table: string; exists: boolean; rowCount?: number }[] = [];

  for (const tableName of requiredTables) {
    try {
      // Check if table exists
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );

      const exists = tableCheck.rows[0].exists;

      if (exists) {
        // Get row count
        const countResult = await query(`SELECT COUNT(*) FROM ${tableName}`);
        const rowCount = parseInt(countResult.rows[0].count);
        results.push({ table: tableName, exists: true, rowCount });
        console.log(`✅ ${tableName.padEnd(30)} exists (${rowCount} rows)`);
      } else {
        results.push({ table: tableName, exists: false });
        console.log(`❌ ${tableName.padEnd(30)} MISSING`);
      }
    } catch (error: any) {
      results.push({ table: tableName, exists: false });
      console.log(`❌ ${tableName.padEnd(30)} ERROR: ${error.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  
  const missingTables = results.filter((r) => !r.exists);
  if (missingTables.length > 0) {
    console.log(`⚠️  ${missingTables.length} table(s) missing:`);
    missingTables.forEach((r) => console.log(`   - ${r.table}`));
    console.log("\nRun migrations: npm run migrate");
  } else {
    console.log("✅ All required tables exist");
  }

  // Verify schema_migrations table
  try {
    const migrationsResult = await query("SELECT COUNT(*) FROM schema_migrations");
    const migrationCount = parseInt(migrationsResult.rows[0].count);
    console.log(`\n📋 Migrations applied: ${migrationCount}`);

    if (migrationCount > 0) {
      const migrationsList = await query("SELECT name, run_at FROM schema_migrations ORDER BY run_at");
      console.log("\nApplied migrations:");
      migrationsList.rows.forEach((m: any) => {
        console.log(`   ✓ ${m.name} (${new Date(m.run_at).toISOString()})`);
      });
    }
  } catch (error: any) {
    console.log(`\n⚠️  Could not check schema_migrations: ${error.message}`);
  }

  console.log("═══════════════════════════════════════════════════════════════");
}

/**
 * Main verification function
 */
async function verifyDatabase(): Promise<void> {
  try {
    // Test database connection
    await query("SELECT 1");
    console.log("[Verification] Database connection successful\n");

    await verifyTables();
  } catch (error: any) {
    console.error("\n═══════════════════════════════════════════════════════════════");
    console.error("✗ Verification failed:", error.message);
    console.error("═══════════════════════════════════════════════════════════════");
    process.exit(1);
  }
}

// Run verification
verifyDatabase().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

