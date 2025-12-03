import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { HeuristicStockStrategy } from "../../src/stock/strategies/heuristicStockStrategy.js";
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
 * Test heuristic-based stock extraction
 */
async function testHeuristicStockStrategy() {
  console.log("🧪 Testing HeuristicStockStrategy...\n");

  const strategy = new HeuristicStockStrategy();

  // Test 1: Raw text fallback
  console.log("Test 1: Raw text fallback");
  const html1 = `
    <html>
      <body>
        <p>This product is currently in stock and ready to ship.</p>
      </body>
    </html>
  `;
  const context1 = createTestContext(html1);
  const result1 = strategy.extract(context1);

  if (
    result1.stock &&
    result1.stock.status === "in_stock"
  ) {
    console.log("✅ Raw text fallback works correctly");
    console.log(`   Status: ${result1.stock.status}, Raw: ${result1.stock.raw}`);
  } else {
    console.log("❌ Raw text fallback failed");
    console.log(`   Result: ${JSON.stringify(result1.stock)}`);
  }

  // Test 2: Multiple stock strings (select best)
  console.log("\nTest 2: Multiple stock strings");
  const html2 = `
    <html>
      <body>
        <p>Available now</p>
        <p>Out of stock</p>
        <p>Sold out</p>
      </body>
    </html>
  `;
  const context2 = createTestContext(html2);
  const result2 = strategy.extract(context2);

  if (
    result2.stock &&
    (result2.stock.status === "in_stock" || result2.stock.status === "out_of_stock")
  ) {
    console.log("✅ Multiple stock strings handled correctly");
    console.log(`   Selected status: ${result2.stock.status}`);
  } else {
    console.log("❌ Multiple stock strings handling failed");
    console.log(`   Result: ${JSON.stringify(result2.stock)}`);
  }

  // Test 3: Backorder detection
  console.log("\nTest 3: Backorder detection");
  const html3 = `
    <html>
      <body>
        <p>This item is on backorder and will ship when available.</p>
      </body>
    </html>
  `;
  const context3 = createTestContext(html3);
  const result3 = strategy.extract(context3);

  if (
    result3.stock &&
    result3.stock.status === "backorder"
  ) {
    console.log("✅ Backorder detected correctly");
    console.log(`   Status: ${result3.stock.status}`);
  } else {
    console.log("❌ Backorder detection failed");
    console.log(`   Result: ${JSON.stringify(result3.stock)}`);
  }

  // Test 4: Preorder detection
  console.log("\nTest 4: Preorder detection");
  const html4 = `
    <html>
      <body>
        <p>Pre-order now for early delivery.</p>
      </body>
    </html>
  `;
  const context4 = createTestContext(html4);
  const result4 = strategy.extract(context4);

  if (
    result4.stock &&
    result4.stock.status === "preorder"
  ) {
    console.log("✅ Preorder detected correctly");
    console.log(`   Status: ${result4.stock.status}`);
  } else {
    console.log("❌ Preorder detection failed");
    console.log(`   Result: ${JSON.stringify(result4.stock)}`);
  }

  // Test 5: No stock-like strings
  console.log("\nTest 5: No stock-like strings");
  const html5 = `<html><body><p>No stock info here</p></body></html>`;
  const result5 = strategy.extract(createTestContext(html5));

  if (result5.stock === null && result5.notes) {
    console.log("✅ No stock-like strings handled correctly");
    console.log(`   Notes: ${result5.notes.join(", ")}`);
  } else {
    console.log("❌ No stock-like strings not handled correctly");
  }

  // Test 6: Notes included
  console.log("\nTest 6: Notes included");
  const context6 = createTestContext(html1);
  const result6 = strategy.extract(context6);

  if (
    result6.notes &&
    result6.notes.length > 0 &&
    result6.notes.some((note) => note.includes("stock") || note.includes("candidate"))
  ) {
    console.log("✅ Notes included correctly");
    result6.notes.forEach((note) => console.log(`   - ${note}`));
  } else {
    console.log("❌ Notes not included or incomplete");
    console.log(`   Notes: ${result6.notes?.join(", ") || "none"}`);
  }

  console.log("\n✨ HeuristicStockStrategy tests completed!");
}

testHeuristicStockStrategy().catch(console.error);


