import { fetchProductPage } from "../../src/fetcher/index.js";
import { extractProductShell } from "../../src/extractor/productExtractor.js";
import type { FetchResult } from "../../src/fetcher/types.js";

/**
 * Create a mock FetchResult for testing
 */
function createMockFetchResult(html: string): FetchResult {
  return {
    success: true,
    modeUsed: "http",
    originalURL: "https://example.com/product",
    finalURL: "https://example.com/product",
    statusCode: 200,
    rawHTML: html,
    renderedHTML: null,
    fetchedAt: new Date().toISOString(),
    metadata: {
      redirects: [],
      headers: {},
      timing: {
        httpMs: 100,
      },
    },
  };
}

/**
 * Integration test: Product extraction with price from DOM and JSON
 */
async function testProductWithPrice() {
  console.log("🧪 Testing Product Extraction with Price Integration...\n");

  // Test 1: JSON price should win over DOM price (priority test)
  console.log("Test 1: JSON price wins over DOM price");
  const htmlWithBothPrices = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Product with Price</title>
        <meta name="description" content="A test product">
      </head>
      <body>
        <h1>Test Product</h1>
        
        <!-- DOM-based price -->
        <div class="product-price">$39.99</div>
        
        <!-- JSON-based price (should win) -->
        <script type="application/ld+json">
        {
          "@type": "Product",
          "@context": "https://schema.org",
          "offers": {
            "price": "29.99",
            "priceCurrency": "USD"
          }
        }
        </script>
      </body>
    </html>
  `;

  const mockResult1 = createMockFetchResult(htmlWithBothPrices);
  const productShell1 = await extractProductShell(mockResult1);

  if (
    productShell1.pricing &&
    productShell1.pricing.amount === 29.99 &&
    productShell1.pricing.currency === "USD"
  ) {
    console.log("✅ JSON price correctly wins over DOM price");
    console.log(`   Price: ${productShell1.pricing.amount} ${productShell1.pricing.currency}`);
    console.log(`   Raw: ${productShell1.pricing.raw}`);
  } else {
    console.log("❌ JSON price did not win over DOM price");
    console.log(`   Pricing: ${JSON.stringify(productShell1.pricing)}`);
  }

  // Test 2: DOM-only price extraction
  console.log("\nTest 2: DOM-only price extraction");
  const htmlWithDomPrice = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Product</title>
      </head>
      <body>
        <h1>Test Product</h1>
        <div class="current-price">$49.99</div>
      </body>
    </html>
  `;

  const mockResult2 = createMockFetchResult(htmlWithDomPrice);
  const productShell2 = await extractProductShell(mockResult2);

  if (
    productShell2.pricing &&
    productShell2.pricing.amount === 49.99 &&
    productShell2.pricing.currency === "USD"
  ) {
    console.log("✅ DOM price extracted correctly");
    console.log(`   Price: ${productShell2.pricing.amount} ${productShell2.pricing.currency}`);
    console.log(`   Raw: ${productShell2.pricing.raw}`);
  } else {
    console.log("❌ DOM price extraction failed");
    console.log(`   Pricing: ${JSON.stringify(productShell2.pricing)}`);
  }

  // Test 3: Price structure validation
  console.log("\nTest 3: Price structure validation");
  if (
    productShell1.pricing &&
    typeof productShell1.pricing.amount === "number" &&
    (productShell1.pricing.currency === null || typeof productShell1.pricing.currency === "string") &&
    typeof productShell1.pricing.raw === "string"
  ) {
    console.log("✅ Price structure is correct");
    console.log(`   PriceShell: ${JSON.stringify(productShell1.pricing, null, 2)}`);
  } else {
    console.log("❌ Price structure is incorrect");
    console.log(`   Pricing: ${JSON.stringify(productShell1.pricing)}`);
  }

  // Test 4: Currency detection
  console.log("\nTest 4: Currency detection");
  const htmlWithEuroPrice = `
    <html>
      <body>
        <div class="price">€79.99</div>
      </body>
    </html>
  `;
  const mockResult4 = createMockFetchResult(htmlWithEuroPrice);
  const productShell4 = await extractProductShell(mockResult4);

  if (
    productShell4.pricing &&
    productShell4.pricing.currency === "EUR" &&
    productShell4.pricing.amount === 79.99
  ) {
    console.log("✅ Currency detection works correctly");
    console.log(`   Currency: ${productShell4.pricing.currency}, Amount: ${productShell4.pricing.amount}`);
  } else {
    console.log("❌ Currency detection failed");
    console.log(`   Pricing: ${JSON.stringify(productShell4.pricing)}`);
  }

  // Test 5: Notes contain price extraction messages
  console.log("\nTest 5: Notes contain price extraction messages");
  if (
    productShell1.notes &&
    productShell1.notes.length > 0 &&
    productShell1.notes.some(
      (note) =>
        note.includes("price") ||
        note.includes("Price") ||
        note.includes("json-price-strategy") ||
        note.includes("dom-price-strategy") ||
        note.includes("extracted using")
    )
  ) {
    console.log("✅ Notes contain price extraction messages");
    productShell1.notes.forEach((note) => {
      if (
        note.includes("price") ||
        note.includes("Price") ||
        note.includes("strategy") ||
        note.includes("extracted")
      ) {
        console.log(`   - ${note}`);
      }
    });
  } else {
    console.log("❌ Notes do not contain price extraction messages");
    console.log(`   Notes: ${productShell1.notes?.join(", ") || "none"}`);
  }

  // Test 6: No price handling
  console.log("\nTest 6: No price handling");
  const htmlNoPrice = `
    <html>
      <body>
        <h1>Product</h1>
        <p>No price information available</p>
      </body>
    </html>
  `;
  const mockResult6 = createMockFetchResult(htmlNoPrice);
  const productShell6 = await extractProductShell(mockResult6);

  if (
    productShell6.pricing === null &&
    productShell6.notes &&
    productShell6.notes.some(
      (note) =>
        note.includes("No price") ||
        note.includes("no price") ||
        note.includes("price") ||
        note.includes("Price")
    )
  ) {
    console.log("✅ No price handled correctly");
    console.log(`   Pricing: ${productShell6.pricing}`);
    const priceNotes = productShell6.notes.filter((note) =>
      note.toLowerCase().includes("price")
    );
    console.log(`   Price-related notes: ${priceNotes.join(", ")}`);
  } else {
    console.log("❌ No price not handled correctly");
    console.log(`   Pricing: ${productShell6.pricing}`);
    console.log(`   Notes: ${productShell6.notes?.join(", ") || "none"}`);
  }

  // Test 7: Integration stability
  console.log("\nTest 7: Integration stability");
  if (
    productShell1.pricing !== undefined &&
    productShell1.pricing !== null &&
    productShell1.title !== undefined &&
    productShell1.url !== undefined &&
    Array.isArray(productShell1.variants)
  ) {
    console.log("✅ Integration is stable - no null/undefined data");
    console.log(`   Has pricing: ${productShell1.pricing !== null}`);
    console.log(`   Has title: ${productShell1.title !== null}`);
    console.log(`   Has variants: ${Array.isArray(productShell1.variants)}`);
  } else {
    console.log("❌ Integration returned unexpected data");
    console.log(`   Pricing: ${productShell1.pricing}`);
    console.log(`   Title: ${productShell1.title}`);
    console.log(`   Variants: ${Array.isArray(productShell1.variants)}`);
  }

  // Test 8: Raw price string preservation
  console.log("\nTest 8: Raw price string preservation");
  if (
    productShell1.pricing &&
    productShell1.pricing.raw &&
    typeof productShell1.pricing.raw === "string" &&
    productShell1.pricing.raw.length > 0
  ) {
    console.log("✅ Raw price string preserved");
    console.log(`   Raw: "${productShell1.pricing.raw}"`);
    console.log(`   Amount: ${productShell1.pricing.amount}`);
  } else {
    console.log("❌ Raw price string not preserved");
    console.log(`   Raw: ${productShell1.pricing?.raw}`);
  }

  console.log("\n✨ Product with Price Integration tests completed!");
}

testProductWithPrice().catch(console.error);


