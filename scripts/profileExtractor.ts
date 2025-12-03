#!/usr/bin/env node

/**
 * Memory Profiling Script for Product Extractor
 * 
 * This script profiles the product extraction pipeline to identify memory leaks.
 * It runs ONLY the extraction (fetchProductPage + extractProductShell), NOT DB operations.
 * 
 * Usage:
 *   npm run profile:extractor -- <url>
 * 
 * Example:
 *   npm run profile:extractor -- https://cherryla.com/collections/headwear/products/bucking-dad-hat-beige
 */

import "dotenv/config";
import { writeHeapSnapshot } from "v8";
import { fetchProductPage } from "../src/fetcher/fetchProductPage.js";
import { extractProductShell } from "../src/extractor/productExtractor.js";
import { validateURL } from "../src/api/utils/urlValidation.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Get memory usage in MB
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed / 1024 / 1024,
    heapTotal: usage.heapTotal / 1024 / 1024,
    rss: usage.rss / 1024 / 1024,
    external: usage.external / 1024 / 1024,
  };
}

/**
 * Format memory usage for display
 */
function formatMemory(mem: ReturnType<typeof getMemoryUsage>): string {
  return `heapUsed: ${mem.heapUsed.toFixed(2)} MB, heapTotal: ${mem.heapTotal.toFixed(2)} MB, rss: ${mem.rss.toFixed(2)} MB, external: ${mem.external.toFixed(2)} MB`;
}

/**
 * Take heap snapshot and save to file
 */
function takeHeapSnapshot(filename: string): string {
  const snapshotPath = path.join("/tmp", filename);
  const snapshot = writeHeapSnapshot(snapshotPath);
  const stats = fs.statSync(snapshotPath);
  return snapshotPath;
}

/**
 * Main profiling function
 */
