import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { AttributesVariantStrategy } from "../../src/variants/strategies/attributesStrategy.js";
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
 * Test attribute heuristics variant extraction
 */
async function testAttributesStrategy() {
  console.log("🧪 Testing AttributesVariantStrategy...\n");

  const strategy = new AttributesVariantStrategy();

  // Test 1: Simple size label
  console.log("Test 1: Simple size label");
  const html1 = `
    <html>
      <body>
        <p>Size: M</p>
      </body>
    </html>
  `;
  const context1 = createTestContext(html1);
  const result1 = strategy.extract(context1);

  if (
    result1.variants.length === 1 &&
    result1.variants[0].attributes.length === 1 &&
    result1.variants[0].attributes[0].name === "size" &&
    result1.variants[0].attributes[0].value === "M"
  ) {
    console.log("✅ Simple size label extracted correctly");
    console.log(`   Variants: ${result1.variants.length}`);
    console.log(`   Attributes: ${JSON.stringify(result1.variants[0].attributes)}`);
  } else {
    console.log("❌ Simple size label extraction failed");
    console.log(`   Variants: ${result1.variants.length}`);
    if (result1.variants.length > 0) {
      console.log(`   First variant: ${JSON.stringify(result1.variants[0])}`);
    }
  }

  // Test 2: Multiple attributes
  console.log("\nTest 2: Multiple attributes");
  const html2 = `
    <html>
      <body>
        <p>Color: Red</p>
        <p>Size: L</p>
        <p>Material: Cotton</p>
      </body>
    </html>
  `;
  const context2 = createTestContext(html2);
  const result2 = strategy.extract(context2);

  const expectedCombinations = 1 * 1 * 1; // 1 combination (each has 1 value)
  if (
    result2.variants.length === expectedCombinations &&
    result2.variants[0].attributes.length === 3
  ) {
    console.log("✅ Multiple attributes extracted correctly");
    console.log(`   Variants: ${result2.variants.length}`);
    console.log(`   Attributes per variant: ${result2.variants[0].attributes.length}`);
  } else {
    console.log("❌ Multiple attributes extraction failed");
    console.log(`   Variants: ${result2.variants.length} (expected ${expectedCombinations})`);
  }

  // Test 3: Definition lists
  console.log("\nTest 3: Definition lists");
  const html3 = `
    <html>
      <body>
        <dl>
          <dt>Color</dt>
          <dd>Black</dd>
          <dt>Size</dt>
          <dd>M</dd>
        </dl>
      </body>
    </html>
  `;
  const context3 = createTestContext(html3);
  const result3 = strategy.extract(context3);

  if (
    result3.variants.length > 0 &&
    result3.variants[0].attributes.some((a) => a.name === "color") &&
    result3.variants[0].attributes.some((a) => a.name === "size")
  ) {
    console.log("✅ Definition lists extracted correctly");
    console.log(`   Variants: ${result3.variants.length}`);
    console.log(`   Attributes: ${JSON.stringify(result3.variants[0].attributes)}`);
  } else {
    console.log("❌ Definition lists extraction failed");
    console.log(`   Variants: ${result3.variants.length}`);
  }

  // Test 4: UL lists
  console.log("\nTest 4: UL lists with data attributes");
  const html4 = `
    <html>
      <body>
        <h4>Size</h4>
        <ul class="options">
          <li data-attribute="size">Small</li>
          <li data-attribute="size">Medium</li>
          <li data-attribute="size">Large</li>
        </ul>
      </body>
    </html>
  `;
  const context4 = createTestContext(html4);
  const result4 = strategy.extract(context4);

  if (
    result4.variants.length === 3 &&
    result4.variants.every(
      (v) => v.attributes.length === 1 && v.attributes[0].name === "size"
    )
  ) {
    console.log("✅ UL lists extracted correctly");
    console.log(`   Variants: ${result4.variants.length}`);
  } else {
    console.log("❌ UL lists extraction failed");
    console.log(`   Variants: ${result4.variants.length}`);
  }

  // Test 5: Text-only clusters
  console.log("\nTest 5: Text-only clusters");
  const html5 = `
    <html>
      <body>
        <div class="size-options">
          <span class="option">S</span>
          <span class="option">M</span>
          <span class="option">L</span>
        </div>
      </body>
    </html>
  `;
  const context5 = createTestContext(html5);
  const result5 = strategy.extract(context5);

  if (result5.variants.length >= 1) {
    console.log("✅ Text-only clusters extracted");
    console.log(`   Variants: ${result5.variants.length}`);
  } else {
    console.log("❌ Text-only clusters extraction failed");
    console.log(`   Variants: ${result5.variants.length}`);
  }

  // Test 6: Mixed sources
  console.log("\nTest 6: Mixed sources");
  const html6 = `
    <html>
      <body>
        <p>Size: M</p>
        <dl>
          <dt>Color</dt>
          <dd>Red</dd>
        </dl>
        <ul>
          <li data-attribute="material">Cotton</li>
          <li data-attribute="material">Polyester</li>
        </ul>
      </body>
    </html>
  `;
  const context6 = createTestContext(html6);
  const result6 = strategy.extract(context6);

  const hasSize = result6.variants.some((v) =>
    v.attributes.some((a) => a.name === "size")
  );
  const hasColor = result6.variants.some((v) =>
    v.attributes.some((a) => a.name === "color")
  );
  const hasMaterial = result6.variants.some((v) =>
    v.attributes.some((a) => a.name === "material")
  );

  if (hasSize && hasColor && hasMaterial && result6.variants.length > 0) {
    console.log("✅ Mixed sources extracted correctly");
    console.log(`   Variants: ${result6.variants.length}`);
    console.log(`   Has size: ${hasSize}, color: ${hasColor}, material: ${hasMaterial}`);
  } else {
    console.log("❌ Mixed sources extraction failed");
    console.log(`   Has size: ${hasSize}, color: ${hasColor}, material: ${hasMaterial}`);
  }

  // Test 7: No heuristics
  console.log("\nTest 7: No heuristics");
  const html7 = `
    <html>
      <body>
        <p>This is just regular text with no variant information.</p>
      </body>
    </html>
  `;
  const context7 = createTestContext(html7);
  const result7 = strategy.extract(context7);

  if (
    result7.variants.length === 0 &&
    result7.notes &&
    result7.notes.some((note) => note.includes("No heuristic"))
  ) {
    console.log("✅ No heuristics handled correctly");
    console.log(`   Variants: ${result7.variants.length}`);
    console.log(`   Notes: ${result7.notes.join(", ")}`);
  } else {
    console.log("❌ No heuristics not handled correctly");
    console.log(`   Variants: ${result7.variants.length}`);
  }

  // Test 8: Attribute normalization
  console.log("\nTest 8: Attribute normalization");
  const html8 = `
    <html>
      <body>
        <p>SIZE: M</p>
        <p>Size: L</p>
        <p>size: XL</p>
        <p>SiZe: XXL</p>
      </body>
    </html>
  `;
  const context8 = createTestContext(html8);
  const result8 = strategy.extract(context8);

  const allNormalized = result8.variants.every((v) =>
    v.attributes.every((a) => a.name === "size")
  );

  if (allNormalized && result8.variants.length === 4) {
    console.log("✅ Attribute normalization works correctly");
    console.log(`   Variants: ${result8.variants.length}`);
    console.log(`   All normalized to 'size': ${allNormalized}`);
  } else {
    console.log("❌ Attribute normalization failed");
    console.log(`   Variants: ${result8.variants.length}`);
    const names = result8.variants.flatMap((v) => v.attributes.map((a) => a.name));
    console.log(`   Attribute names: ${[...new Set(names)].join(", ")}`);
  }

  // Test 9: Deduplication
  console.log("\nTest 9: Deduplication");
  const html9 = `
    <html>
      <body>
        <p>Size: M</p>
        <p>Size: M</p>
        <p>Size: M</p>
        <p>Color: Red</p>
        <p>Color: Red</p>
      </body>
    </html>
  `;
  const context9 = createTestContext(html9);
  const result9 = strategy.extract(context9);

  // Should have 1 variant with size=M and color=Red (1 combination)
  if (result9.variants.length === 1) {
    const variant = result9.variants[0];
    const sizeValues = variant.attributes
      .filter((a) => a.name === "size")
      .map((a) => a.value);
    const colorValues = variant.attributes
      .filter((a) => a.name === "color")
      .map((a) => a.value);

    if (
      sizeValues.length === 1 &&
      colorValues.length === 1 &&
      sizeValues[0] === "M" &&
      colorValues[0] === "Red"
    ) {
      console.log("✅ Deduplication works correctly");
      console.log(`   Variants: ${result9.variants.length}`);
      console.log(`   Unique size values: ${sizeValues.length}`);
      console.log(`   Unique color values: ${colorValues.length}`);
    } else {
      console.log("❌ Deduplication failed - wrong values");
    }
  } else {
    console.log("❌ Deduplication failed - wrong variant count");
    console.log(`   Variants: ${result9.variants.length} (expected 1)`);
  }

  // Test 10: Product meta sections
  console.log("\nTest 10: Product meta sections");
  const html10 = `
    <html>
      <body>
        <div class="product-attributes">
          <div class="attribute">
            <span class="label">Material</span>
            <span class="value">Cotton</span>
          </div>
          <div class="attribute">
            <span class="label">Fit</span>
            <span class="value">Regular</span>
          </div>
        </div>
      </body>
    </html>
  `;
  const context10 = createTestContext(html10);
  const result10 = strategy.extract(context10);

  const hasMaterial = result10.variants.some((v) =>
    v.attributes.some((a) => a.name === "material")
  );
  const hasFit = result10.variants.some((v) =>
    v.attributes.some((a) => a.name === "fit")
  );

  if (hasMaterial && hasFit && result10.variants.length > 0) {
    console.log("✅ Product meta sections extracted correctly");
    console.log(`   Variants: ${result10.variants.length}`);
  } else {
    console.log("❌ Product meta sections extraction failed");
    console.log(`   Has material: ${hasMaterial}, fit: ${hasFit}`);
  }

  // Test 11: Notes included
  console.log("\nTest 11: Notes included in result");
  const context11 = createTestContext(html2);
  const result11 = strategy.extract(context11);

  if (
    result11.notes &&
    result11.notes.length > 0 &&
    result11.notes.some((note) =>
      note.includes("attribute") || note.includes("variant") || note.includes("heuristic")
    )
  ) {
    console.log("✅ Notes included correctly");
    result11.notes.forEach((note) => console.log(`   - ${note}`));
  } else {
    console.log("❌ Notes not included or incomplete");
    console.log(`   Notes: ${result11.notes?.join(", ") || "none"}`);
  }

  console.log("\n✨ AttributesVariantStrategy tests completed!");
}

testAttributesStrategy().catch(console.error);


