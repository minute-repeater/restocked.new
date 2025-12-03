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
 * Test product extraction functionality
 */
async function testProductExtractor() {
  console.log("🧪 Testing productExtractor...\n");

  // Test 1: Extract ProductShell from simple HTML
  console.log("Test 1: Extract ProductShell from simple HTML");
  const simpleHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Product Title</title>
        <meta name="description" content="This is a test product description">
        <meta property="og:title" content="OG Test Product Title">
        <meta property="og:image" content="https://example.com/image.jpg">
      </head>
      <body>
        <h1>Test Product Title</h1>
        <img src="https://example.com/product1.jpg" alt="Product 1">
        <img src="https://example.com/product2.jpg" alt="Product 2">
      </body>
    </html>
  `;

  const mockResult1 = createMockFetchResult(simpleHTML);
  const productShell1 = await extractProductShell(mockResult1);

  if (
    productShell1.title &&
    productShell1.title.includes("Test Product") &&
    productShell1.description &&
    productShell1.description.includes("test product description") &&
    productShell1.images.length >= 1 &&
    productShell1.variants.length === 0 &&
    productShell1.pricing === null &&
    productShell1.stock === null
  ) {
    console.log("✅ ProductShell extracted correctly");
    console.log(`   Title: ${productShell1.title}`);
    console.log(`   Description: ${productShell1.description?.substring(0, 50)}...`);
    console.log(`   Images: ${productShell1.images.length}`);
    console.log(`   Variants: ${productShell1.variants.length} (empty shell)`);
    console.log(`   Pricing: ${productShell1.pricing === null ? "null (empty shell)" : "error"}`);
    console.log(`   Stock: ${productShell1.stock === null ? "null (empty shell)" : "error"}`);
  } else {
    console.log("❌ Failed to extract ProductShell correctly");
    console.log(`   Title: ${productShell1.title}`);
    console.log(`   Description: ${productShell1.description}`);
    console.log(`   Images: ${productShell1.images.length}`);
  }

  // Test 2: Extract with minimal HTML
  console.log("\nTest 2: Extract from minimal/broken HTML");
  const minimalHTML = "<html><body><p>Minimal</p></body></html>";
  const mockResult2 = createMockFetchResult(minimalHTML);
  const productShell2 = await extractProductShell(mockResult2);

  if (
    productShell2.title !== null &&
    productShell2.variants.length === 0 &&
    productShell2.pricing === null &&
    productShell2.stock === null
  ) {
    console.log("✅ Minimal HTML handled gracefully");
    console.log(`   Title: ${productShell2.title || "null"}`);
    console.log(`   Description: ${productShell2.description || "null"}`);
    console.log(`   Images: ${productShell2.images.length}`);
  } else {
    console.log("❌ Failed to handle minimal HTML");
  }

  // Test 3: Verify metadata flags
  console.log("\nTest 3: Verify metadata flags");
  const dynamicHTML = `
    <html>
      <head>
        <script>__NEXT_DATA__ = {}</script>
      </head>
      <body>
        <div id="root"></div>
        <script src="app.js"></script>
      </body>
    </html>
  `;
  const mockResult3 = createMockFetchResult(dynamicHTML);
  const productShell3 = await extractProductShell(mockResult3);

  if (
    typeof productShell3.metadata.isLikelyDynamic === "boolean" &&
    Array.isArray(productShell3.metadata.dynamicIndicators) &&
    typeof productShell3.metadata.jsonBlobsCount === "number"
  ) {
    console.log("✅ Metadata flags returned correctly");
    console.log(`   Is Dynamic: ${productShell3.metadata.isLikelyDynamic}`);
    console.log(`   Indicators: ${productShell3.metadata.dynamicIndicators.length}`);
    console.log(`   JSON Blobs: ${productShell3.metadata.jsonBlobsCount}`);
  } else {
    console.log("❌ Metadata flags not returned correctly");
  }

  // Test 4: Verify no variant/price/stock logic exists
  console.log("\nTest 4: Verify no variant/price/stock logic");
  const htmlWithPriceStock = `
    <html>
      <body>
        <div class="price">$99.99</div>
        <div class="stock">In Stock</div>
        <select name="size">
          <option>Small</option>
          <option>Large</option>
        </select>
      </body>
    </html>
  `;
  const mockResult4 = createMockFetchResult(htmlWithPriceStock);
  const productShell4 = await extractProductShell(mockResult4);

  if (
    productShell4.variants.length === 0 &&
    productShell4.pricing === null &&
    productShell4.stock === null
  ) {
    console.log("✅ No variant/price/stock logic present (as expected)");
    console.log(`   Variants: ${productShell4.variants.length} (empty)`);
    console.log(`   Pricing: ${productShell4.pricing === null ? "null" : "error"}`);
    console.log(`   Stock: ${productShell4.stock === null ? "null" : "error"}`);
  } else {
    console.log("❌ Variant/price/stock logic should not be present");
  }

  // Test 5: Image extraction and deduplication
  console.log("\nTest 5: Image extraction and deduplication");
  const htmlWithImages = `
    <html>
      <head>
        <meta property="og:image" content="https://example.com/og.jpg">
      </head>
      <body>
        <img src="https://example.com/img1.jpg">
        <img src="https://example.com/img2.jpg">
        <img src="https://example.com/og.jpg">
        <img src="https://example.com/img3.jpg">
      </body>
    </html>
  `;
  const mockResult5 = createMockFetchResult(htmlWithImages);
  const productShell5 = await extractProductShell(mockResult5);

  const uniqueImages = new Set(productShell5.images);
  if (
    productShell5.images.length > 0 &&
    productShell5.images.length <= 10 &&
    uniqueImages.size === productShell5.images.length
  ) {
    console.log("✅ Images extracted and deduplicated correctly");
    console.log(`   Total images: ${productShell5.images.length}`);
    console.log(`   Unique images: ${uniqueImages.size}`);
  } else {
    console.log("❌ Image extraction failed");
    console.log(`   Images: ${productShell5.images.join(", ")}`);
  }

  console.log("\n✨ productExtractor tests completed!");
}

testProductExtractor().catch(console.error);

