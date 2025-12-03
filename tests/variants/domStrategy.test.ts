import { loadDom } from "../../src/parser/loadDom.js";
import { extractEmbeddedJson } from "../../src/parser/jsonExtraction.js";
import { DomVariantStrategy } from "../../src/variants/strategies/domStrategy.js";
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
 * Test DOM-based variant extraction
 */
async function testDomStrategy() {
  console.log("🧪 Testing DomVariantStrategy...\n");

  const strategy = new DomVariantStrategy();

  // Test 1: Single dropdown
  console.log("Test 1: Single dropdown");
  const html1 = `
    <html>
      <body>
        <select name="size">
          <option value="30">30</option>
          <option value="32">32</option>
        </select>
      </body>
    </html>
  `;
  const context1 = createTestContext(html1);
  const result1 = strategy.extract(context1);

  if (
    result1.variants.length === 2 &&
    result1.variants[0].attributes.length === 1 &&
    result1.variants[0].attributes[0].name === "size" &&
    (result1.variants[0].attributes[0].value === "30" ||
      result1.variants[0].attributes[0].value === "32")
  ) {
    console.log("✅ Single dropdown extracted correctly");
    console.log(`   Variants: ${result1.variants.length}`);
    console.log(`   First variant: ${JSON.stringify(result1.variants[0].attributes)}`);
  } else {
    console.log("❌ Single dropdown extraction failed");
    console.log(`   Variants: ${result1.variants.length}`);
    if (result1.variants.length > 0) {
      console.log(`   First variant: ${JSON.stringify(result1.variants[0])}`);
    }
  }

  // Test 2: Two dropdowns (size + color)
  console.log("\nTest 2: Two dropdowns (size + color)");
  const html2 = `
    <html>
      <body>
        <select name="size">
          <option value="30">30</option>
          <option value="32">32</option>
        </select>
        <select name="color">
          <option value="Black">Black</option>
          <option value="Navy">Navy</option>
        </select>
      </body>
    </html>
  `;
  const context2 = createTestContext(html2);
  const result2 = strategy.extract(context2);

  const expectedCombinations = 2 * 2; // 4 combinations
  if (
    result2.variants.length === expectedCombinations &&
    result2.variants.every(
      (v) => v.attributes.length === 2 && v.attributes.some((a) => a.name === "size") && v.attributes.some((a) => a.name === "color")
    )
  ) {
    console.log("✅ Two dropdowns combined correctly");
    console.log(`   Variants: ${result2.variants.length} (expected ${expectedCombinations})`);
    console.log(`   Sample variant: ${JSON.stringify(result2.variants[0].attributes)}`);
  } else {
    console.log("❌ Two dropdowns combination failed");
    console.log(`   Variants: ${result2.variants.length} (expected ${expectedCombinations})`);
    if (result2.variants.length > 0) {
      console.log(`   First variant: ${JSON.stringify(result2.variants[0].attributes)}`);
    }
  }

  // Test 3: Radio buttons
  console.log("\nTest 3: Radio button groups");
  const html3 = `
    <html>
      <body>
        <input type="radio" name="color" value="Black" id="color-black">
        <label for="color-black">Black</label>
        <input type="radio" name="color" value="Navy" id="color-navy">
        <label for="color-navy">Navy</label>
        <input type="radio" name="size" value="M" id="size-m">
        <label for="size-m">Medium</label>
        <input type="radio" name="size" value="L" id="size-l">
        <label for="size-l">Large</label>
      </body>
    </html>
  `;
  const context3 = createTestContext(html3);
  const result3 = strategy.extract(context3);

  const expectedRadioCombinations = 2 * 2; // 4 combinations
  if (
    result3.variants.length === expectedRadioCombinations &&
    result3.variants.every(
      (v) => v.attributes.length === 2 && v.attributes.some((a) => a.name === "color") && v.attributes.some((a) => a.name === "size")
    )
  ) {
    console.log("✅ Radio buttons extracted correctly");
    console.log(`   Variants: ${result3.variants.length} (expected ${expectedRadioCombinations})`);
  } else {
    console.log("❌ Radio buttons extraction failed");
    console.log(`   Variants: ${result3.variants.length} (expected ${expectedRadioCombinations})`);
  }

  // Test 4: Buttons with data attributes
  console.log("\nTest 4: Buttons with data attributes");
  const html4 = `
    <html>
      <body>
        <button class="size-option" data-size="S">Small</button>
        <button class="size-option" data-size="M">Medium</button>
        <button class="size-option" data-size="L">Large</button>
        <div class="color-swatch" data-color="Red">Red</div>
        <div class="color-swatch" data-color="Blue">Blue</div>
      </body>
    </html>
  `;
  const context4 = createTestContext(html4);
  const result4 = strategy.extract(context4);

  const expectedButtonCombinations = 3 * 2; // 6 combinations
  if (
    result4.variants.length === expectedButtonCombinations &&
    result4.variants.every(
      (v) => v.attributes.length === 2 && v.attributes.some((a) => a.name === "size") && v.attributes.some((a) => a.name === "color")
    )
  ) {
    console.log("✅ Buttons with data attributes extracted correctly");
    console.log(`   Variants: ${result4.variants.length} (expected ${expectedButtonCombinations})`);
  } else {
    console.log("❌ Buttons with data attributes extraction failed");
    console.log(`   Variants: ${result4.variants.length} (expected ${expectedButtonCombinations})`);
    if (result4.variants.length > 0) {
      console.log(`   First variant: ${JSON.stringify(result4.variants[0].attributes)}`);
    }
  }

  // Test 5: No variants in DOM
  console.log("\nTest 5: No variants in DOM");
  const html5 = `
    <html>
      <body>
        <h1>Product</h1>
        <p>No variants here</p>
      </body>
    </html>
  `;
  const context5 = createTestContext(html5);
  const result5 = strategy.extract(context5);

  if (result5.variants.length === 0) {
    console.log("✅ No variants handled correctly");
    console.log(`   Variants: ${result5.variants.length}`);
    if (result5.notes) {
      console.log(`   Notes: ${result5.notes.join(", ")}`);
    }
  } else {
    console.log("❌ Should return empty array when no variants found");
    console.log(`   Variants: ${result5.variants.length}`);
  }

  // Test 6: Attribute names cleanup
  console.log("\nTest 6: Attribute names normalization");
  const html6 = `
    <html>
      <body>
        <select name="Product Size">
          <option value="30">30</option>
        </select>
        <select name="COLOR">
          <option value="Black">Black</option>
        </select>
      </body>
    </html>
  `;
  const context6 = createTestContext(html6);
  const result6 = strategy.extract(context6);

  const normalizedNames = result6.variants.flatMap((v) =>
    v.attributes.map((a) => a.name)
  );
  const allLowercase = normalizedNames.every((name) => name === name.toLowerCase());
  const noSpaces = normalizedNames.every((name) => !name.includes(" "));

  if (allLowercase && noSpaces && result6.variants.length > 0) {
    console.log("✅ Attribute names normalized correctly");
    console.log(`   Normalized names: ${[...new Set(normalizedNames)].join(", ")}`);
  } else {
    console.log("❌ Attribute names not normalized correctly");
    console.log(`   Names: ${normalizedNames.join(", ")}`);
  }

  // Test 7: Deduplication
  console.log("\nTest 7: Deduplication of values");
  const html7 = `
    <html>
      <body>
        <select name="size">
          <option value="30">30</option>
          <option value="30">30</option>
          <option value="32">32</option>
          <option>32</option>
        </select>
      </body>
    </html>
  `;
  const context7 = createTestContext(html7);
  const result7 = strategy.extract(context7);

  // Should have only 2 unique variants (30 and 32)
  const uniqueValues = new Set(
    result7.variants.map((v) => v.attributes[0].value)
  );

  if (uniqueValues.size === 2 && result7.variants.length === 2) {
    console.log("✅ Deduplication works correctly");
    console.log(`   Unique values: ${Array.from(uniqueValues).join(", ")}`);
    console.log(`   Variants: ${result7.variants.length}`);
  } else {
    console.log("❌ Deduplication failed");
    console.log(`   Unique values: ${Array.from(uniqueValues).join(", ")}`);
    console.log(`   Variants: ${result7.variants.length} (expected 2)`);
  }

  // Test 8: Mixed sources (selects + radios + buttons)
  console.log("\nTest 8: Mixed variant sources");
  const html8 = `
    <html>
      <body>
        <select name="size">
          <option value="S">Small</option>
          <option value="M">Medium</option>
        </select>
        <input type="radio" name="color" value="Black">
        <input type="radio" name="color" value="White">
        <button data-material="Cotton">Cotton</button>
        <button data-material="Polyester">Polyester</button>
      </body>
    </html>
  `;
  const context8 = createTestContext(html8);
  const result8 = strategy.extract(context8);

  const expectedMixedCombinations = 2 * 2 * 2; // 8 combinations
  if (result8.variants.length === expectedMixedCombinations) {
    console.log("✅ Mixed sources combined correctly");
    console.log(`   Variants: ${result8.variants.length} (expected ${expectedMixedCombinations})`);
    console.log(`   Sample variant: ${JSON.stringify(result8.variants[0].attributes)}`);
  } else {
    console.log("❌ Mixed sources combination failed");
    console.log(`   Variants: ${result8.variants.length} (expected ${expectedMixedCombinations})`);
  }

  // Test 9: Notes are included
  console.log("\nTest 9: Notes included in result");
  const html9 = `
    <html>
      <body>
        <select name="size">
          <option value="30">30</option>
          <option value="32">32</option>
        </select>
        <select name="color">
          <option value="Black">Black</option>
        </select>
      </body>
    </html>
  `;
  const context9 = createTestContext(html9);
  const result9 = strategy.extract(context9);

  if (
    result9.notes &&
    result9.notes.length > 0 &&
    result9.notes.some((note) => note.includes("dropdown") || note.includes("variant"))
  ) {
    console.log("✅ Notes included correctly");
    result9.notes.forEach((note) => console.log(`   - ${note}`));
  } else {
    console.log("❌ Notes not included or incomplete");
    console.log(`   Notes: ${result9.notes?.join(", ") || "none"}`);
  }

  console.log("\n✨ DomVariantStrategy tests completed!");
}

testDomStrategy().catch(console.error);

