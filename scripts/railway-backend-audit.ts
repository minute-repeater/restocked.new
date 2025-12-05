#!/usr/bin/env node
/**
 * Railway Backend Audit Script
 * 
 * This script performs a comprehensive audit of the Railway backend deployment:
 * 1. Checks migration execution in logs
 * 2. Tests health endpoint
 * 3. Verifies database tables exist
 * 4. Tests all core endpoints
 * 5. Generates audit summary
 */

import "dotenv/config";
import { execSync } from "child_process";
import { query } from "../src/db/client.js";

interface AuditResult {
  step: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: any;
}

interface HealthCheckResponse {
  status: string;
  database?: string;
  environment?: string;
  version?: string;
  schedulers?: any;
}

const results: AuditResult[] = [];

/**
 * Log result
 */
function logResult(step: string, status: "pass" | "fail" | "warning", message: string, details?: any) {
  results.push({ step, status, message, details });
  const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️";
  console.log(`${icon} ${step}: ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

/**
 * Get Railway backend URL from environment or Railway CLI
 */
async function getBackendUrl(): Promise<string | null> {
  // Try environment variable first
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }

  // Try Railway CLI
  try {
    const domain = execSync("railway domain", { encoding: "utf-8", stdio: "pipe" }).trim();
    if (domain) {
      return domain.startsWith("http") ? domain : `https://${domain}`;
    }
  } catch (error) {
    // Railway CLI not available or not linked
  }

  return null;
}

/**
 * Check Railway logs for migration messages
 */
async function checkMigrationLogs(): Promise<void> {
  console.log("\n📋 Step 1: Checking Railway logs for migration execution...\n");

  try {
    // Try to get logs via Railway CLI
    try {
      const logs = execSync("railway logs --tail 200", { encoding: "utf-8", stdio: "pipe" });
      
      const migrationStart = logs.includes("[Startup] Running database migrations...");
      const dbConnection = logs.includes("[Migration] Database connection successful");
      const migration001 = logs.includes("✓ 001_init completed successfully");
      const migration002 = logs.includes("✓ 002_update_users_auth completed successfully");
      const migration003 = logs.includes("✓ 003_add_scheduler_and_admin completed successfully");
      const migration004 = logs.includes("✓ 004_notifications_system completed successfully");
      const migration005 = logs.includes("✓ 005_add_user_plans completed successfully");
      const migrationComplete = logs.includes("[Startup] ✓ Migrations completed successfully");
      const serverRunning = logs.includes("Server running on port");

      if (migrationStart && dbConnection && migrationComplete && serverRunning) {
        logResult(
          "Migration Logs",
          "pass",
          "All migration steps found in logs",
          {
            migrationStart,
            dbConnection,
            migration001,
            migration002,
            migration003,
            migration004,
            migration005,
            migrationComplete,
            serverRunning,
          }
        );
      } else {
        logResult(
          "Migration Logs",
          "warning",
          "Some migration steps missing from logs",
          {
            migrationStart,
            dbConnection,
            migration001,
            migration002,
            migration003,
            migration004,
            migration005,
            migrationComplete,
            serverRunning,
          }
        );
      }
    } catch (error: any) {
      logResult(
        "Migration Logs",
        "warning",
        "Could not fetch Railway logs (Railway CLI may not be available)",
        { error: error.message }
      );
    }
  } catch (error: any) {
    logResult("Migration Logs", "fail", "Failed to check logs", { error: error.message });
  }
}

/**
 * Test health endpoint
 */
async function testHealthEndpoint(): Promise<void> {
  console.log("\n🏥 Step 2: Testing health endpoint...\n");

  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    logResult(
      "Health Endpoint",
      "fail",
      "BACKEND_URL not found. Set BACKEND_URL environment variable or use Railway CLI",
    );
    return;
  }

  try {
    const response = await fetch(`${backendUrl}/health`);
    const data: HealthCheckResponse = await response.json();

    if (response.ok && data.status === "ok" && data.database === "connected") {
      logResult(
        "Health Endpoint",
        "pass",
        "Health check passed",
        {
          status: data.status,
          database: data.database,
          environment: data.environment,
          version: data.version,
          schedulers: data.schedulers,
        }
      );
    } else {
      logResult(
        "Health Endpoint",
        "fail",
        "Health check failed or returned unexpected response",
        {
          statusCode: response.status,
          response: data,
        }
      );
    }
  } catch (error: any) {
    logResult(
      "Health Endpoint",
      "fail",
      "Failed to reach health endpoint",
      {
        url: `${backendUrl}/health`,
        error: error.message,
      }
    );
  }
}

