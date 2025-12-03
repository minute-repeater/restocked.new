import { fetchProductPage } from "../src/fetcher/index.js";

/**
 * Test examples for the fetchProductPage function
 */
async function runTests() {
  console.log("🧪 Testing fetchProductPage module...\n");

  // Test 1: Simple HTTP page (should use HTTP mode)
  console.log("Test 1: Fetching example.com (should use HTTP)...");
  try {
    const result1 = await fetchProductPage("https://example.com");
    console.log(`✅ Success: ${result1.success}`);
    console.log(`   Mode: ${result1.modeUsed}`);
    console.log(`   Final URL: ${result1.finalURL}`);
    console.log(`   Status: ${result1.statusCode}`);
    console.log(`   HTML length: ${result1.rawHTML?.length || result1.renderedHTML?.length || 0} chars`);
    console.log(`   Timing: ${JSON.stringify(result1.metadata.timing)}\n`);
  } catch (error) {
    console.error(`❌ Test 1 failed:`, error);
  }

  // Test 2: Invalid URL (should fail)
  console.log("Test 2: Fetching invalid URL (should fail gracefully)...");
  try {
    const result2 = await fetchProductPage("https://invalid-domain-that-does-not-exist-12345.com");
    console.log(`✅ Handled gracefully: ${result2.success}`);
    console.log(`   Mode: ${result2.modeUsed}`);
    console.log(`   Error: ${result2.error}\n`);
  } catch (error) {
    console.error(`❌ Test 2 failed:`, error);
  }

  // Test 3: A real e-commerce site (may use Playwright if JS-heavy)
  console.log("Test 3: Fetching a real product page...");
  try {
    const result3 = await fetchProductPage("https://www.amazon.com/dp/B08N5WRWNW");
    console.log(`✅ Success: ${result3.success}`);
    console.log(`   Mode: ${result3.modeUsed}`);
    console.log(`   Final URL: ${result3.finalURL}`);
    console.log(`   HTML length: ${result3.rawHTML?.length || result3.renderedHTML?.length || 0} chars`);
    if (result3.metadata.consoleErrors && result3.metadata.consoleErrors.length > 0) {
      console.log(`   Console errors: ${result3.metadata.consoleErrors.length}`);
    }
    console.log(`   Timing: ${JSON.stringify(result3.metadata.timing)}\n`);
  } catch (error) {
    console.error(`❌ Test 3 failed:`, error);
  }

  console.log("✨ Tests completed!");
}

// Run tests if executed directly
runTests().catch(console.error);

