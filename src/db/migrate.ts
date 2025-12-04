#!/usr/bin/env node
/**
 * Run database migrations
 * Usage: node dist/db/migrate.js
 * 
 * This script uses DATABASE_URL from process.env (set by Railway automatically)
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { query } from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get all migration files in order
 */
function getMigrationFiles(): string[] {
  // Migration files are in db/migrations relative to project root
  // When compiled, this file is in dist/db/, so we go up two levels
  const migrationsDir = join(__dirname, "../../db/migrations");
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
      // Better SQL parsing: handle multi-line statements, comments, and dollar-quoted strings
      // Remove block comments first (but preserve dollar-quoted strings)
      let cleanedSql = sql.replace(/\/\*[\s\S]*?\*\//g, "");
      
      // Parse SQL statements, handling dollar-quoted strings properly
      // Dollar-quoted strings use $tag$ syntax where tag can be empty ($$)
      const statements: string[] = [];
      let currentStatement = "";
      let inDollarQuote = false;
      let dollarQuoteTag = "";
      
      // Process character by character to properly handle dollar quotes
      for (let i = 0; i < cleanedSql.length; i++) {
        const char = cleanedSql[i];
        const nextChar = cleanedSql[i + 1];
        
        // Check for start of dollar-quoted string ($tag$)
        if (char === '$' && !inDollarQuote) {
          // Find the closing $ for the tag
          let tagEnd = cleanedSql.indexOf('$', i + 1);
          if (tagEnd !== -1) {
            dollarQuoteTag = cleanedSql.substring(i, tagEnd + 1);
            inDollarQuote = true;
            currentStatement += dollarQuoteTag;
            i = tagEnd; // Skip past the opening tag
            continue;
          }
        }
        
        // Check for end of dollar-quoted string
        if (inDollarQuote && char === '$') {
          // Check if this matches our opening tag
          if (cleanedSql.substring(i, i + dollarQuoteTag.length) === dollarQuoteTag) {
            currentStatement += dollarQuoteTag;
            i += dollarQuoteTag.length - 1; // Skip past the closing tag
            inDollarQuote = false;
            dollarQuoteTag = "";
            continue;
          }
        }
        
        // If we're in a dollar-quoted string, add character as-is
        if (inDollarQuote) {
          currentStatement += char;
          continue;
        }
        
        // Handle inline comments (-- to end of line) but only outside dollar quotes
        if (char === '-' && nextChar === '-') {
          // Skip to end of line
          const lineEnd = cleanedSql.indexOf('\n', i);
          if (lineEnd !== -1) {
            i = lineEnd;
            // Add newline if statement has content
            if (currentStatement.trim().length > 0) {
              currentStatement += '\n';
            }
            continue;
          } else {
            // End of file, break
            break;
          }
        }
        
        currentStatement += char;
        
        // Check for statement end (semicolon outside dollar quotes)
        if (char === ';' && !inDollarQuote) {
          const statement = currentStatement.trim();
          if (statement.length > 0 && statement !== ";") {
            statements.push(statement);
          }
          currentStatement = "";
        }
      }
      
      // Add any remaining statement
      if (currentStatement.trim().length > 0) {
        const statement = currentStatement.trim();
        if (!statement.endsWith(";")) {
          statements.push(statement + ";");
        } else {
          statements.push(statement);
        }
      }

      // Execute each statement sequentially with better error reporting
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (statement.length === 0 || statement === ";") {
          continue;
        }

        try {
          // Log first few characters of statement for debugging
          const preview = statement.substring(0, 50).replace(/\s+/g, " ");
          console.log(`[Migration] Executing statement ${i + 1}/${statements.length}: ${preview}...`);
          
          await query(statement);
        } catch (error: any) {
          console.error(`[Migration] Error executing statement ${i + 1}/${statements.length}:`);
          console.error(`[Migration] Statement: ${statement.substring(0, 200)}...`);
          console.error(`[Migration] Error: ${error.message}`);
          throw error;
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
    if (error.stack) {
      console.error(`[Migration] Stack trace:`, error.stack);
    }
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

  // Verify DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL environment variable is not set");
    console.error("  Railway should set this automatically. Check your Railway service variables.");
    process.exit(1);
  }

  console.log(`[Migration] Using DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

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