/**
 * Check database tables
 */
async function checkDatabaseTables(): Promise<void> {
  console.log("\n🗄️  Step 3: Checking database tables...\n");

  const requiredTables = [
    "schema_migrations",
    "users",
    "products",
    "variants",
    "tracked_items",
    "notifications",
    "check_runs",
    "variant_price_history",
    "variant_stock_history",
  ];

  const existingTables: string[] = [];
  const missingTables: string[] = [];

  try {
    // Get all tables
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const allTables = result.rows.map((row) => row.table_name);

    // Check each required table
    for (const table of requiredTables) {
      if (allTables.includes(table)) {
        existingTables.push(table);
      } else {
        missingTables.push(table);
      }
    }

    // Check schema_migrations for completed migrations
    let completedMigrations: string[] = [];
    if (existingTables.includes("schema_migrations")) {
      try {
        const migrationResult = await query("SELECT name FROM schema_migrations ORDER BY name");
        completedMigrations = migrationResult.rows.map((row) => row.name);
      } catch (error) {
        // Table exists but query failed
      }
    }

    if (missingTables.length === 0) {
      logResult(
        "Database Tables",
        "pass",
        `All ${requiredTables.length} required tables exist`,
        {
          existingTables,
          completedMigrations,
        }
      );
    } else {
      logResult(
        "Database Tables",
        "fail",
        `Missing ${missingTables.length} required table(s)`,
        {
          existingTables,
          missingTables,
          completedMigrations,
        }
      );
    }
  } catch (error: any) {
    logResult(
      "Database Tables",
      "fail",
      "Failed to check database tables",
      { error: error.message }
    );
  }
}

/**
 * Test core endpoints
 */
async function testEndpoints(): Promise<void> {
  console.log("\n🔌 Step 4: Testing core endpoints...\n");

  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    logResult("Endpoints", "fail", "BACKEND_URL not available for endpoint testing");
    return;
  }

  const endpointTests = [
    {
      name: "GET /health",
      method: "GET",
      path: "/health",
      expectedStatus: 200,
    },
    {
      name: "POST /auth/register",
      method: "POST",
      path: "/auth/register",
      body: {
        email: `test-${Date.now()}@example.com`,
        password: "TestPassword123!",
      },
      expectedStatus: 201,
    },
    {
      name: "POST /products",
      method: "POST",
      path: "/products",
      body: {
        url: "https://example.com/product",
      },
      expectedStatus: [200, 201],
    },
    {
      name: "GET /notifications (requires auth)",
      method: "GET",
      path: "/me/notifications",
      requiresAuth: true,
      expectedStatus: [200, 401],
    },
    {
      name: "GET /tracked-items (requires auth)",
      method: "GET",
      path: "/me/tracked-items",
      requiresAuth: true,
      expectedStatus: [200, 401],
    },
  ];

  for (const test of endpointTests) {
    try {
      const options: RequestInit = {
        method: test.method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      if (test.requiresAuth) {
        // Test without auth - should return 401
        const response = await fetch(`${backendUrl}${test.path}`, options);
        const status = response.status;
        const expectedStatuses = Array.isArray(test.expectedStatus)
          ? test.expectedStatus
          : [test.expectedStatus];

        if (expectedStatuses.includes(status)) {
          logResult(
            test.name,
            "pass",
            `Endpoint responded with expected status ${status}`,
            { status, requiresAuth: true }
          );
        } else {
          logResult(
            test.name,
            "warning",
            `Endpoint returned unexpected status ${status}`,
            { status, expected: expectedStatuses }
          );
        }
      } else {
        const response = await fetch(`${backendUrl}${test.path}`, options);
        const status = response.status;
        const expectedStatuses = Array.isArray(test.expectedStatus)
          ? test.expectedStatus
          : [test.expectedStatus];

        let responseData: any;
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }

        if (expectedStatuses.includes(status)) {
          logResult(
            test.name,
            "pass",
            `Endpoint responded with expected status ${status}`,
            { status, response: responseData }
          );
        } else {
          logResult(
            test.name,
            "fail",
            `Endpoint returned unexpected status ${status}`,
            { status, expected: expectedStatuses, response: responseData }
          );
        }
      }
    } catch (error: any) {
      logResult(
        test.name,
        "fail",
        "Failed to reach endpoint",
        { error: error.message }
      );
    }
  }
}

