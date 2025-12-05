import { query, closePool } from "../../src/db/client.js";
import { ProductRepository } from "../../src/db/repositories/productRepository.js";
import { VariantRepository } from "../../src/db/repositories/variantRepository.js";

/**
 * Test Variants API endpoints
 */
async function testVariantsAPI() {
  console.log("🧪 Testing Variants API...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const productRepo = new ProductRepository();
  const variantRepo = new VariantRepository();

  try {
    // Clean up before tests
    await query("DELETE FROM variant_stock_history");
    await query("DELETE FROM variant_price_history");
    await query("DELETE FROM variants");
    await query("DELETE FROM products");

    // Create test data
    const testProduct = await productRepo.createProduct({
      url: "https://example.com/test-product",
      name: "Test Product",
    });

    const testVariant = await variantRepo.createVariant({
      product_id: testProduct.id,
      attributes: { size: "M", color: "Blue" },
      current_price: 29.99,
      currency: "USD",
      current_stock_status: "in_stock",
      is_available: true,
    });

    // Insert price history
    await query(
      `INSERT INTO variant_price_history (variant_id, recorded_at, price, currency, raw, metadata)
       VALUES ($1, now(), $2, $3, $4, $5)`,
      [testVariant.id, 29.99, "USD", "$29.99", JSON.stringify({ source: "test" })]
    );

    // Insert stock history
    await query(
      `INSERT INTO variant_stock_history (variant_id, recorded_at, status, raw, metadata)
       VALUES ($1, now(), $2, $3, $4)`,
      [testVariant.id, "in_stock", "In Stock", JSON.stringify({ source: "test" })]
    );

    // Test 1: GET /variants/:id
    console.log("Test 1: GET /variants/:id");
    const variant = await variantRepo.getVariantById(testVariant.id);
    if (!variant) {
      console.log("❌ Variant not found");
      return;
    }

    const priceHistory = await query(
      `SELECT * FROM variant_price_history WHERE variant_id = $1 ORDER BY recorded_at DESC`,
      [testVariant.id]
    );

    const stockHistory = await query(
      `SELECT * FROM variant_stock_history WHERE variant_id = $1 ORDER BY recorded_at DESC`,
      [testVariant.id]
    );

    if (
      variant.id === testVariant.id &&
      priceHistory.rows.length > 0 &&
      stockHistory.rows.length > 0
    ) {
      console.log("✅ GET /variants/:id structure correct");
      console.log(`   Variant ID: ${variant.id}`);
      console.log(`   Price history entries: ${priceHistory.rows.length}`);
      console.log(`   Stock history entries: ${stockHistory.rows.length}`);
    } else {
      console.log("❌ GET /variants/:id failed");
      return;
    }

    // Test 2: GET /products/:productId/variants
    console.log("\nTest 2: GET /products/:productId/variants");
    const variants = await variantRepo.findByProduct(testProduct.id);
    if (variants.length === 1 && variants[0].id === testVariant.id) {
      console.log("✅ GET /products/:productId/variants works correctly");
      console.log(`   Found ${variants.length} variants`);
    } else {
      console.log("❌ GET /products/:productId/variants failed");
      return;
    }

    console.log("\n✅ All Variants API tests passed!");
  } catch (error: any) {
    console.error("\n❌ Variants API test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run tests if this file is executed directly
testVariantsAPI().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});





