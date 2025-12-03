import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { DomPriceStrategy } from "../../src/pricing/strategies/domPriceStrategy.js";
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
 * Test DOM-based price extraction
 */
async function testDomPriceStrategy() {
  console.log("🧪 Testing DomPriceStrategy...\n");

  const strategy = new DomPriceStrategy();

  // Test 1: Simple price pattern
  console.log("Test 1: Simple price pattern");
  const html1 = `
    <html>
      <body>
        <div class="price">$29.99</div>
      </body>
    </html>
  `;
  const context1 = createTestContext(html1);
  const result1 = strategy.extract(context1);

  if (
    result1.price &&
    result1.price.amount === 29.99 &&
    result1.price.currency === "USD" &&
    result1.price.raw === "$29.99"
  ) {
    console.log("✅ Simple price pattern extracted correctly");
    console.log(`   Amount: ${result1.price.amount}, Currency: ${result1.price.currency}`);
  } else {
    console.log("❌ Simple price pattern extraction failed");
    console.log(`   Result: ${JSON.stringify(result1.price)}`);
  }

  // Test 2: Multiple prices → return the most prominent
  console.log("\nTest 2: Multiple prices");
  const html2 = `
    <html>
      <body>
        <div class="old-price">$49.99</div>
        <div class="current-price">$29.99</div>
        <div class="sale-price">$24.99</div>
      </body>
    </html>
  `;
  const context2 = createTestContext(html2);
  const result2 = strategy.extract(context2);

  if (
    result2.price &&
    result2.price.amount &&
    (result2.price.amount === 29.99 || result2.price.amount === 24.99)
  ) {
    console.log("✅ Multiple prices handled correctly");
    console.log(`   Selected price: ${result2.price.amount}`);
  } else {
    console.log("❌ Multiple prices extraction failed");
    console.log(`   Result: ${JSON.stringify(result2.price)}`);
  }

  // Test 3: Currency symbol variations
  console.log("\nTest 3: Currency symbol variations");
  const html3a = `<div class="price">€199</div>`;
  const html3b = `<div class="price">£79</div>`;
  const html3c = `<div class="price">¥5000</div>`;

  const result3a = strategy.extract(createTestContext(html3a));
  const result3b = strategy.extract(createTestContext(html3b));
  const result3c = strategy.extract(createTestContext(html3c));

  if (
    result3a.price?.currency === "EUR" &&
    result3b.price?.currency === "GBP" &&
    result3c.price?.currency === "JPY"
  ) {
    console.log("✅ Currency symbols detected correctly");
    console.log(`   EUR: ${result3a.price.currency}, GBP: ${result3b.price.currency}, JPY: ${result3c.price.currency}`);
  } else {
    console.log("❌ Currency symbol detection failed");
  }

  // Test 4: Meta price tags
  console.log("\nTest 4: Meta price tags");
  const html4 = `
    <html>
      <head>
        <meta property="product:price:amount" content="39.99">
        <meta property="product:price:currency" content="USD">
      </head>
      <body></body>
    </html>
  `;
  const context4 = createTestContext(html4);
  const result4 = strategy.extract(context4);

  if (
    result4.price &&
    result4.price.amount === 39.99 &&
    result4.price.currency === "USD"
  ) {
    console.log("✅ Meta price tags extracted correctly");
    console.log(`   Amount: ${result4.price.amount}, Currency: ${result4.price.currency}`);
  } else {
    console.log("❌ Meta price tags extraction failed");
    console.log(`   Result: ${JSON.stringify(result4.price)}`);
  }

  // Test 5: Discounted + original prices
  console.log("\nTest 5: Discounted + original prices");
  const html5 = `
    <html>
      <body>
        <div class="regular-price">$99.99</div>
        <div class="sale-price">$79.99</div>
      </body>
    </html>
  `;
  const context5 = createTestContext(html5);
  const result5 = strategy.extract(context5);

  if (
    result5.price &&
    result5.price.amount === 79.99
  ) {
    console.log("✅ Sale price selected over regular price");
    console.log(`   Selected: ${result5.price.amount}`);
  } else {
    console.log("❌ Price selection failed");
    console.log(`   Result: ${JSON.stringify(result5.price)}`);
  }

  // Test 6: No price found
  console.log("\nTest 6: No price found");
  const html6 = `<html><body><p>No price here</p></body></html>`;
  const result6 = strategy.extract(createTestContext(html6));

  if (result6.price === null && result6.notes) {
    console.log("✅ No price handled correctly");
    console.log(`   Notes: ${result6.notes.join(", ")}`);
  } else {
    console.log("❌ No price not handled correctly");
  }

  console.log("\n✨ DomPriceStrategy tests completed!");
}

testDomPriceStrategy().catch(console.error);


