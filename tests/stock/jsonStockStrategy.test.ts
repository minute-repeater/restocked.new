import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { JsonStockStrategy } from "../../src/stock/strategies/jsonStockStrategy.js";
import type { StockExtractionContext } from "../../src/stock/stockTypes.js";

/**
 * Create a test extraction context with custom JSON blobs
 */
function createTestContext(jsonBlobs: any[]): StockExtractionContext {
  const html = "<html><body></body></html>";
  const $ = loadDom(html);

  return {
    $,
    html,
    jsonBlobs,
    finalURL: "https://example.com/product",
  };
}

/**
 * Test JSON-based stock extraction
 */
async function testJsonStockStrategy() {
  console.log("🧪 Testing JsonStockStrategy...\n");

  const strategy = new JsonStockStrategy();

  // Test 1: JSON-LD offers.availability
  console.log("Test 1: JSON-LD offers.availability");
  const jsonLd = {
    "@type": "Product",
    "@context": "https://schema.org",
    offers: {
      availability: "https://schema.org/InStock",
      price: "29.99",
    },
  };
  const context1 = createTestContext([jsonLd]);
  const result1 = strategy.extract(context1);

  if (
    result1.stock &&
    result1.stock.status === "in_stock"
  ) {
    console.log("✅ JSON-LD offers.availability extracted correctly");
    console.log(`   Status: ${result1.stock.status}`);
  } else {
    console.log("❌ JSON-LD offers.availability extraction failed");
    console.log(`   Result: ${JSON.stringify(result1.stock)}`);
  }

  // Test 2: Shopify availableForSale
  console.log("\nTest 2: Shopify availableForSale");
  const shopifyJson = {
    product: {
      availableForSale: true,
      variants: [
        { availableForSale: true },
        { availableForSale: false },
      ],
    },
  };
  const context2 = createTestContext([shopifyJson]);
  const result2 = strategy.extract(context2);

  if (
    result2.stock &&
    result2.stock.status === "in_stock"
  ) {
    console.log("✅ Shopify availableForSale extracted correctly");
    console.log(`   Status: ${result2.stock.status}`);
  } else {
    console.log("❌ Shopify availableForSale extraction failed");
    console.log(`   Result: ${JSON.stringify(result2.stock)}`);
  }

  // Test 3: Nested availability fields
  console.log("\nTest 3: Nested availability fields");
  const nestedJson = {
    data: {
      product: {
        availability: {
          status: "OutOfStock",
        },
      },
    },
  };
  const context3 = createTestContext([nestedJson]);
  const result3 = strategy.extract(context3);

  if (
    result3.stock &&
    result3.stock.status === "out_of_stock"
  ) {
    console.log("✅ Nested availability fields extracted correctly");
    console.log(`   Status: ${result3.stock.status}`);
  } else {
    console.log("❌ Nested availability fields extraction failed");
    console.log(`   Result: ${JSON.stringify(result3.stock)}`);
  }

  // Test 4: Quantity-based detection
  console.log("\nTest 4: Quantity-based detection");
  const quantityJson = {
    product: {
      quantity: 0,
    },
  };
  const context4 = createTestContext([quantityJson]);
  const result4 = strategy.extract(context4);

  if (
    result4.stock &&
    result4.stock.status === "out_of_stock"
  ) {
    console.log("✅ Quantity-based detection works correctly");
    console.log(`   Status: ${result4.stock.status}`);
  } else {
    console.log("❌ Quantity-based detection failed");
    console.log(`   Result: ${JSON.stringify(result4.stock)}`);
  }

  // Test 5: Low stock from quantity
  console.log("\nTest 5: Low stock from quantity");
  const lowStockJson = {
    product: {
      quantity: 3,
    },
  };
  const context5 = createTestContext([lowStockJson]);
  const result5 = strategy.extract(context5);

  if (
    result5.stock &&
    result5.stock.status === "low_stock"
  ) {
    console.log("✅ Low stock from quantity detected correctly");
    console.log(`   Status: ${result5.stock.status}`);
  } else {
    console.log("❌ Low stock from quantity detection failed");
    console.log(`   Result: ${JSON.stringify(result5.stock)}`);
  }

  // Test 6: Preorder detection
  console.log("\nTest 6: Preorder detection");
  const preorderJson = {
    product: {
      availability: "https://schema.org/PreOrder",
    },
  };
  const context6 = createTestContext([preorderJson]);
  const result6 = strategy.extract(context6);

  if (
    result6.stock &&
    result6.stock.status === "preorder"
  ) {
    console.log("✅ Preorder detected correctly");
    console.log(`   Status: ${result6.stock.status}`);
  } else {
    console.log("❌ Preorder detection failed");
    console.log(`   Result: ${JSON.stringify(result6.stock)}`);
  }

  // Test 7: No JSON blobs
  console.log("\nTest 7: No JSON blobs");
  const context7 = createTestContext([]);
  const result7 = strategy.extract(context7);

  if (result7.stock === null && result7.notes) {
    console.log("✅ No JSON blobs handled correctly");
    console.log(`   Notes: ${result7.notes.join(", ")}`);
  } else {
    console.log("❌ No JSON blobs not handled correctly");
  }

  console.log("\n✨ JsonStockStrategy tests completed!");
}

testJsonStockStrategy().catch(console.error);


