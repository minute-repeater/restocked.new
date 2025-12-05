import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { DomStockStrategy } from "../../src/stock/strategies/domStockStrategy.js";
import type { StockExtractionContext } from "../../src/stock/stockTypes.js";

/**
 * Create a test extraction context
 */
function createTestContext(html: string): StockExtractionContext {
  const $ = loadDom(html);
  const jsonBlobs = extractEmbeddedJson(html);

  return {
    $,
    html,
    jsonBlobs,
    finalURL: "https://example.com/product",
  };
}

/**
 * Test DOM-based stock extraction
 */
async function testDomStockStrategy() {
  console.log("🧪 Testing DomStockStrategy...\n");

  const strategy = new DomStockStrategy();

  // Test 1: "In Stock"
  console.log("Test 1: 'In Stock' detection");
  const html1 = `
    <html>
      <body>
        <div class="stock-status">In Stock</div>
      </body>
    </html>
  `;
  const context1 = createTestContext(html1);
  const result1 = strategy.extract(context1);

  if (
    result1.stock &&
    result1.stock.status === "in_stock" &&
    result1.stock.raw &&
    result1.stock.raw.toLowerCase().includes("stock")
  ) {
    console.log("✅ 'In Stock' detected correctly");
    console.log(`   Status: ${result1.stock.status}, Raw: ${result1.stock.raw}`);
  } else {
    console.log("❌ 'In Stock' detection failed");
    console.log(`   Result: ${JSON.stringify(result1.stock)}`);
  }

  // Test 2: "Out of Stock"
  console.log("\nTest 2: 'Out of Stock' detection");
  const html2 = `
    <html>
      <body>
        <p>This item is currently out of stock.</p>
      </body>
    </html>
  `;
  const context2 = createTestContext(html2);
  const result2 = strategy.extract(context2);

  if (
    result2.stock &&
    result2.stock.status === "out_of_stock" &&
    result2.stock.raw
  ) {
    console.log("✅ 'Out of Stock' detected correctly");
    console.log(`   Status: ${result2.stock.status}, Raw: ${result2.stock.raw}`);
  } else {
    console.log("❌ 'Out of Stock' detection failed");
    console.log(`   Result: ${JSON.stringify(result2.stock)}`);
  }

  // Test 3: Mixed text blocks
  console.log("\nTest 3: Mixed text blocks");
  const html3 = `
    <html>
      <body>
        <div>Available now</div>
        <div>Ships today</div>
        <div>Out of stock</div>
      </body>
    </html>
  `;
  const context3 = createTestContext(html3);
  const result3 = strategy.extract(context3);

  if (
    result3.stock &&
    (result3.stock.status === "in_stock" || result3.stock.status === "out_of_stock")
  ) {
    console.log("✅ Mixed text blocks handled correctly");
    console.log(`   Selected status: ${result3.stock.status}`);
    console.log(`   Raw: ${result3.stock.raw}`);
  } else {
    console.log("❌ Mixed text blocks handling failed");
    console.log(`   Result: ${JSON.stringify(result3.stock)}`);
  }

  // Test 4: Data attributes
  console.log("\nTest 4: Data attributes");
  const html4 = `
    <html>
      <body>
        <div data-stock="in stock">Product</div>
        <div data-availability="available">Info</div>
      </body>
    </html>
  `;
  const context4 = createTestContext(html4);
  const result4 = strategy.extract(context4);

  if (
    result4.stock &&
    result4.stock.status === "in_stock"
  ) {
    console.log("✅ Data attributes extracted correctly");
    console.log(`   Status: ${result4.stock.status}`);
  } else {
    console.log("❌ Data attributes extraction failed");
    console.log(`   Result: ${JSON.stringify(result4.stock)}`);
  }

  // Test 5: Low stock
  console.log("\nTest 5: Low stock detection");
  const html5 = `
    <html>
      <body>
        <div>Low stock - only 3 left</div>
      </body>
    </html>
  `;
  const context5 = createTestContext(html5);
  const result5 = strategy.extract(context5);

  if (
    result5.stock &&
    result5.stock.status === "low_stock"
  ) {
    console.log("✅ Low stock detected correctly");
    console.log(`   Status: ${result5.stock.status}`);
  } else {
    console.log("❌ Low stock detection failed");
    console.log(`   Result: ${JSON.stringify(result5.stock)}`);
  }

  // Test 6: No stock patterns
  console.log("\nTest 6: No stock patterns");
  const html6 = `<html><body><p>No stock info here</p></body></html>`;
  const result6 = strategy.extract(createTestContext(html6));

  if (result6.stock === null && result6.notes) {
    console.log("✅ No stock patterns handled correctly");
    console.log(`   Notes: ${result6.notes.join(", ")}`);
  } else {
    console.log("❌ No stock patterns not handled correctly");
  }

  console.log("\n✨ DomStockStrategy tests completed!");
}

testDomStockStrategy().catch(console.error);





