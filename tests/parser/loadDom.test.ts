import { loadDom } from "../../src/parser/loadDom.js";

/**
 * Test DOM loading functionality
 */
async function testLoadDom() {
  console.log("🧪 Testing loadDom...\n");

  // Test 1: Valid HTML
  console.log("Test 1: Loading valid HTML");
  const validHTML = `
    <html>
      <head><title>Test</title></head>
      <body>
        <div id="test">Hello World</div>
      </body>
    </html>
  `;
  const $1 = loadDom(validHTML);
  const testDiv = $1("#test");
  if (testDiv.length > 0 && testDiv.text().trim() === "Hello World") {
    console.log("✅ Valid HTML loaded correctly");
  } else {
    console.log("❌ Failed to load valid HTML");
  }

  // Test 2: Malformed HTML
  console.log("\nTest 2: Loading malformed HTML");
  const malformedHTML = "<div><p>Unclosed div";
  const $2 = loadDom(malformedHTML);
  if ($2("div").length > 0) {
    console.log("✅ Malformed HTML handled gracefully");
  } else {
    console.log("❌ Failed to handle malformed HTML");
  }

  // Test 3: Empty string
  console.log("\nTest 3: Loading empty string");
  const $3 = loadDom("");
  if ($3("body").length === 0) {
    console.log("✅ Empty string handled correctly");
  } else {
    console.log("❌ Failed to handle empty string");
  }

  // Test 4: Strip scripts and styles
  console.log("\nTest 4: Stripping scripts and styles");
  const htmlWithScripts = `
    <html>
      <head>
        <script>console.log('test');</script>
        <style>body { color: red; }</style>
      </head>
      <body>
        <div>Content</div>
      </body>
    </html>
  `;
  const $4 = loadDom(htmlWithScripts, { stripScriptsAndStyles: true });
  if ($4("script").length === 0 && $4("style").length === 0) {
    console.log("✅ Scripts and styles stripped correctly");
  } else {
    console.log("❌ Failed to strip scripts and styles");
  }

  console.log("\n✨ loadDom tests completed!");
}

testLoadDom().catch(console.error);

