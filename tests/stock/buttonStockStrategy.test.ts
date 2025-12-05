import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { ButtonStockStrategy } from "../../src/stock/strategies/buttonStockStrategy.js";
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
 * Test button-based stock extraction
 */
async function testButtonStockStrategy() {
  console.log("🧪 Testing ButtonStockStrategy...\n");

  const strategy = new ButtonStockStrategy();

  // Test 1: Enabled "Add to Cart" → in_stock
  console.log("Test 1: Enabled 'Add to Cart' button");
  const html1 = `
    <html>
      <body>
        <button class="add-to-cart">Add to Cart</button>
      </body>
    </html>
  `;
  const context1 = createTestContext(html1);
  const result1 = strategy.extract(context1);

  if (
    result1.stock &&
    result1.stock.status === "in_stock" &&
    result1.stock.raw &&
    result1.stock.raw.toLowerCase().includes("add")
  ) {
    console.log("✅ Enabled 'Add to Cart' detected as in_stock");
    console.log(`   Status: ${result1.stock.status}, Raw: ${result1.stock.raw}`);
  } else {
    console.log("❌ Enabled 'Add to Cart' detection failed");
    console.log(`   Result: ${JSON.stringify(result1.stock)}`);
  }

  // Test 2: Disabled/"Sold Out" buttons → out_of_stock
  console.log("\nTest 2: Disabled 'Sold Out' button");
  const html2 = `
    <html>
      <body>
        <button disabled>Sold Out</button>
      </body>
    </html>
  `;
  const context2 = createTestContext(html2);
  const result2 = strategy.extract(context2);

  if (
    result2.stock &&
    result2.stock.status === "out_of_stock"
  ) {
    console.log("✅ Disabled 'Sold Out' button detected as out_of_stock");
    console.log(`   Status: ${result2.stock.status}, Raw: ${result2.stock.raw}`);
  } else {
    console.log("❌ Disabled 'Sold Out' button detection failed");
    console.log(`   Result: ${JSON.stringify(result2.stock)}`);
  }

  // Test 3: Disabled Add to Cart button
  console.log("\nTest 3: Disabled Add to Cart button");
  const html3 = `
    <html>
      <body>
        <button disabled>Add to Cart</button>
      </body>
    </html>
  `;
  const context3 = createTestContext(html3);
  const result3 = strategy.extract(context3);

  if (
    result3.stock &&
    result3.stock.status === "out_of_stock"
  ) {
    console.log("✅ Disabled Add to Cart detected as out_of_stock");
    console.log(`   Status: ${result3.stock.status}`);
  } else {
    console.log("❌ Disabled Add to Cart detection failed");
    console.log(`   Result: ${JSON.stringify(result3.stock)}`);
  }

  // Test 4: "Notify Me" button
  console.log("\nTest 4: 'Notify Me' button");
  const html4 = `
    <html>
      <body>
        <button>Notify Me When Available</button>
      </body>
    </html>
  `;
  const context4 = createTestContext(html4);
  const result4 = strategy.extract(context4);

  if (
    result4.stock &&
    result4.stock.status === "out_of_stock"
  ) {
    console.log("✅ 'Notify Me' button detected as out_of_stock");
    console.log(`   Status: ${result4.stock.status}`);
  } else {
    console.log("❌ 'Notify Me' button detection failed");
    console.log(`   Result: ${JSON.stringify(result4.stock)}`);
  }

  // Test 5: Multiple buttons (prefer out-of-stock if present)
  console.log("\nTest 5: Multiple buttons");
  const html5 = `
    <html>
      <body>
        <button>Add to Cart</button>
        <button disabled>Out of Stock</button>
      </body>
    </html>
  `;
  const context5 = createTestContext(html5);
  const result5 = strategy.extract(context5);

  if (
    result5.stock &&
    result5.stock.status === "out_of_stock"
  ) {
    console.log("✅ Multiple buttons handled correctly (out-of-stock wins)");
    console.log(`   Status: ${result5.stock.status}`);
  } else {
    console.log("❌ Multiple buttons handling failed");
    console.log(`   Result: ${JSON.stringify(result5.stock)}`);
  }

  // Test 6: No buttons
  console.log("\nTest 6: No buttons");
  const html6 = `<html><body><p>No buttons here</p></body></html>`;
  const result6 = strategy.extract(createTestContext(html6));

  if (result6.stock === null && result6.notes) {
    console.log("✅ No buttons handled correctly");
    console.log(`   Notes: ${result6.notes.join(", ")}`);
  } else {
    console.log("❌ No buttons not handled correctly");
  }

  // Test 7: Link with role="button"
  console.log("\nTest 7: Link with role='button'");
  const html7 = `
    <html>
      <body>
        <a role="button" class="btn">Buy Now</a>
      </body>
    </html>
  `;
  const context7 = createTestContext(html7);
  const result7 = strategy.extract(context7);

  if (
    result7.stock &&
    result7.stock.status === "in_stock"
  ) {
    console.log("✅ Link with role='button' detected correctly");
    console.log(`   Status: ${result7.stock.status}`);
  } else {
    console.log("❌ Link with role='button' detection failed");
    console.log(`   Result: ${JSON.stringify(result7.stock)}`);
  }

  console.log("\n✨ ButtonStockStrategy tests completed!");
}

testButtonStockStrategy().catch(console.error);