async function profileExtractor(url: string): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Product Extractor Memory Profiling");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`URL: ${url}`);
  console.log("");

  // Validate URL
  const urlValidation = validateURL(url);
  if (!urlValidation.valid) {
    console.error("❌ Invalid URL:", urlValidation.error);
    process.exit(1);
  }

  // Initial memory state
  console.log("📊 Initial Memory State");
  const memInitial = getMemoryUsage();
  console.log(formatMemory(memInitial));
  console.log("");

  // Force GC if available
  if (global.gc) {
    console.log("🧹 Running garbage collection...");
    global.gc();
    const memAfterGC = getMemoryUsage();
    console.log(`After GC: ${formatMemory(memAfterGC)}`);
    console.log("");
  }

  // Take heap snapshot BEFORE extraction
  console.log("📸 Taking heap snapshot BEFORE extraction...");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const beforeSnapshot = takeHeapSnapshot(`heap-before-${timestamp}.heapsnapshot`);
  const beforeStats = fs.statSync(beforeSnapshot);
  console.log(`✅ Saved: ${beforeSnapshot} (${(beforeStats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log("");

  // Memory before extraction
  const memBefore = getMemoryUsage();
  console.log("📊 Memory BEFORE Extraction");
  console.log(formatMemory(memBefore));
  console.log("");

  // Run extraction pipeline (same as POST /products)
  console.log("🔄 Running extraction pipeline...");
  console.log("  Step 1: fetchProductPage()");
  const fetchStartTime = Date.now();
  
  let fetchResult;
  try {
    fetchResult = await fetchProductPage(url);
    const fetchTime = Date.now() - fetchStartTime;
    console.log(`  ✅ Fetch completed in ${fetchTime}ms`);
    console.log(`  Mode used: ${fetchResult.modeUsed}`);
    
    if (!fetchResult.success) {
      console.error(`  ❌ Fetch failed: ${fetchResult.error}`);
      process.exit(1);
    }

    // Log HTML size
    const htmlSize = (fetchResult.rawHTML || fetchResult.renderedHTML || "").length;
    console.log(`  HTML size: ${(htmlSize / 1024 / 1024).toFixed(2)} MB`);
    console.log("");

    // Memory after fetch
    const memAfterFetch = getMemoryUsage();
    console.log("📊 Memory AFTER Fetch");
    console.log(formatMemory(memAfterFetch));
    console.log(`  Delta: heapUsed +${(memAfterFetch.heapUsed - memBefore.heapUsed).toFixed(2)} MB`);
    console.log("");

    // Step 2: Extract ProductShell
    console.log("  Step 2: extractProductShell()");
    const extractStartTime = Date.now();
    
    const productShell = await extractProductShell(fetchResult);
    const extractTime = Date.now() - extractStartTime;
    console.log(`  ✅ Extraction completed in ${extractTime}ms`);
    console.log(`  Product title: ${productShell.title || "N/A"}`);
    console.log(`  Variants found: ${productShell.variants?.length || 0}`);
    console.log(`  Images found: ${productShell.images?.length || 0}`);
    console.log("");

  } catch (error: any) {
    console.error("❌ Extraction failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }

  // Memory after extraction
  const memAfter = getMemoryUsage();
  console.log("📊 Memory AFTER Extraction");
  console.log(formatMemory(memAfter));
  console.log("");

  // Calculate deltas
  console.log("📈 Memory Deltas");
  const deltaHeapUsed = memAfter.heapUsed - memBefore.heapUsed;
  const deltaHeapTotal = memAfter.heapTotal - memBefore.heapTotal;
  const deltaRss = memAfter.rss - memBefore.rss;
  const deltaExternal = memAfter.external - memBefore.external;
  
  console.log(`  heapUsed:  ${deltaHeapUsed >= 0 ? "+" : ""}${deltaHeapUsed.toFixed(2)} MB`);
  console.log(`  heapTotal: ${deltaHeapTotal >= 0 ? "+" : ""}${deltaHeapTotal.toFixed(2)} MB`);
  console.log(`  rss:       ${deltaRss >= 0 ? "+" : ""}${deltaRss.toFixed(2)} MB`);
  console.log(`  external:  ${deltaExternal >= 0 ? "+" : ""}${deltaExternal.toFixed(2)} MB`);
  console.log("");

  // Take heap snapshot AFTER extraction
  console.log("📸 Taking heap snapshot AFTER extraction...");
  const afterSnapshot = takeHeapSnapshot(`heap-after-${timestamp}.heapsnapshot`);
  const afterStats = fs.statSync(afterSnapshot);
  console.log(`✅ Saved: ${afterSnapshot} (${(afterStats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log("");

  // Force GC and check final memory
  if (global.gc) {
    console.log("🧹 Running garbage collection after extraction...");
    global.gc();
    const memAfterGC = getMemoryUsage();
    console.log(`After GC: ${formatMemory(memAfterGC)}`);
    console.log(`  heapUsed reduction: ${(memAfter.heapUsed - memAfterGC.heapUsed).toFixed(2)} MB`);
    console.log("");
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("📋 Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Initial memory:    ${memInitial.heapUsed.toFixed(2)} MB`);
  console.log(`Before extraction:  ${memBefore.heapUsed.toFixed(2)} MB`);
  console.log(`After extraction:   ${memAfter.heapUsed.toFixed(2)} MB`);
  console.log(`Memory growth:     +${deltaHeapUsed.toFixed(2)} MB`);
  console.log("");
  console.log(`Heap snapshots:`);
  console.log(`  Before: ${beforeSnapshot}`);
  console.log(`  After:  ${afterSnapshot}`);
  console.log("");
  console.log("💡 To analyze snapshots:");
  console.log("   1. Open Chrome DevTools");
  console.log("   2. Go to Memory tab");
  console.log("   3. Load snapshot files from /tmp");
  console.log("   4. Compare snapshots to find memory leaks");
  console.log("═══════════════════════════════════════════════════════════════");
}

// Main entry point
async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error("❌ Error: URL argument required");
    console.error("");
    console.error("Usage:");
    console.error("  npm run profile:extractor -- <url>");
    console.error("");
    console.error("Example:");
    console.error("  npm run profile:extractor -- https://cherryla.com/collections/headwear/products/bucking-dad-hat-beige");
    process.exit(1);
  }

  // Disable Playwright in development mode
  // Set flag to skip Playwright fallback
  process.env.DISABLE_PLAYWRIGHT = "true";
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }

  try {
    await profileExtractor(url);
  } catch (error: any) {
    console.error("❌ Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

