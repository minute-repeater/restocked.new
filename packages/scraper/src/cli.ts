#!/usr/bin/env node
/**
 * Scraper CLI — test what the scraper extracts from any product URL.
 *
 * Usage:
 *   pnpm tsx packages/scraper/src/cli.ts "https://example.com/product"
 *   pnpm tsx packages/scraper/src/cli.ts --batch
 *   pnpm tsx packages/scraper/src/cli.ts --batch --json
 */

import { fetchPage, closeBrowser } from './fetcher/index.js';
import { extractFromJsonLd } from './parser/jsonld.js';
import { extractFromMeta } from './parser/meta.js';
import { extractFromDom } from './parser/dom.js';
import { extractProductData } from './extractor.js';
import type { ExtractedProductData } from '@covet/shared';

// ── Retailer validation suite ──────────────────────────────────────────────
// URLs verified active as of Feb 2026. Grouped by expected difficulty.
const VALIDATION_URLS = [
  // ── Shopify-based stores (JSON-LD expected, highest success rate) ──
  { brand: 'Bode', url: 'https://bode.com/products/storytime-quilt-jacket-red-multi' },
  { brand: "Drake's", url: 'https://us.drakes.com/products/green-cotton-cashmere-sweatshirt' },
  { brand: 'Evan Kinori', url: 'https://evankinori.com/products/field-shirt-wool-flannel' },
  { brand: 'Stüssy', url: 'https://www.stussy.com/products/1905000-basic-stussy-tee-black' },
  { brand: 'Kith', url: 'https://kith.com/collections/kith-classics/products/khm034166-001' },
  { brand: 'A.P.C.', url: 'https://www.apc-us.com/products/petit-new-standard-codbs-m09047' },
  { brand: 'HAVEN', url: 'https://havenshop.com/products/haven-stratus-t-shirt-superfine-wool-jersey-black-ss26' },
  { brand: 'Bodega', url: 'https://bdgastore.com/products/essential-adsb-patch-logo-sweatshirt' },
  { brand: 'Dover St Market', url: 'https://shop-us.doverstreetmarket.com/products/play-t-shirt-black-black-16164' },

  // ── Non-Shopify with structured data ──
  { brand: 'Our Legacy', url: 'https://www.ourlegacy.com/new-box-tshirt-black-core' },
  { brand: 'Norse Projects', url: 'https://www.norseprojects.com/store/n01-0606-0001-johannes-standard-logo' },
  { brand: 'Acne Studios', url: 'https://www.acnestudios.com/us/en/t-shirt---regular-fit-black/CL0309-900.html' },

  // ── Luxury multi-brand retailers (JS-heavy, may need browser) ──
  { brand: 'SSENSE', url: 'https://www.ssense.com/en-us/men/product/acne-studios/black-logo-t-shirt/18162981' },
  { brand: 'Browns', url: 'https://www.brownsfashion.com/products/jacquemus-the-salon-shoulder-bag-olbss2600164300' },
  { brand: 'Harvey Nichols', url: 'https://www.harveynichols.com/loewe/puzzle-mini-leather-cross-body-bag-764198-tann-2530-tan-92553/' },
  { brand: 'Luisaviaroma', url: 'https://www.luisaviaroma.com/en-us/p/nike/men/sneakers/74I-4OZ226' },
  { brand: 'Selfridges', url: 'https://www.selfridges.com/US/en/product/acne-studios-face-logo-patch-wool-beanie-hat_R03780487/' },

  // ── Known anti-bot (stretch goals — heavy WAF/Akamai/Cloudflare) ──
  { brand: 'Mytheresa', url: 'https://www.mytheresa.com/us/en/men/bottega-veneta-medium-intrecciato-leather-backpack-black-p00890698' },
  { brand: 'Salomon', url: 'https://www.salomon.com/en-us/shop/product/xt-6-lg3222.html' },
  { brand: 'Net-a-Porter', url: 'https://www.net-a-porter.com/en-us/shop/product/toteme/clothing/coats/signature-wool-blend-coat/46353151655202188' },
  { brand: 'Mr Porter', url: 'https://www.mrporter.com/en-us/mens/product/tom-ford/shoes/lace-up-boots/suede-boots/666467151989754' },
  { brand: 'END.', url: 'https://www.endclothing.com/us/beams-plus-2-pleat-chino-38-23-0097-874-20.html' },
  { brand: 'Farfetch', url: 'https://www.farfetch.com/shopping/men/prada-re-nylon-logo-baseball-cap-item-20625058.aspx' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const CHECK = '\x1b[32m✓\x1b[0m';
const CROSS = '\x1b[31m✗\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function field(label: string, value: unknown): string {
  if (value === null || value === undefined) {
    return `  ${CROSS} ${label}: ${DIM}not found${RESET}`;
  }
  return `  ${CHECK} ${label}: ${value}`;
}

function formatPrice(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return 'not found';
  return `$${(cents / 100).toFixed(2)} (${cents} cents)`;
}

function formatStock(inStock: boolean | null | undefined): string {
  if (inStock === null || inStock === undefined) return 'unknown';
  return inStock ? '\x1b[32mIN STOCK\x1b[0m' : '\x1b[31mOUT OF STOCK\x1b[0m';
}

function fieldsPassed(data: Partial<ExtractedProductData>): { name: boolean; price: boolean; stock: boolean; image: boolean } {
  return {
    name: data.name !== null && data.name !== undefined,
    price: data.price !== null && data.price !== undefined,
    stock: data.inStock !== null && data.inStock !== undefined,
    image: data.imageUrl !== null && data.imageUrl !== undefined,
  };
}

function parserSummary(label: string, data: Partial<ExtractedProductData> | null): void {
  console.log(`\n${CYAN}${label}:${RESET}`);
  if (!data) {
    console.log(`  ${DIM}(no data extracted)${RESET}`);
    return;
  }
  console.log(field('name', data.name));
  console.log(field('price', data.price !== null && data.price !== undefined ? formatPrice(data.price) : null));
  console.log(field('inStock', data.inStock !== null && data.inStock !== undefined ? formatStock(data.inStock) : null));
  console.log(field('imageUrl', data.imageUrl ? data.imageUrl.substring(0, 80) + (data.imageUrl.length > 80 ? '...' : '') : null));
  console.log(`  ${DIM}confidence: ${data.confidence ?? 'n/a'}${RESET}`);
}

// ── Single URL mode ────────────────────────────────────────────────────────
async function scrapeOne(url: string): Promise<{ data: ExtractedProductData; fetchMethod: string; durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    const fetchResult = await fetchPage(url);
    const fetchMethod = fetchResult.usedBrowser ? 'Playwright (browser)' : 'HTTP';

    // Run parsers individually for detailed output
    const jsonLd = extractFromJsonLd(fetchResult.html);
    const meta = extractFromMeta(fetchResult.html);
    const dom = extractFromDom(fetchResult.html);

    // Also get the merged result
    const { data } = await extractProductData(url);
    const durationMs = Date.now() - start;

    return { data, fetchMethod, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    return {
      data: { name: null, imageUrl: null, price: null, currency: null, inStock: null, variants: [], retailer: null, confidence: 0 },
      fetchMethod: 'failed',
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runSingle(url: string): Promise<void> {
  console.log(`\n${BOLD}Scraping:${RESET} ${url}\n`);

  const start = Date.now();

  try {
    // Fetch the page
    const fetchResult = await fetchPage(url);
    const fetchMethod = fetchResult.usedBrowser ? 'Playwright (browser)' : 'HTTP';
    const fetchTime = Date.now() - start;
    console.log(`${BOLD}Fetch Method:${RESET} ${fetchMethod} (${(fetchTime / 1000).toFixed(1)}s)`);
    console.log(`${BOLD}Final URL:${RESET} ${fetchResult.finalUrl}`);
    console.log(`${BOLD}HTML Size:${RESET} ${(fetchResult.html.length / 1024).toFixed(1)} KB`);

    // Run each parser
    const jsonLd = extractFromJsonLd(fetchResult.html);
    const meta = extractFromMeta(fetchResult.html);
    const dom = extractFromDom(fetchResult.html);

    parserSummary('JSON-LD Parser', jsonLd);
    parserSummary('Meta Tags Parser', meta);
    parserSummary('DOM Parser', dom);

    // Get merged result
    const { data } = await extractProductData(url);
    const totalTime = Date.now() - start;

    console.log(`\n${BOLD}${YELLOW}═══ MERGED RESULT ═══${RESET}`);
    console.log(field('name', data.name));
    console.log(field('price', data.price !== null ? formatPrice(data.price) : null));
    console.log(field('inStock', data.inStock !== null ? formatStock(data.inStock) : null));
    console.log(field('imageUrl', data.imageUrl ? data.imageUrl.substring(0, 80) + (data.imageUrl.length > 80 ? '...' : '') : null));
    console.log(field('currency', data.currency));
    console.log(field('retailer', data.retailer));
    console.log(`  ${DIM}confidence: ${data.confidence.toFixed(3)}${RESET}`);
    console.log(`  ${DIM}total time: ${(totalTime / 1000).toFixed(1)}s${RESET}`);

    const passed = fieldsPassed(data);
    const passCount = Object.values(passed).filter(Boolean).length;
    const icon = passCount >= 3 ? CHECK : CROSS;
    console.log(`\n${icon} ${passCount}/4 fields extracted\n`);
  } catch (err) {
    console.error(`\n${CROSS} ${BOLD}Scraping failed:${RESET} ${err instanceof Error ? err.message : err}\n`);
  } finally {
    await closeBrowser();
  }
}

// ── Batch mode ─────────────────────────────────────────────────────────────
async function runBatch(jsonOutput: boolean): Promise<void> {
  console.log(`\n${BOLD}Running retailer validation suite (${VALIDATION_URLS.length} URLs)...${RESET}\n`);

  const results: Array<{
    brand: string;
    url: string;
    name: boolean;
    price: boolean;
    stock: boolean;
    confidence: number;
    error?: string;
    durationMs: number;
  }> = [];

  for (const { brand, url } of VALIDATION_URLS) {
    process.stdout.write(`  ${DIM}Checking ${brand}...${RESET}`);
    const { data, durationMs, error } = await scrapeOne(url);
    const passed = fieldsPassed(data);

    results.push({
      brand,
      url,
      name: passed.name,
      price: passed.price,
      stock: passed.stock,
      confidence: data.confidence,
      error,
      durationMs,
    });

    const icon = (passed.name && passed.stock) ? CHECK : CROSS;
    process.stdout.write(`\r  ${icon} ${brand.padEnd(18)} | name ${passed.name ? CHECK : CROSS} | price ${passed.price ? CHECK : CROSS} | stock ${passed.stock ? CHECK : CROSS} | confidence: ${data.confidence.toFixed(2)} | ${(durationMs / 1000).toFixed(1)}s${error ? ` | ERROR: ${error}` : ''}\n`);
  }

  await closeBrowser();

  // Summary
  const passed = results.filter(r => r.name && r.stock).length;
  const total = results.length;
  const passTarget = Math.ceil(total * 0.8);
  const icon = passed >= passTarget ? CHECK : CROSS;

  console.log(`\n${BOLD}═══ SUMMARY ═══${RESET}`);
  console.log(`${icon} ${passed}/${total} passed (name + stock extracted)`);
  console.log(`${DIM}Pass criteria: ≥${passTarget}/${total} (80%)${RESET}`);

  if (jsonOutput) {
    console.log(`\n${BOLD}JSON Output:${RESET}`);
    console.log(JSON.stringify(results, null, 2));
  }

  const failures = results.filter(r => !r.name || !r.stock);
  if (failures.length > 0) {
    console.log(`\n${BOLD}Failures to investigate:${RESET}`);
    for (const f of failures) {
      console.log(`  ${CROSS} ${f.brand}: ${f.url}`);
      if (f.error) console.log(`    ${DIM}Error: ${f.error}${RESET}`);
    }
  }

  console.log();
}

// ── Main ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${BOLD}Covet Scraper CLI${RESET}

${BOLD}Usage:${RESET}
  pnpm tsx packages/scraper/src/cli.ts <url>        Scrape a single URL (detailed output)
  pnpm tsx packages/scraper/src/cli.ts --batch       Run all 10 validation URLs
  pnpm tsx packages/scraper/src/cli.ts --batch --json  Batch mode with JSON output

${BOLD}Examples:${RESET}
  pnpm tsx packages/scraper/src/cli.ts "https://bode.com/products/some-jacket"
  pnpm tsx packages/scraper/src/cli.ts --batch
`);
  process.exit(0);
}

if (args.includes('--batch')) {
  const jsonOutput = args.includes('--json');
  runBatch(jsonOutput).catch(console.error);
} else if (args.length > 0 && !args[0].startsWith('-')) {
  runSingle(args[0]).catch(console.error);
} else {
  console.error(`${CROSS} Please provide a URL or use --batch. Run with --help for usage.`);
  process.exit(1);
}
