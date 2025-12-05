#!/usr/bin/env node
/**
 * Quick script to check database tables
 */

import "dotenv/config";
import { query } from "../src/db/client.js";

async function main() {
  try {
    // Check if schema_migrations exists
    const migrationsResult = await query(`
      SELECT name FROM schema_migrations ORDER BY name
    `);
    console.log("\n✅ Completed Migrations:");
    migrationsResult.rows.forEach((row) => {
      console.log(`  - ${row.name}`);
    });

    // Get all tables
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log("\n✅ Existing Tables:");
    tablesResult.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    const requiredTables = [
      "schema_migrations",
      "users",
      "products",
      "variants",
      "tracked_items",
      "notifications",
      "check_runs",
    ];

    const existingTables = tablesResult.rows.map((r) => r.table_name);
    const missingTables = requiredTables.filter((t) => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log("\n❌ Missing Tables:");
      missingTables.forEach((table) => {
        console.log(`  - ${table}`);
      });
    } else {
      console.log("\n✅ All required tables exist!");
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.message.includes("does not exist")) {
      console.error("\n⚠️  Database tables may not be initialized. Migrations need to run.");
    }
    process.exit(1);
  }
}

main();



