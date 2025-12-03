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
//# sourceMappingURL=profileExtractor.d.ts.map