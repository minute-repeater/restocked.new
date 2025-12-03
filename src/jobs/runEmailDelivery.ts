#!/usr/bin/env node
/**
 * Standalone script to run email delivery job
 * Can be run manually or via cron
 * Usage: node dist/jobs/runEmailDelivery.js
 */

import "dotenv/config";
import { emailDeliveryJob } from "./emailDeliveryJob.js";

async function main() {
  console.log("[EmailDelivery] Starting email delivery job...");
  
  try {
    const sentCount = await emailDeliveryJob.processUnsentNotifications(100);
    console.log(`[EmailDelivery] Completed. Sent ${sentCount} emails.`);
    process.exit(0);
  } catch (error: any) {
    console.error("[EmailDelivery] Error:", error);
    process.exit(1);
  }
}

main();

