#!/usr/bin/env node
/**
 * Verify Railway database migrations
 * Run this on Railway: railway run node dist/scripts/verify-railway-db.js
 */

import "dotenv/config";
import { query } from "../src/db/client.js";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Railway Database Migration Verification");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // Check migrations
    const migrationsResult = await query(`
      SELECT COUNT(*) as count, 
             STRING_AGG(name, ', ' ORDER BY name) as migrations
      FROM schema_migrations
    `);
    
    const count = parseInt(migrationsResult.rows[0].count);
    const migrations = migrationsResult.rows[0].migrations;
    
    console.log(`✅ Completed Migrations: ${count}`);
    if (migrations) {
      console.log(`   Migrations: ${migrations}`);
    }
    
    // Get PostgreSQL version
    const pgVersionResult = await query("SELECT version()");
    const pgVersion = pgVersionResult.rows[0].version;
    console.log(`\n✅ PostgreSQL Version: ${pgVersion.split(' ')[0]} ${pgVersion.split(' ')[1]}`);

    // Get Node version
    console.log(`✅ Node.js Version: ${process.version}`);

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("✅ Verification Complete");
    console.log("═══════════════════════════════════════════════════════════════\n");
  } catch (error: any) {
    console.error("\n❌ Verification Failed:", error.message);
    process.exit(1);
  }
}

main();



