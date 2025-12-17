#!/usr/bin/env node
/**
 * Run migrations and start server
 * This script runs migrations first, then starts the Express server
 * Used by Railway deployment to ensure migrations run automatically
 */

import "dotenv/config";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run migrations
 */
async function runMigrations(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("[Startup] Running database migrations...\n");
    
    const migrateScript = join(__dirname, "migrate.js");
    const migrateProcess = spawn("node", [migrateScript], {
      stdio: "inherit",
      env: process.env,
    });

    migrateProcess.on("close", (code) => {
      if (code === 0) {
        console.log("\n[Startup] ✓ Migrations completed successfully\n");
        resolve();
      } else {
        console.error(`\n[Startup] ✗ Migrations failed with code ${code}`);
        reject(new Error(`Migration process exited with code ${code}`));
      }
    });

    migrateProcess.on("error", (error) => {
      console.error("[Startup] ✗ Failed to start migration process:", error);
      reject(error);
    });
  });
}

/**
 * Start the Express server
 */
function startServer(): void {
  console.log("[Startup] Starting Express server...\n");
  
  const serverScript = join(__dirname, "../api/server.js");
  const serverProcess = spawn("node", [serverScript], {
    stdio: "inherit",
    env: process.env,
  });

  serverProcess.on("close", (code) => {
    console.error(`[Server] Process exited with code ${code}`);
    process.exit(code || 0);
  });

  serverProcess.on("error", (error) => {
    console.error("[Server] Failed to start server:", error);
    process.exit(1);
  });

  // Handle termination signals
  process.on("SIGTERM", () => {
    console.log("[Server] Received SIGTERM, shutting down gracefully...");
    serverProcess.kill("SIGTERM");
  });

  process.on("SIGINT", () => {
    console.log("[Server] Received SIGINT, shutting down gracefully...");
    serverProcess.kill("SIGINT");
  });
}

/**
 * Main startup function
 */
async function main(): Promise<void> {
  try {
    // Run migrations first
    await runMigrations();
    
    // Then start the server
    startServer();
  } catch (error: any) {
    console.error("[Startup] Fatal error:", error.message);
    process.exit(1);
  }
}

// Run migrations and start server
main();







