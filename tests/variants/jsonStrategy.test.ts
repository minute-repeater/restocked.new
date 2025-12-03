import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { JsonVariantStrategy } from "../../src/variants/strategies/jsonStrategy.js";
import type { VariantExtractionContext } from "../../src/variants/variantTypes.js";

/**
 * Create a test extraction context with custom JSON blobs
 */
function createTestContext(jsonBlobs: any[]): VariantExtractionContext {
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
 * Test JSON-based variant extraction
 */
async function testJsonStrategy() {
  console.log("🧪 Testing JsonVariantStrategy...\n");

  const strategy = new JsonVariantStrategy();

  // Test 1: Shopify-like JSON
  console.log("Test 1: Shopify-like JSON");
  const shopifyJson = {
    product: {
      variants: [
        { id: 1, title: "Black / M", size: "M", color: "Black" },
        { id: 2, title: "Black / L", size: "L", color: "Black" },
        { id: 3, title: "Navy / M", size: "M", color: "Navy" },
      ],
    },
  };
  const context1 = createTestContext([shopifyJson]);
  const result1 = strategy.extract(context1);

  if (
    result1.variants.length === 3 &&
    result1.variants.every(
      (v) => v.id !== null && v.attributes.length >= 2
    ) &&
    result1.variants[0].attributes.some((a) => a.name === "size") &&
    result1.variants[0].attributes.some((a) => a.name === "color")
  ) {
    console.log("✅ Shopify-like JSON extracted correctly");
    console.log(`   Variants: ${result1.variants.length}`);
    console.log(`   First variant ID: ${result1.variants[0].id}`);
    console.log(`   First variant attributes: ${JSON.stringify(result1.variants[0].attributes)}`);
  } else {
    console.log("❌ Shopify-like JSON extraction failed");
    console.log(`   Variants: ${result1.variants.length}`);
    if (result1.variants.length > 0) {
      console.log(`   First variant: ${JSON.stringify(result1.variants[0])}`);
    }
  }

  // Test 2: JSON-LD schema
  console.log("\nTest 2: JSON-LD schema");
  const jsonLd = {
    "@type": "Product",
    "@context": "https://schema.org",
    offers: [
      {
        sku: "A1",
        color: "Red",
        size: "32",
      },
      {
        sku: "A2",
        color: "Blue",
        size: "32",
      },
    ],
  };
  const context2 = createTestContext([jsonLd]);
  const result2 = strategy.extract(context2);

  if (
    result2.variants.length >= 2 &&
    result2.variants.every(
      (v) => v.id !== null && v.attributes.length >= 2
    )
  ) {
    console.log("✅ JSON-LD schema extracted correctly");
    console.log(`   Variants: ${result2.variants.length}`);
    console.log(`   First variant SKU: ${result2.variants[0].id}`);
  } else {
    console.log("❌ JSON-LD schema extraction failed");
    console.log(`   Variants: ${result2.variants.length}`);
  }

  // Test 3: Next.js NEXT_DATA (deeply nested)
  console.log("\nTest 3: Next.js NEXT_DATA (deeply nested)");
  const nextData = {
    props: {
      pageProps: {
        product: {
          data: {
            product: {
              variants: [
                { id: "v1", size: "S", color: "Black", material: "Cotton" },
                { id: "v2", size: "M", color: "Black", material: "Cotton" },
                { id: "v3", size: "S", color: "White", material: "Polyester" },
              ],
            },
          },
        },
      },
    },
  };
  const context3 = createTestContext([nextData]);
  const result3 = strategy.extract(context3);

  if (
    result3.variants.length === 3 &&
    result3.variants.every((v) => v.id !== null && v.attributes.length >= 3)
  ) {
    console.log("✅ Next.js NEXT_DATA extracted correctly");
    console.log(`   Variants: ${result3.variants.length}`);
    console.log(`   First variant attributes: ${result3.variants[0].attributes.length}`);
  } else {
    console.log("❌ Next.js NEXT_DATA extraction failed");
    console.log(`   Variants: ${result3.variants.length}`);
  }

  // Test 4: Non-variant JSON
  console.log("\nTest 4: Non-variant JSON");
  const nonVariantJson = {
    page: {
      title: "Product Page",
      description: "A product",
    },
    user: {
      name: "John",
      email: "john@example.com",
    },
  };
  const context4 = createTestContext([nonVariantJson]);
  const result4 = strategy.extract(context4);

  if (result4.variants.length === 0) {
    console.log("✅ Non-variant JSON handled correctly");
    console.log(`   Variants: ${result4.variants.length}`);
  } else {
    console.log("❌ Non-variant JSON should return empty array");
    console.log(`   Variants: ${result4.variants.length}`);
  }

  // Test 5: Mixed JSON sources
  console.log("\nTest 5: Mixed JSON sources");
  const source1 = {
    product: {
      variants: [{ id: 1, size: "M", color: "Black" }],
    },
  };
  const source2 = {
    data: {
      options: [
        { sku: "A1", size: "L", color: "White" },
        { sku: "A2", size: "XL", color: "White" },
      ],
    },
  };
  const context5 = createTestContext([source1, source2]);
  const result5 = strategy.extract(context5);

  if (result5.variants.length >= 3) {
    console.log("✅ Mixed JSON sources combined correctly");
    console.log(`   Variants: ${result5.variants.length}`);
    console.log(`   Notes: ${result5.notes?.length || 0}`);
  } else {
    console.log("❌ Mixed JSON sources combination failed");
    console.log(`   Variants: ${result5.variants.length} (expected at least 3)`);
  }

  // Test 6: Deduplication
  console.log("\nTest 6: Deduplication");
  const duplicateJson = {
    variants: [
      { id: 1, size: "M", color: "Black" },
      { id: 2, size: "M", color: "Black" }, // Duplicate attributes
      { id: 3, size: "L", color: "Black" },
    ],
  };
  const context6 = createTestContext([duplicateJson]);
  const result6 = strategy.extract(context6);

  // Check for duplicates by comparing attribute sets
  const attributeSignatures = result6.variants.map((v) =>
    v.attributes
      .map((a) => `${a.name}:${a.value}`)
      .sort()
      .join("|")
  );
  const uniqueSignatures = new Set(attributeSignatures);

  if (uniqueSignatures.size === attributeSignatures.length) {
    console.log("✅ Deduplication works correctly");
    console.log(`   Variants: ${result6.variants.length}`);
    console.log(`   Unique attribute sets: ${uniqueSignatures.size}`);
  } else {
    console.log("❌ Deduplication failed");
    console.log(`   Variants: ${result6.variants.length}`);
    console.log(`   Unique signatures: ${uniqueSignatures.size}`);
  }

  // Test 7: Attribute extraction rules
  console.log("\nTest 7: Attribute extraction rules");
  const attributeTestJson = {
    variants: [
      {
        id: 1,
        size: "M",
        color: "Black",
        price: 99.99, // Should be excluded
        availability: true, // Should be excluded
        material: "Cotton",
        length: "32",
      },
    ],
  };
  const context7 = createTestContext([attributeTestJson]);
  const result7 = strategy.extract(context7);

  const firstVariant = result7.variants[0];
  const attributeNames = firstVariant.attributes.map((a) => a.name);
  const hasExcluded = attributeNames.some(
    (name) => name === "price" || name === "availability"
  );
  const hasAttributes = attributeNames.some(
    (name) => name === "size" || name === "color" || name === "material"
  );

  if (!hasExcluded && hasAttributes && firstVariant.attributes.length >= 3) {
    console.log("✅ Attribute extraction rules applied correctly");
    console.log(`   Attributes: ${attributeNames.join(", ")}`);
    console.log(`   Excluded keys not present: ${!hasExcluded}`);
  } else {
    console.log("❌ Attribute extraction rules failed");
    console.log(`   Attributes: ${attributeNames.join(", ")}`);
    console.log(`   Has excluded: ${hasExcluded}`);
  }

  // Test 8: Nested variant structures
  console.log("\nTest 8: Nested variant structures");
  const nestedJson = {
    data: {
      product: {
        options: {
          choices: [
            { variant_id: "v1", size: "S", color: "Red" },
            { variant_id: "v2", size: "M", color: "Red" },
          ],
        },
      },
    },
  };
  const context8 = createTestContext([nestedJson]);
  const result8 = strategy.extract(context8);

  if (
    result8.variants.length === 2 &&
    result8.variants.every((v) => v.id !== null && v.attributes.length >= 2)
  ) {
    console.log("✅ Nested variant structures extracted correctly");
    console.log(`   Variants: ${result8.variants.length}`);
  } else {
    console.log("❌ Nested variant structures extraction failed");
    console.log(`   Variants: ${result8.variants.length}`);
  }

  // Test 9: Notes included
  console.log("\nTest 9: Notes included in result");
  const context9 = createTestContext([shopifyJson]);
  const result9 = strategy.extract(context9);

  if (
    result9.notes &&
    result9.notes.length > 0 &&
    result9.notes.some((note) =>
      note.includes("JSON") || note.includes("variant")
    )
  ) {
    console.log("✅ Notes included correctly");
    result9.notes.forEach((note) => console.log(`   - ${note}`));
  } else {
    console.log("❌ Notes not included or incomplete");
    console.log(`   Notes: ${result9.notes?.join(", ") || "none"}`);
  }

  // Test 10: Empty JSON blobs
  console.log("\nTest 10: Empty JSON blobs");
  const context10 = createTestContext([]);
  const result10 = strategy.extract(context10);

  if (result10.variants.length === 0 && result10.notes) {
    console.log("✅ Empty JSON blobs handled correctly");
    console.log(`   Notes: ${result10.notes.join(", ")}`);
  } else {
    console.log("❌ Empty JSON blobs not handled correctly");
  }

  console.log("\n✨ JsonVariantStrategy tests completed!");
}

testJsonStrategy().catch(console.error);

