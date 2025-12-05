#!/usr/bin/env node
/**
 * Backend Verification Script
 * Verifies backend health, migrations, and system info
 */

import "dotenv/config";
import { query } from "../src/db/client.js";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Backend Verification");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // 4. Check migrations
    console.log("4. Checking completed migrations...\n");
    try {
      const migrationsResult = await query(`
        SELECT COUNT(*) as count, 
               STRING_AGG(name, ', ' ORDER BY name) as migrations
        FROM schema_migrations
      `);
      
      const count = parseInt(migrationsResult.rows[0].count);
      const migrations = migrationsResult.rows[0].migrations;
      
      console.log(`   ✅ Completed Migrations: ${count}`);
      if (migrations) {
        console.log(`   Migrations: ${migrations}`);
      }
      
      if (count === 0) {
        console.log("   ⚠️  WARNING: No migrations found in schema_migrations table");
      } else if (count < 5) {
        console.log(`   ⚠️  WARNING: Expected 5 migrations, found ${count}`);
      } else {
        console.log("   ✅ All expected migrations completed");
      }
    } catch (error: any) {
      if (error.message.includes("does not exist")) {
        console.log("   ❌ ERROR: schema_migrations table does not exist");
        console.log("   Migrations have not been run successfully");
      } else {
        console.log(`   ❌ ERROR: ${error.message}`);
      }
    }

    console.log("\n5. System Information:\n");
    
    // Node version
    const nodeVersion = process.version;
    console.log(`   Node.js Version: ${nodeVersion}`);

    // PostgreSQL version
    try {
      const pgVersionResult = await query("SELECT version()");
      const pgVersion = pgVersionResult.rows[0].version;
      console.log(`   PostgreSQL Version: ${pgVersion.split(' ')[0]} ${pgVersion.split(' ')[1]}`);
    } catch (error: any) {
      console.log(`   PostgreSQL Version: Unable to query (${error.message})`);
    }

    // Environment variables (masked)
    console.log("\n   Environment Variables (masked):");
    const envVars = [
      "APP_ENV",
      "NODE_ENV",
      "PORT",
      "DATABASE_URL",
      "JWT_SECRET",
      "FRONTEND_URL",
      "BACKEND_URL",
      "ENABLE_SCHEDULER",
      "ENABLE_CHECK_SCHEDULER",
      "ENABLE_EMAIL_SCHEDULER",
      "RESEND_API_KEY",
    ];

    for (const varName of envVars) {
      const value = process.env[varName];
      if (value) {
        if (varName === "DATABASE_URL") {
          // Mask database URL: postgresql://user:pass@host:port/db
          const masked = value.replace(/:([^:@]+)@/, ':****@');
          console.log(`   ${varName}=${masked}`);
        } else if (varName === "JWT_SECRET" || varName === "RESEND_API_KEY") {
          // Mask secrets
          const masked = value.substring(0, 8) + "****" + value.substring(value.length - 4);
          console.log(`   ${varName}=${masked}`);
        } else {
          console.log(`   ${varName}=${value}`);
        }
      } else {
        console.log(`   ${varName}=<not set>`);
      }
    }

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("✅ Verification Complete");
    console.log("═══════════════════════════════════════════════════════════════\n");
  } catch (error: any) {
    console.error("\n❌ Verification Failed:", error.message);
    process.exit(1);
  }
}

main();



