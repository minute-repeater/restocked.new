import { loadDom } from "../../src/parser/loadDom.js";
import {
  getText,
  extractCleanText,
  normalizeText,
  extractPriceLikeStrings,
  extractStockLikeStrings,
} from "../../src/parser/textExtraction.js";

/**
 * Test text extraction functionality
 */
async function testTextExtraction() {
  console.log("🧪 Testing textExtraction...\n");

  const $ = loadDom(`
    <html>
      <body>
        <div id="messy">
          <p>   Hello    World   </p>
          <span>  Test   </span>
          <br/>
          <strong>More   Text</strong>
        </div>
        <div id="clean">Clean Text</div>
        <div id="empty"></div>
      </body>
    </html>
  `);

  // Test 1: Clean text extraction from messy HTML
  console.log("Test 1: Clean text extraction from messy HTML");
  const messyEl = $("#messy");
  const cleanText = extractCleanText(messyEl);
  const expectedClean = "Hello World Test More Text";
  if (cleanText === expectedClean) {
    console.log(`✅ Clean text extracted correctly: "${cleanText}"`);
  } else {
    console.log(
      `❌ Failed: expected "${expectedClean}", got "${cleanText}"`
    );
  }

  // Test 2: Raw text extraction
  console.log("\nTest 2: Raw text extraction");
  const rawText = getText(messyEl);
  if (rawText.includes("Hello") && rawText.includes("World")) {
    console.log(`✅ Raw text extracted: "${rawText.substring(0, 30)}..."`);
  } else {
    console.log(`❌ Failed to extract raw text`);
  }

  // Test 3: normalizeText behavior
  console.log("\nTest 3: normalizeText behavior");
  const testCases = [
    { input: "  Hello   World  ", expected: "hello world" },
    { input: "Test-String!", expected: "test string" },
    { input: "UPPERCASE", expected: "uppercase" },
    { input: "", expected: "" },
  ];

  let allPassed = true;
  for (const testCase of testCases) {
    const result = normalizeText(testCase.input);
    if (result !== testCase.expected) {
      console.log(
        `❌ normalizeText("${testCase.input}") failed: expected "${testCase.expected}", got "${result}"`
      );
      allPassed = false;
    }
  }
  if (allPassed) {
    console.log("✅ normalizeText works correctly");
  }

  // Test 4: Price-like string extraction
  console.log("\nTest 4: Price-like string extraction");
  const htmlWithPrices = `
    <div>
      <span>Price: $39.99</span>
      <span>€50.00</span>
      <span>£29.99</span>
      <span>USD 100</span>
      <span>Regular price: 99.50</span>
      <span>Year: 2024</span>
      <span>ID: 12345</span>
    </div>
  `;
  const prices = extractPriceLikeStrings(htmlWithPrices);
  const hasDollarPrice = prices.some((p) => p.includes("$39.99") || p.includes("39.99"));
  const hasEuroPrice = prices.some((p) => p.includes("€") || p.includes("50"));
  const hasPoundPrice = prices.some((p) => p.includes("£") || p.includes("29.99"));
  
  if (hasDollarPrice && prices.length > 0) {
    console.log(`✅ Price-like strings extracted: ${prices.length} found`);
    console.log(`   Examples: ${prices.slice(0, 5).join(", ")}`);
  } else {
    console.log(`❌ Failed to extract price-like strings`);
    console.log(`   Found: ${prices.join(", ")}`);
  }

  // Test 5: Stock-like string extraction
  console.log("\nTest 5: Stock-like string extraction");
  const htmlWithStock = `
    <div>
      <span>Status: In Stock</span>
      <span>Availability: Out of Stock</span>
      <span>Sold Out</span>
      <span>Available Now</span>
      <span>Backordered</span>
      <span>Only 5 left</span>
      <span>Unavailable</span>
    </div>
  `;
  const stockStrings = extractStockLikeStrings(htmlWithStock);
  const hasInStock = stockStrings.some((s) =>
    s.toLowerCase().includes("stock") || s.toLowerCase().includes("available")
  );
  const hasOutOfStock = stockStrings.some((s) =>
    s.toLowerCase().includes("out") || s.toLowerCase().includes("sold")
  );

  if (hasInStock && stockStrings.length > 0) {
    console.log(`✅ Stock-like strings extracted: ${stockStrings.length} found`);
    console.log(`   Examples: ${stockStrings.slice(0, 5).join(", ")}`);
  } else {
    console.log(`❌ Failed to extract stock-like strings`);
    console.log(`   Found: ${stockStrings.join(", ")}`);
  }

  // Test 6: Handle undefined/null elements
  console.log("\nTest 6: Handle undefined/null elements");
  const undefinedText = getText(undefined);
  const undefinedClean = extractCleanText(undefined);
  if (undefinedText === "" && undefinedClean === "") {
    console.log("✅ Undefined elements handled gracefully");
  } else {
    console.log("❌ Failed to handle undefined elements");
  }

  console.log("\n✨ textExtraction tests completed!");
}

testTextExtraction().catch(console.error);

