import { query, closePool } from "../../src/db/client.js";
import { ProductRepository } from "../../src/db/repositories/productRepository.js";
import { VariantRepository } from "../../src/db/repositories/variantRepository.js";
import type { DBVariant } from "../../src/db/types.js";

/**
 * Test VariantRepository
 * Requires DATABASE_URL environment variable
 * Clears tables before each test run
 */
async function testVariantRepository() {
  console.log("🧪 Testing VariantRepository...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable not set");
    console.log("   Set it to your PostgreSQL connection string to run tests");
    process.exit(1);
  }

  const productRepo = new ProductRepository();
  const variantRepo = new VariantRepository();

  try {
    // Clean up before tests
    await query("DELETE FROM variants");
    await query("DELETE FROM products");

    // Create a test product first
    const testProduct = await productRepo.createProduct({
      url: "https://example.com/product/test",
      name: "Test Product for Variants",
    });

    // Test 1: Create variant
    console.log("Test 1: Create variant");
    const createData = {
      product_id: testProduct.id,
      sku: "TEST-SKU-001",
      attributes: { size: "M", color: "Blue" },
      currency: "USD",
      current_price: 29.99,
      current_stock_status: "in_stock",
      is_available: true,
      metadata: { source: "test" },
    };
    const created = await variantRepo.createVariant(createData);
    if (
      created &&
      created.id &&
      created.product_id === testProduct.id &&
      created.sku === createData.sku
    ) {
      console.log("✅ Create variant works correctly");
      console.log(`   Created variant ID: ${created.id}`);
    } else {
      console.log("❌ Create variant failed");
      console.log(`   Result: ${JSON.stringify(created)}`);
      return;
    }

    // Test 2: Get variant by ID
    console.log("\nTest 2: Get variant by ID");
    const found = await variantRepo.getVariantById(created.id);
    if (found && found.id === created.id && found.sku === createData.sku) {
      console.log("✅ Get by ID works correctly");
    } else {
      console.log("❌ Get by ID failed");
      console.log(`   Result: ${JSON.stringify(found)}`);
      return;
    }

    // Test 3: Find variants by product
    console.log("\nTest 3: Find variants by product");
    const variants = await variantRepo.findByProduct(testProduct.id);
    if (variants.length === 1 && variants[0].id === created.id) {
      console.log("✅ Find by product works correctly");
    } else {
      console.log("❌ Find by product failed");
      console.log(`   Result: ${JSON.stringify(variants)}`);
      return;
    }

    // Test 4: Exact attribute match
    console.log("\nTest 4: Exact attribute match");
    const matchingVariant = await variantRepo.findMatchingVariant(
      testProduct.id,
      { size: "M", color: "Blue" }
    );
    if (matchingVariant && matchingVariant.id === created.id) {
      console.log("✅ Exact attribute match works correctly");
    } else {
      console.log("❌ Exact attribute match failed");
      console.log(`   Result: ${JSON.stringify(matchingVariant)}`);
      return;
    }

    // Test 5: Non-match returns null
    console.log("\nTest 5: Non-match returns null");
    const nonMatch = await variantRepo.findMatchingVariant(testProduct.id, {
      size: "L",
      color: "Red",
    });
    if (nonMatch === null) {
      console.log("✅ Non-match returns null correctly");
    } else {
      console.log("❌ Non-match should return null");
      console.log(`   Result: ${JSON.stringify(nonMatch)}`);
      return;
    }

    // Test 6: Update variant
    console.log("\nTest 6: Update variant");
    const updatePatch = {
      current_price: 39.99,
      current_stock_status: "out_of_stock",
      is_available: false,
    };
    const updated = await variantRepo.updateVariant(created.id, updatePatch);
    if (
      updated &&
      updated.current_price === updatePatch.current_price &&
      updated.current_stock_status === updatePatch.current_stock_status &&
      updated.is_available === updatePatch.is_available
    ) {
      console.log("✅ Update variant works correctly");
      console.log(`   Updated price: ${updated.current_price}`);
    } else {
      console.log("❌ Update variant failed");
      console.log(`   Result: ${JSON.stringify(updated)}`);
      return;
    }

    // Test 7: Update attributes (JSONB)
    console.log("\nTest 7: Update attributes (JSONB)");
    const attributeUpdate = {
      attributes: { size: "L", color: "Red" },
    };
    const updatedAttributes = await variantRepo.updateVariant(
      created.id,
      attributeUpdate
    );
    if (
      updatedAttributes &&
      JSON.stringify(updatedAttributes.attributes) ===
        JSON.stringify(attributeUpdate.attributes)
    ) {
      console.log("✅ Update attributes (JSONB) works correctly");
    } else {
      console.log("❌ Update attributes (JSONB) failed");
      console.log(`   Result: ${JSON.stringify(updatedAttributes)}`);
      return;
    }

    // Test 8: Find non-existent variant
    console.log("\nTest 8: Find non-existent variant");
    const notFound = await variantRepo.getVariantById(99999);
    if (notFound === null) {
      console.log("✅ Non-existent variant returns null correctly");
    } else {
      console.log("❌ Non-existent variant should return null");
      return;
    }

    console.log("\n✅ All VariantRepository tests passed!");
  } catch (error: any) {
    console.error("\n❌ VariantRepository test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run tests if this file is executed directly
testVariantRepository().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

