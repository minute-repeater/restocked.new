#!/usr/bin/env node
/**
 * Seed a production test user
 * Usage: npm run seed:prod-user
 * Or: NODE_OPTIONS='--loader ts-node/esm' node scripts/seed-prod-user.ts
 * 
 * Environment variables:
 * - SEED_USER_EMAIL (default: admin@restocked.now)
 * - SEED_USER_PASSWORD (default: ChangeMe123!)
 * - SEED_USER_PLAN (default: pro)
 */

import "dotenv/config";
import bcrypt from "bcrypt";
import { query } from "../src/db/client.js";

const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL || "admin@restocked.now";
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || "ChangeMe123!";
const SEED_USER_PLAN = (process.env.SEED_USER_PLAN || "pro") as "free" | "pro";

async function seedProdUser() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Seeding Production Test User");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // Test database connection
    await query("SELECT 1");
    console.log("[Seed] Database connection successful\n");

    // Check if user already exists
    const existingUser = await query(
      "SELECT id, email, role FROM users WHERE email = $1",
      [SEED_USER_EMAIL]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`[Seed] User ${SEED_USER_EMAIL} already exists`);
      console.log(`[Seed]   ID: ${user.id}`);
      console.log(`[Seed]   Role: ${user.role}`);
      console.log(`[Seed]   Plan: ${(user as any).plan || "unknown"}\n`);

      // Update password and plan
      const hashedPassword = await bcrypt.hash(SEED_USER_PASSWORD, 10);
      await query(
        "UPDATE users SET password_hash = $1, plan = $2, role = 'admin' WHERE email = $3",
        [hashedPassword, SEED_USER_PLAN, SEED_USER_EMAIL]
      );

      console.log(`[Seed] ✓ Updated user password and plan to ${SEED_USER_PLAN}`);
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(SEED_USER_PASSWORD, 10);
      const result = await query(
        `INSERT INTO users (email, password_hash, plan, role, created_at, updated_at)
         VALUES ($1, $2, $3, 'admin', NOW(), NOW())
         RETURNING id, email, plan, role`,
        [SEED_USER_EMAIL, hashedPassword, SEED_USER_PLAN]
      );

      const user = result.rows[0];
      console.log(`[Seed] ✓ Created user:`);
      console.log(`[Seed]   ID: ${user.id}`);
      console.log(`[Seed]   Email: ${user.email}`);
      console.log(`[Seed]   Plan: ${user.plan}`);
      console.log(`[Seed]   Role: ${user.role}`);
    }

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("✓ Production user seeded successfully");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`\nLogin credentials:`);
    console.log(`  Email: ${SEED_USER_EMAIL}`);
    console.log(`  Password: ${SEED_USER_PASSWORD}`);
    console.log(`  Plan: ${SEED_USER_PLAN}`);
    console.log(`  Role: admin\n`);
  } catch (error: any) {
    console.error("\n═══════════════════════════════════════════════════════════════");
    console.error("✗ Seed failed:", error.message);
    console.error("═══════════════════════════════════════════════════════════════");
    process.exit(1);
  }
}

// Run seed
seedProdUser().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

