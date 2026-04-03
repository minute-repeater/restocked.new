/**
 * Randomized inter-request delays to avoid predictable scraping patterns.
 */

import { scraperConfig } from './config.js';

/**
 * Sleeps for a random duration between delayMinMs and delayMaxMs.
 * Call between sequential product checks to mimic human browsing patterns.
 */
export async function interRequestDelay(): Promise<void> {
  const { delayMinMs, delayMaxMs } = scraperConfig;
  const delay = delayMinMs + Math.floor(Math.random() * (delayMaxMs - delayMinMs));
  await new Promise(resolve => setTimeout(resolve, delay));
}
