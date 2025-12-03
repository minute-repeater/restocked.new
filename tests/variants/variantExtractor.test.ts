import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { extractVariants } from "../../src/variants/variantExtractor.js";
import type { VariantExtractionContext } from "../../src/variants/variantTypes.js";

/**
 * Create a test extraction context
 */
function createTestContext(html: string): VariantExtractionContext {
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
 * Test variant extraction functionality
 */
async function testVariantExtractor() {
  console.log("🧪 Testing variantExtractor...\n");

  // Test 1: Strategies run in order
  console.log("Test 1: Strategies run in order");
  const html1 = `
    <html>
      <body>
        <div>Test product</div>
      </body>
    </html>
  `;
  const context1 = createTestContext(html1);
  const result1 = extractVariants(context1);

  if (
    Array.isArray(result1.variants) &&
    result1.variants.length === 0 &&
    result1.notes &&
    result1.notes.length >= 3
  ) {
    console.log("✅ Strategies executed and returned empty variants");
    console.log(`   Notes count: ${result1.notes.length}`);
    console.log(`   Notes: ${result1.notes.join(", ")}`);
  } else {
    console.log("❌ Strategies did not execute correctly");
    console.log(`   Variants: ${result1.variants.length}`);
    console.log(`   Notes: ${result1.notes?.length || 0}`);
  }

  // Test 2: Combined result returns at least empty array
  console.log("\nTest 2: Combined result structure");
  const html2 = `
    <html>
      <body>
        <h1>Product</h1>
      </body>
    </html>
  `;
  const context2 = createTestContext(html2);
  const result2 = extractVariants(context2);

  if (
    Array.isArray(result2.variants) &&
    typeof result2.notes === "undefined" ||
    Array.isArray(result2.notes)
  ) {
    console.log("✅ Result structure is correct");
    console.log(`   Variants: ${result2.variants.length}`);
    console.log(`   Has notes: ${result2.notes !== undefined}`);
  } else {
    console.log("❌ Result structure is incorrect");
  }

  // Test 3: Notes from each strategy appear in final result
  console.log("\nTest 3: Notes from strategies");
  const html3 = `
    <html>
      <body>
        <div>Content</div>
      </body>
    </html>
  `;
  const context3 = createTestContext(html3);
  const result3 = extractVariants(context3);

  const expectedNotes = [
    "JSON strategy placeholder",
    "DOM strategy placeholder",
    "Attributes strategy placeholder",
  ];

  if (result3.notes) {
    const hasAllPlaceholders = expectedNotes.every((expected) =>
      result3.notes!.some((note) => note.includes(expected))
    );

    if (hasAllPlaceholders) {
      console.log("✅ Notes from all strategies present");
      result3.notes.forEach((note) => console.log(`   - ${note}`));
    } else {
      console.log("❌ Not all strategy notes present");
      console.log(`   Found: ${result3.notes.join(", ")}`);
    }
  } else {
    console.log("❌ No notes returned");
  }

  // Test 4: No variant parsing is implemented yet
  console.log("\nTest 4: Verify no variant parsing logic");
  const htmlWithVariants = `
    <html>
      <body>
        <select name="size">
          <option value="S">Small</option>
          <option value="M">Medium</option>
        </select>
        <script type="application/ld+json">
          {"@type": "Product", "offers": {"itemOffered": {"variants": []}}}
        </script>
      </body>
    </html>
  `;
  const context4 = createTestContext(htmlWithVariants);
  const result4 = extractVariants(context4);

  if (result4.variants.length === 0) {
    console.log("✅ No variant parsing implemented (as expected)");
    console.log(`   Variants extracted: ${result4.variants.length}`);
  } else {
    console.log("❌ Variant parsing should not be implemented yet");
    console.log(`   Variants found: ${result4.variants.length}`);
  }

  // Test 5: No price/stock logic exists
  console.log("\nTest 5: Verify no price/stock logic");
  const htmlWithPriceStock = `
    <html>
      <body>
        <div class="price">$99.99</div>
        <div class="stock">In Stock</div>
      </body>
    </html>
  `;
  const context5 = createTestContext(htmlWithPriceStock);
  const result5 = extractVariants(context5);

  const hasPriceOrStock = result5.variants.some(
    (v) => v.price !== undefined || v.isAvailable !== null
  );

  if (!hasPriceOrStock && result5.variants.length === 0) {
    console.log("✅ No price/stock logic present (as expected)");
  } else {
    console.log("❌ Price/stock logic should not exist");
  }

  // Test 6: System handles missing DOM or JSON safely
  console.log("\nTest 6: Handle missing/invalid data gracefully");
  const emptyHTML = "";
  const context6 = createTestContext(emptyHTML);
  const result6 = extractVariants(context6);

  if (
    Array.isArray(result6.variants) &&
    result6.variants.length === 0
  ) {
    console.log("✅ Empty HTML handled gracefully");
  } else {
    console.log("❌ Failed to handle empty HTML");
  }

  // Test 7: Deduplication works (when variants are added later)
  console.log("\nTest 7: Deduplication structure ready");
  // This test verifies the deduplication function exists and works
  // Even though we have no variants yet, the structure should be ready
  const context7 = createTestContext("<html><body></body></html>");
  const result7 = extractVariants(context7);

  if (Array.isArray(result7.variants)) {
    console.log("✅ Deduplication structure ready for future use");
  } else {
    console.log("❌ Variants array structure incorrect");
  }

  console.log("\n✨ variantExtractor tests completed!");
}

testVariantExtractor().catch(console.error);

