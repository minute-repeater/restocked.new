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
 * Integration test: Product extraction with stock from JSON-LD + DOM + Button
 */
async function testProductWithStock() {
  console.log("🧪 Testing Product Extraction with Stock Integration...\n");

  // Test 1: JSON-LD + DOM + Button (JSON should win)
  console.log("Test 1: JSON-LD + DOM + Button (JSON priority)");
  const htmlWithAllStockIndicators = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Product with Stock</title>
        <meta name="description" content="A test product">
      </head>
      <body>
        <h1>Test Product</h1>
        
        <!-- JSON-LD availability (should win) -->
        <script type="application/ld+json">
        {
          "@type": "Product",
          "@context": "https://schema.org",
          "offers": {
            "availability": "https://schema.org/OutOfStock",
            "price": "29.99",
            "priceCurrency": "USD"
          }
        }
        </script>
        
        <!-- DOM text stock indicator -->
        <div class="stock-status">Out of Stock</div>
        
        <!-- Button state -->
        <button class="add-to-cart" disabled>Sold Out</button>
      </body>
    </html>
  `;

  const mockResult1 = createMockFetchResult(htmlWithAllStockIndicators);
  const productShell1 = await extractProductShell(mockResult1);

  if (
    productShell1.stock &&
    productShell1.stock.status === "out_of_stock" &&
    productShell1.stock.metadata &&
    productShell1.stock.metadata.source === "json"
  ) {
    console.log("✅ JSON stock status correctly wins over DOM/Button");
    console.log(`   Status: ${productShell1.stock.status}`);
    console.log(`   Source: ${productShell1.stock.metadata.source}`);
    console.log(`   Raw: ${productShell1.stock.raw}`);
  } else {
    console.log("❌ JSON stock status did not win");
    console.log(`   Stock: ${JSON.stringify(productShell1.stock)}`);
  }

  // Test 2: Button-only in-stock
  console.log("\nTest 2: Button-only in-stock");
  const htmlWithButtonOnly = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Product</title>
      </head>
      <body>
        <h1>Test Product</h1>
        <button class="add-to-cart">Add to Cart</button>
      </body>
    </html>
  `;

  const mockResult2 = createMockFetchResult(htmlWithButtonOnly);
  const productShell2 = await extractProductShell(mockResult2);

  if (
    productShell2.stock &&
    productShell2.stock.status === "in_stock" &&
    productShell2.stock.metadata &&
    (productShell2.stock.metadata.source === "button" || productShell2.stock.metadata.source === "dom")
  ) {
    console.log("✅ Button-only in-stock detected correctly");
    console.log(`   Status: ${productShell2.stock.status}`);
    console.log(`   Source: ${productShell2.stock.metadata.source}`);
    console.log(`   Raw: ${productShell2.stock.raw}`);
  } else {
    console.log("❌ Button-only in-stock detection failed");
    console.log(`   Stock: ${JSON.stringify(productShell2.stock)}`);
  }

  // Test 3: No stock info
  console.log("\nTest 3: No stock info");
  const htmlNoStock = `
    <html>
      <body>
        <h1>Product</h1>
        <p>No stock information available</p>
      </body>
    </html>
  `;
  const mockResult3 = createMockFetchResult(htmlNoStock);
  const productShell3 = await extractProductShell(mockResult3);

  if (
    productShell3.stock === null &&
    productShell3.notes &&
    productShell3.notes.some(
      (note) =>
        note.toLowerCase().includes("stock") ||
        note.toLowerCase().includes("no stock") ||
        note.toLowerCase().includes("availability")
    )
  ) {
    console.log("✅ No stock info handled correctly");
    console.log(`   Stock: ${productShell3.stock}`);
    const stockNotes = productShell3.notes.filter((note) =>
      note.toLowerCase().includes("stock")
    );
    console.log(`   Stock-related notes: ${stockNotes.join(", ")}`);
  } else {
    console.log("❌ No stock info not handled correctly");
    console.log(`   Stock: ${productShell3.stock}`);
    console.log(`   Notes: ${productShell3.notes?.join(", ") || "none"}`);
  }

  // Test 4: Stock structure validation
  console.log("\nTest 4: Stock structure validation");
  if (
    productShell1.stock &&
    typeof productShell1.stock.status === "string" &&
    (productShell1.stock.raw === null || typeof productShell1.stock.raw === "string")
  ) {
    console.log("✅ Stock structure is correct");
    console.log(`   StockShell: ${JSON.stringify(productShell1.stock, null, 2)}`);
  } else {
    console.log("❌ Stock structure is incorrect");
    console.log(`   Stock: ${JSON.stringify(productShell1.stock)}`);
  }

  // Test 5: Notes contain stock extraction messages
  console.log("\nTest 5: Notes contain stock extraction messages");
  if (
    productShell1.notes &&
    productShell1.notes.length > 0 &&
    productShell1.notes.some(
      (note) =>
        note.includes("stock") ||
        note.includes("Stock") ||
        note.includes("json-stock-strategy") ||
        note.includes("dom-stock-strategy") ||
        note.includes("button-stock-strategy") ||
        note.includes("extracted using")
    )
  ) {
    console.log("✅ Notes contain stock extraction messages");
    productShell1.notes.forEach((note) => {
      if (
        note.toLowerCase().includes("stock") ||
        note.includes("strategy") ||
        note.includes("extracted")
      ) {
        console.log(`   - ${note}`);
      }
    });
  } else {
    console.log("❌ Notes do not contain stock extraction messages");
    console.log(`   Notes: ${productShell1.notes?.join(", ") || "none"}`);
  }

  // Test 6: Integration stability
  console.log("\nTest 6: Integration stability");
  if (
    productShell1.stock !== undefined &&
    productShell1.pricing !== undefined &&
    productShell1.variants !== undefined &&
    productShell1.title !== undefined &&
    productShell1.url !== undefined
  ) {
    console.log("✅ Integration is stable - no undefined data");
    console.log(`   Has stock: ${productShell1.stock !== null}`);
    console.log(`   Has pricing: ${productShell1.pricing !== null}`);
    console.log(`   Has variants: ${Array.isArray(productShell1.variants)}`);
  } else {
    console.log("❌ Integration returned undefined data");
    console.log(`   Stock: ${productShell1.stock}`);
    console.log(`   Pricing: ${productShell1.pricing}`);
    console.log(`   Variants: ${productShell1.variants}`);
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

  if (
    productShell1.stock &&
    validStatuses.includes(productShell1.stock.status)
  ) {
    console.log("✅ Status value is valid");
    console.log(`   Status: ${productShell1.stock.status}`);
  } else {
    console.log("❌ Status value is invalid");
    console.log(`   Status: ${productShell1.stock?.status}`);
  }

  // Test 8: DOM-only stock detection
  console.log("\nTest 8: DOM-only stock detection");
  const htmlDomOnly = `
    <html>
      <body>
        <h1>Product</h1>
        <div class="availability">In Stock</div>
      </body>
    </html>
  `;
  const mockResult8 = createMockFetchResult(htmlDomOnly);
  const productShell8 = await extractProductShell(mockResult8);

  if (
    productShell8.stock &&
    productShell8.stock.status === "in_stock" &&
    productShell8.stock.metadata &&
    productShell8.stock.metadata.source === "dom"
  ) {
    console.log("✅ DOM-only stock detection works correctly");
    console.log(`   Status: ${productShell8.stock.status}`);
    console.log(`   Source: ${productShell8.stock.metadata.source}`);
  } else {
    console.log("❌ DOM-only stock detection failed");
    console.log(`   Stock: ${JSON.stringify(productShell8.stock)}`);
  }

  console.log("\n✨ Product with Stock Integration tests completed!");
}

testProductWithStock().catch(console.error);


