import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { extractPrice } from "../../src/pricing/priceExtractor.js";
import type { PriceExtractionContext } from "../../src/pricing/priceTypes.js";

/**
 * Create a test extraction context
 */
function createTestContext(html: string, jsonBlobs: any[] = []): PriceExtractionContext {
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
 * Test price extractor orchestrator
 */
async function testPriceExtractor() {
  console.log("🧪 Testing PriceExtractor (Orchestrator)...\n");

  // Test 1: Sequential fallback logic
  console.log("Test 1: Sequential fallback logic");
  const html1 = `<html><body><div class="price">$29.99</div></body></html>`;
  const result1 = extractPrice(createTestContext(html1));

  if (
    result1.price &&
    result1.price.amount === 29.99 &&
    result1.notes &&
    result1.notes.some((note) => note.includes("extracted using"))
  ) {
    console.log("✅ Sequential fallback works correctly");
    console.log(`   Price: ${result1.price.amount} ${result1.price.currency}`);
    console.log(`   Strategy note: ${result1.notes.find((n) => n.includes("extracted using"))}`);
  } else {
    console.log("❌ Sequential fallback failed");
    console.log(`   Result: ${JSON.stringify(result1)}`);
  }

  // Test 2: JSON wins over DOM
  console.log("\nTest 2: JSON wins over DOM");
  const html2 = `<html><body><div class="price">$29.99</div></body></html>`;
  const json2 = [{ product: { price: 39.99, currency: "USD" } }];
  const result2 = extractPrice(createTestContext(html2, json2));

  if (
    result2.price &&
    result2.price.amount === 39.99 &&
    result2.notes &&
    result2.notes.some((note) => note.includes("json-price-strategy"))
  ) {
    console.log("✅ JSON strategy wins over DOM");
    console.log(`   Price: ${result2.price.amount} ${result2.price.currency}`);
  } else {
    console.log("❌ JSON strategy did not win");
    console.log(`   Result: ${JSON.stringify(result2.price)}`);
  }

  // Test 3: DOM wins over heuristic
  console.log("\nTest 3: DOM wins over heuristic");
  const html3 = `
    <html>
      <body>
        <div class="current-price">$49.99</div>
        <p>This product costs around $59.99</p>
      </body>
    </html>
  `;
  const result3 = extractPrice(createTestContext(html3));

  if (
    result3.price &&
    result3.price.amount === 49.99 &&
    result3.notes &&
    result3.notes.some((note) => note.includes("dom-price-strategy"))
  ) {
    console.log("✅ DOM strategy wins over heuristic");
    console.log(`   Price: ${result3.price.amount} ${result3.price.currency}`);
  } else {
    console.log("❌ DOM strategy did not win");
    console.log(`   Result: ${JSON.stringify(result3.price)}`);
  }

  // Test 4: No price returns null shell
  console.log("\nTest 4: No price returns null shell");
  const html4 = `<html><body><p>No price information</p></body></html>`;
  const result4 = extractPrice(createTestContext(html4));

  if (
    result4.price === null &&
    result4.notes &&
    result4.notes.some((note) => note.includes("No price"))
  ) {
    console.log("✅ No price handled correctly");
    console.log(`   Notes: ${result4.notes.join(", ")}`);
  } else {
    console.log("❌ No price not handled correctly");
    console.log(`   Result: ${JSON.stringify(result4)}`);
  }

  // Test 5: Strategy failure handling
  console.log("\nTest 5: Strategy failure handling");
  const html5 = `<html><body><div class="price">invalid</div></body></html>`;
  const result5 = extractPrice(createTestContext(html5));

  // Should try next strategy if one fails
  if (result5.price === null || result5.price.amount !== null) {
    console.log("✅ Strategy failure handled gracefully");
    console.log(`   Result: ${result5.price ? JSON.stringify(result5.price) : "null"}`);
  } else {
    console.log("❌ Strategy failure not handled correctly");
  }

  // Test 6: Notes from all strategies
  console.log("\nTest 6: Notes from all strategies");
  const html6 = `<html><body><div class="price">$79.99</div></body></html>`;
  const result6 = extractPrice(createTestContext(html6));

  if (result6.notes && result6.notes.length > 0) {
    console.log("✅ Notes collected from strategies");
    result6.notes.forEach((note) => console.log(`   - ${note}`));
  } else {
    console.log("❌ Notes not collected");
  }

  // Test 7: Price structure validation
  console.log("\nTest 7: Price structure validation");
  const html7 = `<html><body><div class="price">$99.99</div></body></html>`;
  const result7 = extractPrice(createTestContext(html7));

  if (
    result7.price &&
    typeof result7.price.amount === "number" &&
    (result7.price.currency === null || typeof result7.price.currency === "string") &&
    typeof result7.price.raw === "string"
  ) {
    console.log("✅ Price structure is correct");
    console.log(`   PriceShell: ${JSON.stringify(result7.price, null, 2)}`);
  } else {
    console.log("❌ Price structure is incorrect");
    console.log(`   Result: ${JSON.stringify(result7.price)}`);
  }

  console.log("\n✨ PriceExtractor tests completed!");
}

testPriceExtractor().catch(console.error);


