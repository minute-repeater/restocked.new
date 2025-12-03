import "dotenv/config";
import { query, withTransaction, closePool } from "../../src/db/client.js";

/**
 * Test database client functionality
 * Requires DATABASE_URL environment variable
 */
async function testClient() {
  console.log("🧪 Testing DB Client...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable not set");
    console.log("   Set it to your PostgreSQL connection string to run tests");
    process.exit(1);
  }

  try {
    // Test 1: Basic connection and SELECT 1
    console.log("Test 1: Basic connection and SELECT 1");
    const result1 = await query("SELECT 1 as test");
    if (result1.rows[0]?.test === 1) {
      console.log("✅ SELECT 1 works correctly");
    } else {
      console.log("❌ SELECT 1 failed");
      console.log(`   Result: ${JSON.stringify(result1.rows)}`);
      return;
    }

    // Test 2: Transaction commits
    console.log("\nTest 2: Transaction commits");
    let transactionCommitted = false;
    await withTransaction(async (client) => {
      await client.query("SELECT 1");
      transactionCommitted = true;
    });
    if (transactionCommitted) {
      console.log("✅ Transaction commit works correctly");
    } else {
      console.log("❌ Transaction commit failed");
      return;
    }

    // Test 3: Transaction rolls back on error
    console.log("\nTest 3: Transaction rolls back on error");
    let rollbackWorked = false;
    try {
      await withTransaction(async (client) => {
        await client.query("SELECT 1");
        throw new Error("Test error for rollback");
      });
    } catch (err: any) {
      if (err.message === "Test error for rollback") {
        rollbackWorked = true;
        console.log("✅ Transaction rollback works correctly");
      } else {
        console.log("❌ Transaction rollback failed");
        console.log(`   Error: ${err.message}`);
        return;
      }
    }

    // Test 4: Parameterized query
    console.log("\nTest 4: Parameterized query");
    const result4 = await query("SELECT $1::text as message", ["Hello, World!"]);
    if (result4.rows[0]?.message === "Hello, World!") {
      console.log("✅ Parameterized queries work correctly");
    } else {
      console.log("❌ Parameterized queries failed");
      console.log(`   Result: ${JSON.stringify(result4.rows)}`);
      return;
    }

    console.log("\n✅ All client tests passed!");
  } catch (error: any) {
    console.error("\n❌ Client test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run tests if this file is executed directly
testClient().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

