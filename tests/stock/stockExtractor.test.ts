import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { extractStock } from "../../src/stock/stockExtractor.js";
import type { StockExtractionContext } from "../../src/stock/stockTypes.js";

/**
 * Create a test extraction context
 */
function createTestContext(html: string, jsonBlobs: any[] = []): StockExtractionContext {
  const $ = loadDom(html);
  const extractedJson = extractEmbeddedJson(html);

  return {
    $,
    html,
    jsonBlobs: jsonBlobs.length > 0 ? jsonBlobs : extractedJson,
    finalURL: "https://example.com/product",
  };
}

/**
 * Test stock extractor orchestrator
 */
async function testStockExtractor() {
  console.log("🧪 Testing StockExtractor (Orchestrator)...\n");

  // Test 1: Priority order validated (JSON wins)
  console.log("Test 1: Priority order (JSON wins over DOM)");
  const html1 = `
    <html>
      <body>
        <div>Out of Stock</div>
      </body>
    </html>
  `;
  const json1 = [{ product: { availableForSale: true } }];
  const result1 = extractStock(createTestContext(html1, json1));

  if (
    result1.stock &&
    result1.stock.status === "in_stock" &&
    result1.notes &&
    result1.notes.some((note) => note.includes("json-stock-strategy"))
  ) {
    console.log("✅ JSON strategy wins over DOM");
    console.log(`   Status: ${result1.stock.status}`);
    console.log(`   Strategy note: ${result1.notes.find((n) => n.includes("json-stock-strategy"))}`);
  } else {
    console.log("❌ JSON strategy did not win");
    console.log(`   Result: ${JSON.stringify(result1.stock)}`);
  }

  // Test 2: DOM wins over button
  console.log("\nTest 2: DOM wins over button");
  const html2 = `
    <html>
      <body>
        <div class="stock-status">In Stock</div>
        <button disabled>Add to Cart</button>
      </body>
    </html>
  `;
  const result2 = extractStock(createTestContext(html2));

  if (
    result2.stock &&
    result2.stock.status === "in_stock" &&
    result2.notes &&
    result2.notes.some((note) => note.includes("dom-stock-strategy"))
  ) {
    console.log("✅ DOM strategy wins over button");
    console.log(`   Status: ${result2.stock.status}`);
  } else {
    console.log("❌ DOM strategy did not win");
    console.log(`   Result: ${JSON.stringify(result2.stock)}`);
  }

  // Test 3: Button wins over heuristic
  console.log("\nTest 3: Button wins over heuristic");
  const html3 = `
    <html>
      <body>
        <button>Add to Cart</button>
        <p>Some text about availability</p>
      </body>
    </html>
  `;
  const result3 = extractStock(createTestContext(html3));

  if (
    result3.stock &&
    result3.stock.status === "in_stock" &&
    result3.notes &&
    result3.notes.some((note) => note.includes("button-stock-strategy") || note.includes("dom-stock-strategy"))
  ) {
    console.log("✅ Button/DOM strategy wins over heuristic");
    console.log(`   Status: ${result3.stock.status}`);
  } else {
    console.log("❌ Strategy priority not working correctly");
    console.log(`   Result: ${JSON.stringify(result3.stock)}`);
  }

  // Test 4: Correct result returned
  console.log("\nTest 4: Correct result structure");
  const html4 = `
    <html>
      <body>
        <div>In Stock</div>
      </body>
    </html>
  `;
  const result4 = extractStock(createTestContext(html4));

  if (
    result4.stock &&
    typeof result4.stock.status === "string" &&
    (result4.stock.raw === null || typeof result4.stock.raw === "string")
  ) {
    console.log("✅ Correct result structure");
    console.log(`   StockShell: ${JSON.stringify(result4.stock, null, 2)}`);
  } else {
    console.log("❌ Incorrect result structure");
    console.log(`   Result: ${JSON.stringify(result4.stock)}`);
  }

  // Test 5: Notes merged
  console.log("\nTest 5: Notes merged from strategies");
  const html5 = `
    <html>
      <body>
        <div>Out of Stock</div>
        <button disabled>Sold Out</button>
      </body>
    </html>
  `;
  const result5 = extractStock(createTestContext(html5));

  if (result5.notes && result5.notes.length > 0) {
    console.log("✅ Notes merged correctly");
    result5.notes.forEach((note) => console.log(`   - ${note}`));
  } else {
    console.log("❌ Notes not merged");
    console.log(`   Notes: ${result5.notes?.join(", ") || "none"}`);
  }

  // Test 6: No stock found
  console.log("\nTest 6: No stock found");
  const html6 = `<html><body><p>No stock information</p></body></html>`;
  const result6 = extractStock(createTestContext(html6));

  if (
    result6.stock === null &&
    result6.notes &&
    result6.notes.some((note) => note.includes("No stock") || note.includes("stock"))
  ) {
    console.log("✅ No stock handled correctly");
    console.log(`   Notes: ${result6.notes.join(", ")}`);
  } else {
    console.log("❌ No stock not handled correctly");
    console.log(`   Stock: ${result6.stock}, Notes: ${result6.notes?.join(", ") || "none"}`);
  }

  // Test 7: Status values validation
  console.log("\nTest 7: Status values validation");
  const validStatuses = [
    "in_stock",
    "out_of_stock",
    "low_stock",
    "backorder",
    "preorder",
    "unknown",
  ];

  const html7 = `<html><body><div>In Stock</div></body></html>`;
  const result7 = extractStock(createTestContext(html7));

  if (
    result7.stock &&
    validStatuses.includes(result7.stock.status)
  ) {
    console.log("✅ Status value is valid");
    console.log(`   Status: ${result7.stock.status}`);
  } else {
    console.log("❌ Status value is invalid");
    console.log(`   Status: ${result7.stock.status}`);
  }

  console.log("\n✨ StockExtractor tests completed!");
}

testStockExtractor().catch(console.error);





