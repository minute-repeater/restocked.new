import { query, closePool } from "../../src/db/client.js";
import { ProductRepository } from "../../src/db/repositories/productRepository.js";
import type { DBProduct } from "../../src/db/types.js";

/**
 * Test ProductRepository
 * Requires DATABASE_URL environment variable
 * Clears products table before each test run
 */
async function testProductRepository() {
  console.log("🧪 Testing ProductRepository...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable not set");
    console.log("   Set it to your PostgreSQL connection string to run tests");
    process.exit(1);
  }

  const repo = new ProductRepository();

  try {
    // Clean up before tests
    await query("DELETE FROM products");

    // Test 1: Create product
    console.log("Test 1: Create product");
    const createData = {
      url: "https://example.com/product/123",
      canonical_url: "https://example.com/product/123",
      name: "Test Product",
      description: "A test product description",
      vendor: "Test Vendor",
      main_image_url: "https://example.com/image.jpg",
      metadata: { test: true },
    };
    const created = await repo.createProduct(createData);
    if (created && created.id && created.url === createData.url) {
      console.log("✅ Create product works correctly");
      console.log(`   Created product ID: ${created.id}`);
    } else {
      console.log("❌ Create product failed");
      console.log(`   Result: ${JSON.stringify(created)}`);
      return;
    }

    // Test 2: Get by ID
    console.log("\nTest 2: Get product by ID");
    const found = await repo.getProductById(created.id);
    if (found && found.id === created.id && found.name === createData.name) {
      console.log("✅ Get by ID works correctly");
    } else {
      console.log("❌ Get by ID failed");
      console.log(`   Result: ${JSON.stringify(found)}`);
      return;
    }

    // Test 3: Find by URL
    console.log("\nTest 3: Find product by URL");
    const foundByURL = await repo.findByURL(createData.url);
    if (foundByURL && foundByURL.id === created.id) {
      console.log("✅ Find by URL works correctly");
    } else {
      console.log("❌ Find by URL failed");
      console.log(`   Result: ${JSON.stringify(foundByURL)}`);
      return;
    }

    // Test 4: Update product
    console.log("\nTest 4: Update product");
    const updatePatch = {
      name: "Updated Product Name",
      description: "Updated description",
      vendor: "Updated Vendor",
    };
    const updated = await repo.updateProduct(created.id, updatePatch);
    if (
      updated &&
      updated.name === updatePatch.name &&
      updated.description === updatePatch.description &&
      updated.vendor === updatePatch.vendor
    ) {
      console.log("✅ Update product works correctly");
      console.log(`   Updated name: ${updated.name}`);
    } else {
      console.log("❌ Update product failed");
      console.log(`   Result: ${JSON.stringify(updated)}`);
      return;
    }

    // Test 5: Verify updated_at changed
    console.log("\nTest 5: Verify updated_at timestamp changed");
    const afterUpdate = await repo.getProductById(created.id);
    if (
      afterUpdate &&
      new Date(afterUpdate.updated_at).getTime() >
        new Date(created.updated_at).getTime()
    ) {
      console.log("✅ updated_at timestamp updated correctly");
    } else {
      console.log("❌ updated_at timestamp not updated");
      return;
    }

    // Test 6: Find non-existent product
    console.log("\nTest 6: Find non-existent product");
    const notFound = await repo.getProductById(99999);
    if (notFound === null) {
      console.log("✅ Non-existent product returns null correctly");
    } else {
      console.log("❌ Non-existent product should return null");
      return;
    }

    console.log("\n✅ All ProductRepository tests passed!");
  } catch (error: any) {
    console.error("\n❌ ProductRepository test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run tests if this file is executed directly
testProductRepository().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

