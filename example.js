/**
 * Simple example usage of fetchProductPage
 * 
 * Run with: node example.js
 * (after building with: npm run build)
 */

import { fetchProductPage } from "./dist/fetcher/index.js";

async function main() {
  console.log("Fetching example.com...\n");

  const result = await fetchProductPage("https://example.com");

  console.log("Result:");
  console.log(`  Success: ${result.success}`);
  console.log(`  Mode: ${result.modeUsed}`);
  console.log(`  Original URL: ${result.originalURL}`);
  console.log(`  Final URL: ${result.finalURL}`);
  console.log(`  Status Code: ${result.statusCode}`);
  console.log(`  HTML Length: ${result.rawHTML?.length || result.renderedHTML?.length || 0} characters`);
  console.log(`  Fetched At: ${result.fetchedAt}`);
  
  if (result.metadata.timing) {
    console.log(`  Timing:`, result.metadata.timing);
  }
  
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
}

main().catch(console.error);

