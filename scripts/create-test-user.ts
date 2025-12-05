#!/usr/bin/env node
/**
 * Create a test user for development/testing
 * Usage: railway run npm run create-test-user
 */

import "dotenv/config";
import { query } from "../src/db/client.js";
import bcrypt from "bcrypt";

async function createTestUser() {
  const email = process.env.TEST_EMAIL || "test@example.com";
  const password = process.env.TEST_PASSWORD || "TestPassword123!";
  
  console.log("Creating test user...");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}\n`);

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await query(
      `INSERT INTO users (email, hashed_password, plan) 
       VALUES ($1, $2, 'free') 
       ON CONFLICT (email) DO UPDATE 
       SET hashed_password = $2, updated_at = NOW()
       RETURNING id, email, plan, created_at`,
      [email.toLowerCase(), hashedPassword]
    );
    
    const user = result.rows[0];
    
    console.log("✅ Test user created/updated successfully!");
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Plan: ${user.plan}`);
    console.log(`   Created: ${user.created_at}`);
    console.log("\nYou can now login with these credentials.");
  } catch (error: any) {
    console.error("❌ Error creating test user:", error.message);
    process.exit(1);
  }
}

createTestUser();