/**
 * Check CORS configuration
 */
async function checkCORS(): Promise<void> {
  console.log("\n🌐 Step 5: Checking CORS configuration...\n");

  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    logResult("CORS", "warning", "BACKEND_URL not available for CORS testing");
    return;
  }

  try {
    // Test OPTIONS request (preflight)
    const response = await fetch(`${backendUrl}/health`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://app.restocked.now",
        "Access-Control-Request-Method": "GET",
      },
    });

    const corsHeaders = {
      "access-control-allow-origin": response.headers.get("access-control-allow-origin"),
      "access-control-allow-methods": response.headers.get("access-control-allow-methods"),
      "access-control-allow-headers": response.headers.get("access-control-allow-headers"),
    };

    if (corsHeaders["access-control-allow-origin"]) {
      logResult("CORS", "pass", "CORS headers present", corsHeaders);
    } else {
      logResult("CORS", "warning", "CORS headers not found (may be configured differently)", corsHeaders);
    }
  } catch (error: any) {
    logResult("CORS", "warning", "Could not test CORS", { error: error.message });
  }
}

/**
 * Generate summary report
 */
function generateSummary(): void {
  console.log("\n" + "=".repeat(80));
  console.log("📊 RAILWAY BACKEND AUDIT SUMMARY");
  console.log("=".repeat(80) + "\n");

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const warnings = results.filter((r) => r.status === "warning").length;

  console.log(`Total Checks: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}\n`);

  console.log("\nDetailed Results:\n");
  results.forEach((result, index) => {
    const icon = result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⚠️";
    console.log(`${index + 1}. ${icon} ${result.step}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log();
  });

  // Critical issues
  const criticalIssues = results.filter((r) => r.status === "fail");
  if (criticalIssues.length > 0) {
    console.log("\n🚨 CRITICAL ISSUES REQUIRING ATTENTION:\n");
    criticalIssues.forEach((issue) => {
      console.log(`- ${issue.step}: ${issue.message}`);
    });
  }

  // Recommendations
  console.log("\n📋 RECOMMENDATIONS:\n");
  if (failed > 0) {
    console.log("1. Review failed checks above and fix issues");
    console.log("2. Re-deploy backend after fixes");
    console.log("3. Re-run this audit to verify fixes");
  } else if (warnings > 0) {
    console.log("1. Review warnings and address if needed");
    console.log("2. Monitor backend logs for any issues");
  } else {
    console.log("✅ All checks passed! Backend is healthy.");
  }

  console.log("\n" + "=".repeat(80));
}

/**
 * Main audit function
 */
async function main(): Promise<void> {
  console.log("🚀 Starting Railway Backend Audit...\n");

  // Check database connection first
  try {
    await query("SELECT 1");
    console.log("✅ Database connection successful\n");
  } catch (error: any) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Make sure DATABASE_URL is set correctly\n");
    process.exit(1);
  }

  // Run all audit steps
  await checkMigrationLogs();
  await testHealthEndpoint();
  await checkDatabaseTables();
  await testEndpoints();
  await checkCORS();

  // Generate summary
  generateSummary();

  // Exit with appropriate code
  const hasFailures = results.some((r) => r.status === "fail");
  process.exit(hasFailures ? 1 : 0);
}

// Run audit
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});



