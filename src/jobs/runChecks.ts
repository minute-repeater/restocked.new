#!/usr/bin/env node
/**
 * Standalone script to run product checks
 * Can be run manually or via cron
 * Usage: node dist/jobs/runChecks.js
 */

import "dotenv/config";
import { CheckWorker } from "./checkWorker.js";

async function main() {
  console.log("[runChecks] Starting product check worker...");

  try {
    const worker = new CheckWorker();
    const result = await worker.runChecks();

    console.log("[runChecks] Check run completed:");
    console.log(`  - Products checked: ${result.productsChecked}`);
    console.log(`  - Products skipped: ${result.productsSkipped}`);
    console.log(`  - Products failed: ${result.productsFailed}`);
    console.log(`  - Duration: ${result.durationMs}ms`);

    if (result.errors.length > 0) {
      console.log(`  - Errors: ${result.errors.length}`);
      result.errors.forEach((error) => {
        console.error(`    - ${error}`);
      });
    }

    process.exit(result.productsFailed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error("[runChecks] Fatal error:", error);
    process.exit(1);
  }
}

main();

