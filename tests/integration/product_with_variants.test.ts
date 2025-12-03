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
 * Integration test: Product extraction with variants from DOM and JSON
 */
async function testProductWithVariants() {
  console.log("🧪 Testing Product Extraction with Variants Integration...\n");

  // Test HTML with both DOM variants and JSON variants
  const htmlWithVariants = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Product with Variants</title>
        <meta name="description" content="A test product">
      </head>
      <body>
        <h1>Test Product</h1>
        
        <!-- DOM-based variant: size dropdown -->
        <select name="size">
          <option value="S">S</option>
          <option value="M">M</option>
        </select>
        
        <!-- JSON-based variants: JSON-LD schema -->
        <script type="application/ld+json">
        {
          "@type": "Product",
          "@context": "https://schema.org",
          "offers": [
            {
              "sku": "SKU-S-RED",
              "color": "Red",
              "size": "S"
            },
            {
              "sku": "SKU-M-BLUE",
              "color": "Blue",
              "size": "M"
            },
            {
              "sku": "SKU-S-BLUE",
              "color": "Blue",
              "size": "S"
            }
          ]
        }
        </script>
      </body>
    </html>
  `;

  const mockResult = createMockFetchResult(htmlWithVariants);
  const productShell = await extractProductShell(mockResult);

  // Test 1: ProductShell contains variants
  console.log("Test 1: ProductShell contains variants");
  if (productShell.variants && productShell.variants.length > 0) {
    console.log(`✅ Variants extracted: ${productShell.variants.length}`);
  } else {
    console.log("❌ No variants found in ProductShell");
    console.log(`   Variants length: ${productShell.variants.length}`);
    return;
  }

  // Test 2: Variants from both DOM and JSON strategies
  console.log("\nTest 2: Variants from both DOM and JSON strategies");
  const hasSizeAttribute = productShell.variants.some((v) =>
    v.attributes.some((a) => a.name === "size")
  );
  const hasColorAttribute = productShell.variants.some((v) =>
    v.attributes.some((a) => a.name === "color")
  );

  if (hasSizeAttribute && hasColorAttribute) {
    console.log("✅ Variants from both DOM (size) and JSON (color) detected");
    console.log(`   Size variants: ${productShell.variants.filter((v) => v.attributes.some((a) => a.name === "size")).length}`);
    console.log(`   Color variants: ${productShell.variants.filter((v) => v.attributes.some((a) => a.name === "color")).length}`);
  } else {
    console.log("❌ Missing variants from DOM or JSON");
    console.log(`   Has size: ${hasSizeAttribute}`);
    console.log(`   Has color: ${hasColorAttribute}`);
  }

  // Test 3: Variants are deduplicated
  console.log("\nTest 3: Variants are deduplicated");
  const variantSignatures = productShell.variants.map((v) => {
    if (v.id) {
      return `id:${v.id}`;
    }
    return `attrs:${v.attributes.map((a) => `${a.name}:${a.value}`).sort().join("|")}`;
  });
  const uniqueSignatures = new Set(variantSignatures);

  if (variantSignatures.length === uniqueSignatures.size) {
    console.log("✅ Variants are deduplicated correctly");
    console.log(`   Total variants: ${productShell.variants.length}`);
    console.log(`   Unique variants: ${uniqueSignatures.size}`);
  } else {
    console.log("❌ Duplicate variants found");
    console.log(`   Total: ${variantSignatures.length}, Unique: ${uniqueSignatures.size}`);
  }

  // Test 4: Combined attributes (size + color)
  console.log("\nTest 4: Combined attributes (size + color)");
  const variantsWithBothAttributes = productShell.variants.filter(
    (v) =>
      v.attributes.some((a) => a.name === "size") &&
      v.attributes.some((a) => a.name === "color")
  );

  if (variantsWithBothAttributes.length > 0) {
    console.log("✅ Variants with combined attributes found");
    console.log(`   Variants with size+color: ${variantsWithBothAttributes.length}`);
    console.log(`   Sample variant: ${JSON.stringify(variantsWithBothAttributes[0].attributes)}`);
  } else {
    console.log("❌ No variants with combined attributes");
  }

  // Test 5: ProductShell.variants.length > 0
  console.log("\nTest 5: ProductShell.variants.length > 0");
  if (productShell.variants.length > 0) {
    console.log(`✅ ProductShell contains ${productShell.variants.length} variant(s)`);
  } else {
    console.log("❌ ProductShell.variants is empty");
  }

  // Test 6: Notes contain messages from variant extraction
  console.log("\nTest 6: Notes contain variant extraction messages");
  if (
    productShell.notes &&
    productShell.notes.length > 0 &&
    productShell.notes.some(
      (note) =>
        note.includes("variant") ||
        note.includes("JSON") ||
        note.includes("DOM") ||
        note.includes("dropdown") ||
        note.includes("strategy")
    )
  ) {
    console.log("✅ Notes contain variant extraction messages");
    productShell.notes.forEach((note) => {
      if (
        note.includes("variant") ||
        note.includes("JSON") ||
        note.includes("DOM") ||
        note.includes("dropdown") ||
        note.includes("strategy")
      ) {
        console.log(`   - ${note}`);
      }
    });
  } else {
    console.log("❌ Notes do not contain variant extraction messages");
    console.log(`   Notes: ${productShell.notes?.join(", ") || "none"}`);
  }

  // Test 7: Integration does not crash or return null data
  console.log("\nTest 7: Integration stability");
  if (
    productShell.variants !== null &&
    productShell.variants !== undefined &&
    Array.isArray(productShell.variants) &&
    productShell.title !== undefined &&
    productShell.url !== undefined
  ) {
    console.log("✅ Integration is stable - no null/undefined data");
    console.log(`   Variants type: ${Array.isArray(productShell.variants) ? "array" : typeof productShell.variants}`);
    console.log(`   Title: ${productShell.title || "null"}`);
    console.log(`   URL: ${productShell.url}`);
  } else {
    console.log("❌ Integration returned null/undefined data");
  }

  // Test 8: Variant structure is correct
  console.log("\nTest 8: Variant structure validation");
  const firstVariant = productShell.variants[0];
  if (
    firstVariant &&
    Array.isArray(firstVariant.attributes) &&
    firstVariant.attributes.length > 0 &&
    firstVariant.attributes.every(
      (a) => typeof a.name === "string" && typeof a.value === "string"
    ) &&
    (firstVariant.id === null || typeof firstVariant.id === "string") &&
    firstVariant.isAvailable === null &&
    (firstVariant.price === null || typeof firstVariant.price === "number")
  ) {
    console.log("✅ Variant structure is correct");
    console.log(`   Sample variant: ${JSON.stringify(firstVariant, null, 2)}`);
  } else {
    console.log("❌ Variant structure is incorrect");
    console.log(`   First variant: ${JSON.stringify(firstVariant)}`);
  }

  // Test 9: Empty HTML handling
  console.log("\nTest 9: Empty HTML handling");
  const emptyHtmlResult = createMockFetchResult("");
  const emptyProductShell = await extractProductShell(emptyHtmlResult);

  if (
    Array.isArray(emptyProductShell.variants) &&
    emptyProductShell.variants.length === 0 &&
    emptyProductShell.notes &&
    emptyProductShell.notes.some((note) => note.includes("HTML") || note.includes("empty"))
  ) {
    console.log("✅ Empty HTML handled gracefully");
    console.log(`   Variants: ${emptyProductShell.variants.length}`);
    console.log(`   Notes: ${emptyProductShell.notes.join(", ")}`);
  } else {
    console.log("❌ Empty HTML not handled correctly");
  }

  console.log("\n✨ Product with Variants Integration tests completed!");
}

testProductWithVariants().catch(console.error);


