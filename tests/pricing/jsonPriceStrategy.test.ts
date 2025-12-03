import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { JsonPriceStrategy } from "../../src/pricing/strategies/jsonPriceStrategy.js";
import type { PriceExtractionContext } from "../../src/pricing/priceTypes.js";

/**
 * Create a test extraction context with custom JSON blobs
 */
function createTestContext(jsonBlobs: any[]): PriceExtractionContext {
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
 * Test JSON-based price extraction
 */
async function testJsonPriceStrategy() {
  console.log("🧪 Testing JsonPriceStrategy...\n");

  const strategy = new JsonPriceStrategy();

  // Test 1: Shopify-like JSON
  console.log("Test 1: Shopify-like JSON");
  const shopifyJson = {
    product: {
      variants: [
        { id: 1, price: "29.99", priceCurrency: "USD" },
        { id: 2, price: "39.99", priceCurrency: "USD" },
      ],
    },
  };
  const context1 = createTestContext([shopifyJson]);
  const result1 = strategy.extract(context1);

  if (
    result1.price &&
    result1.price.amount &&
    result1.price.amount >= 29.99 &&
    result1.price.currency === "USD"
  ) {
    console.log("✅ Shopify-like JSON extracted correctly");
    console.log(`   Amount: ${result1.price.amount}, Currency: ${result1.price.currency}`);
  } else {
    console.log("❌ Shopify-like JSON extraction failed");
    console.log(`   Result: ${JSON.stringify(result1.price)}`);
  }

  // Test 2: JSON-LD offers
  console.log("\nTest 2: JSON-LD offers");
  const jsonLd = {
    "@type": "Product",
    "@context": "https://schema.org",
    offers: [
      {
        price: "39.99",
        priceCurrency: "USD",
      },
      {
        price: "49.99",
        priceCurrency: "EUR",
      },
    ],
  };
  const context2 = createTestContext([jsonLd]);
  const result2 = strategy.extract(context2);

  if (
    result2.price &&
    result2.price.amount &&
    result2.price.currency
  ) {
    console.log("✅ JSON-LD offers extracted correctly");
    console.log(`   Amount: ${result2.price.amount}, Currency: ${result2.price.currency}`);
  } else {
    console.log("❌ JSON-LD offers extraction failed");
    console.log(`   Result: ${JSON.stringify(result2.price)}`);
  }

  // Test 3: Next.js nested JSON
  console.log("\nTest 3: Next.js nested JSON");
  const nextData = {
    props: {
      pageProps: {
        product: {
          data: {
            product: {
              current_price: 59.99,
              currency_code: "GBP",
            },
          },
        },
      },
    },
  };
  const context3 = createTestContext([nextData]);
  const result3 = strategy.extract(context3);

  if (
    result3.price &&
    result3.price.amount === 59.99 &&
    result3.price.currency === "GBP"
  ) {
    console.log("✅ Next.js nested JSON extracted correctly");
    console.log(`   Amount: ${result3.price.amount}, Currency: ${result3.price.currency}`);
  } else {
    console.log("❌ Next.js nested JSON extraction failed");
    console.log(`   Result: ${JSON.stringify(result3.price)}`);
  }

  // Test 4: Price+Currency combos
  console.log("\nTest 4: Price+Currency combos");
  const priceCurrencyJson = {
    product: {
      price_amount: 79.99,
      price_currency: "EUR",
    },
  };
  const context4 = createTestContext([priceCurrencyJson]);
  const result4 = strategy.extract(context4);

  if (
    result4.price &&
    result4.price.amount === 79.99 &&
    result4.price.currency === "EUR"
  ) {
    console.log("✅ Price+Currency combo extracted correctly");
    console.log(`   Amount: ${result4.price.amount}, Currency: ${result4.price.currency}`);
  } else {
    console.log("❌ Price+Currency combo extraction failed");
    console.log(`   Result: ${JSON.stringify(result4.price)}`);
  }

  // Test 5: Invalid JSON → skip safely
  console.log("\nTest 5: Invalid JSON handling");
  const invalidJson = {
    product: {
      price: "not-a-number",
      invalid_field: "test",
    },
  };
  const context5 = createTestContext([invalidJson]);
  const result5 = strategy.extract(context5);

  if (result5.price === null && result5.notes) {
    console.log("✅ Invalid JSON handled gracefully");
    console.log(`   Notes: ${result5.notes.join(", ")}`);
  } else {
    console.log("❌ Invalid JSON not handled correctly");
  }

  // Test 6: No JSON blobs
  console.log("\nTest 6: No JSON blobs");
  const context6 = createTestContext([]);
  const result6 = strategy.extract(context6);

  if (result6.price === null && result6.notes) {
    console.log("✅ No JSON blobs handled correctly");
    console.log(`   Notes: ${result6.notes.join(", ")}`);
  } else {
    console.log("❌ No JSON blobs not handled correctly");
  }

  // Test 7: Multiple price fields (choose best)
  console.log("\nTest 7: Multiple price fields");
  const multiplePricesJson = {
    product: {
      regular_price: 99.99,
      sale_price: 79.99,
      current_price: 69.99,
      currency: "USD",
    },
  };
  const context7 = createTestContext([multiplePricesJson]);
  const result7 = strategy.extract(context7);

  if (
    result7.price &&
    result7.price.amount &&
    result7.price.currency === "USD"
  ) {
    console.log("✅ Multiple price fields handled correctly");
    console.log(`   Selected: ${result7.price.amount} ${result7.price.currency}`);
  } else {
    console.log("❌ Multiple price fields extraction failed");
    console.log(`   Result: ${JSON.stringify(result7.price)}`);
  }

  console.log("\n✨ JsonPriceStrategy tests completed!");
}

testJsonPriceStrategy().catch(console.error);


