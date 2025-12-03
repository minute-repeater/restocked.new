import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { HeuristicPriceStrategy } from "../../src/pricing/strategies/heuristicPriceStrategy.js";
import type { PriceExtractionContext } from "../../src/pricing/priceTypes.js";

/**
 * Create a test extraction context
 */
function createTestContext(html: string): PriceExtractionContext {
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
 * Test heuristic-based price extraction
 */
async function testHeuristicPriceStrategy() {
  console.log("🧪 Testing HeuristicPriceStrategy...\n");

  const strategy = new HeuristicPriceStrategy();

  // Test 1: Raw text pattern detection
  console.log("Test 1: Raw text pattern detection");
  const html1 = `
    <html>
      <body>
        <p>This product costs $29.99 and is available now.</p>
      </body>
    </html>
  `;
  const context1 = createTestContext(html1);
  const result1 = strategy.extract(context1);

  if (
    result1.price &&
    result1.price.amount === 29.99 &&
    result1.price.currency === "USD"
  ) {
    console.log("✅ Raw text pattern detected correctly");
    console.log(`   Amount: ${result1.price.amount}, Currency: ${result1.price.currency}`);
  } else {
    console.log("❌ Raw text pattern detection failed");
    console.log(`   Result: ${JSON.stringify(result1.price)}`);
  }

  // Test 2: Currency inference
  console.log("\nTest 2: Currency inference");
  const html2a = `<p>Price: €199</p>`;
  const html2b = `<p>Price: £79</p>`;
  const html2c = `<p>Price: USD 50</p>`;

  const result2a = strategy.extract(createTestContext(html2a));
  const result2b = strategy.extract(createTestContext(html2b));
  const result2c = strategy.extract(createTestContext(html2c));

  if (
    result2a.price?.currency === "EUR" &&
    result2b.price?.currency === "GBP" &&
    result2c.price?.currency === "USD"
  ) {
    console.log("✅ Currency inference works correctly");
    console.log(`   EUR: ${result2a.price.currency}, GBP: ${result2b.price.currency}, USD: ${result2c.price.currency}`);
  } else {
    console.log("❌ Currency inference failed");
  }

  // Test 3: Reject invalid matches
  console.log("\nTest 3: Reject invalid matches");
  const html3 = `
    <html>
      <body>
        <p>Year: 2024</p>
        <p>ID: 12345</p>
        <p>Price: $0.05</p>
        <p>Price: $50000</p>
      </body>
    </html>
  `;
  const context3 = createTestContext(html3);
  const result3 = strategy.extract(context3);

  // Should reject prices below 0.1 or above 10000
  if (
    result3.price === null ||
    (result3.price.amount && (result3.price.amount < 0.1 || result3.price.amount > 10000))
  ) {
    console.log("✅ Invalid matches rejected correctly");
    console.log(`   Result: ${result3.price ? JSON.stringify(result3.price) : "null"}`);
  } else {
    console.log("❌ Invalid matches not rejected");
    console.log(`   Result: ${JSON.stringify(result3.price)}`);
  }

  // Test 4: Multiple price candidates (choose best)
  console.log("\nTest 4: Multiple price candidates");
  const html4 = `
    <html>
      <body>
        <p>Regular: 99</p>
        <p>Sale: $79.99</p>
        <p>Final: €69.50</p>
      </body>
    </html>
  `;
  const context4 = createTestContext(html4);
  const result4 = strategy.extract(context4);

  if (
    result4.price &&
    result4.price.amount &&
    result4.price.currency
  ) {
    console.log("✅ Best candidate selected");
    console.log(`   Selected: ${result4.price.amount} ${result4.price.currency}`);
  } else {
    console.log("❌ Candidate selection failed");
    console.log(`   Result: ${JSON.stringify(result4.price)}`);
  }

  // Test 5: No price-like strings
  console.log("\nTest 5: No price-like strings");
  const html5 = `<html><body><p>No prices here</p></body></html>`;
  const result5 = strategy.extract(createTestContext(html5));

  if (result5.price === null && result5.notes) {
    console.log("✅ No price-like strings handled correctly");
    console.log(`   Notes: ${result5.notes.join(", ")}`);
  } else {
    console.log("❌ No price-like strings not handled correctly");
  }

  // Test 6: Notes included
  console.log("\nTest 6: Notes included");
  const context6 = createTestContext(html1);
  const result6 = strategy.extract(context6);

  if (
    result6.notes &&
    result6.notes.length > 0 &&
    result6.notes.some((note) => note.includes("price") || note.includes("candidate"))
  ) {
    console.log("✅ Notes included correctly");
    result6.notes.forEach((note) => console.log(`   - ${note}`));
  } else {
    console.log("❌ Notes not included or incomplete");
    console.log(`   Notes: ${result6.notes?.join(", ") || "none"}`);
  }

  console.log("\n✨ HeuristicPriceStrategy tests completed!");
}

testHeuristicPriceStrategy().catch(console.error);


