import type { ExtractedProductData } from '@covet/shared';
import { extractRetailer } from '@covet/shared';
import { fetchPage, type FetchResult } from './fetcher/index.js';
import { extractFromJsonLd } from './parser/jsonld.js';
import { extractFromMeta } from './parser/meta.js';
import { extractFromDom } from './parser/dom.js';

export interface ExtractionResult {
  data: ExtractedProductData;
  fetchResult: FetchResult;
}

/**
 * Main extraction function. Fetches a product page and extracts all available data.
 */
export async function extractProductData(url: string): Promise<ExtractionResult> {
  // Fetch the page (HTTP first, browser fallback)
  const fetchResult = await fetchPage(url);

  // Try extraction methods in order of reliability
  const jsonLdData = extractFromJsonLd(fetchResult.html);
  const metaData = extractFromMeta(fetchResult.html);
  const domData = extractFromDom(fetchResult.html);

  // Merge results, preferring higher confidence sources
  const merged = mergeExtractionResults(jsonLdData, metaData, domData);

  // Add retailer from URL
  merged.retailer = extractRetailer(url);

  // Validate: reject error page names and homepage titles
  if (merged.name && isErrorPageName(merged.name)) {
    merged.name = undefined;
  }

  // Validate: if we were redirected to the homepage or a non-product page, discard results
  if (isNonProductPage(url, fetchResult.finalUrl)) {
    merged.name = undefined;
    merged.price = undefined;
    merged.inStock = undefined;
    merged.imageUrl = undefined;
  }

  // If we have a product name and price but no explicit stock status,
  // default to "in stock" — product pages with active pricing are usually available.
  // Out-of-stock items typically either have no price or an explicit "sold out" indicator.
  if (merged.name && merged.price != null && merged.inStock == null) {
    merged.inStock = true;
  }

  // Ensure required fields have defaults
  const data: ExtractedProductData = {
    name: merged.name ?? null,
    imageUrl: merged.imageUrl ?? null,
    price: merged.price ?? null,
    currency: merged.currency ?? 'USD',
    inStock: merged.inStock ?? null,
    variants: merged.variants ?? [],
    retailer: merged.retailer ?? null,
    confidence: merged.confidence ?? 0.3,
  };

  return { data, fetchResult };
}

/**
 * Merges extraction results from multiple sources.
 * Prefers higher confidence values for each field.
 */
function mergeExtractionResults(
  ...sources: (Partial<ExtractedProductData> | null)[]
): Partial<ExtractedProductData> {
  const result: Partial<ExtractedProductData> = {};

  // Sort sources by confidence (highest first)
  const sorted = sources
    .filter((s): s is Partial<ExtractedProductData> => s !== null)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  for (const source of sorted) {
    // Only take values that haven't been set yet
    if (source.name && !result.name) {
      result.name = source.name;
    }
    if (source.imageUrl && !result.imageUrl) {
      result.imageUrl = source.imageUrl;
    }
    if (source.price !== undefined && result.price === undefined) {
      result.price = source.price;
    }
    if (source.currency && !result.currency) {
      result.currency = source.currency;
    }
    if (source.inStock !== undefined && result.inStock === undefined) {
      result.inStock = source.inStock;
    }
    if (source.variants && source.variants.length > 0 && !result.variants?.length) {
      result.variants = source.variants;
    }
    if (source.retailer && !result.retailer) {
      result.retailer = source.retailer;
    }
  }

  // Set confidence based on what we found
  result.confidence = calculateConfidence(result);

  return result;
}

/**
 * Detects extracted names that are error pages, homepages, or non-product titles.
 * These are false positives from the DOM/meta parsers picking up page titles.
 */
function isErrorPageName(name: string): boolean {
  const lower = name.toLowerCase().trim();

  // Error page patterns
  const errorPatterns = [
    /\b(404|403|500)\s*(error|not found)?\b/,    // "404", "404 Error", "404 Not Found"
    /page\s*(not|can'?t be|could\s*not\s*be|was\s*not)\s*found/,
    /does\s*not\s*exist/,
    /access.*denied/,
    /access.*blocked/,
    /been\s*denied/,
    /forbidden/,
    /please\s*(verify|enable|allow)/,
    /unfortunately.*page/,
    /we\s*can'?t\s*find/,
    /nothing\s*here/,
    /sorry.*page/,
    /error\s*\d+/,
    /\b\d{3}\s*error\b/,                          // "404 error", "500 error"
    /can'?t\s*be\s*found/,
    /no\s*longer\s*(available|exists?)/,
  ];

  for (const pattern of errorPatterns) {
    if (pattern.test(lower)) return true;
  }

  // Homepage / generic titles (retailer name only, no product info)
  // These are typically very short and match the site name exactly
  const genericTitles = [
    /^mytheresa\s*[-–—]?\s*(the\s*finest)?/i,
    /^net-?a-?porter/i,
    /^mr\s*porter/i,
    /^ssense\b/i,
    /^selfridges\b/i,
    /^harvey\s*nichols\b/i,
    /^browns\s*(fashion)?\b/i,
    /^farfetch\b/i,
    /^luisaviaroma\b/i,
    /^dover\s*street\s*market\b/i,
    /^nordstrom\b/i,
    /^saks\b/i,
    /^neiman\s*marcus\b/i,
    /^bergdorf\b/i,
  ];

  // Only reject if the name is short (< 50 chars) and matches a generic title
  // Real product names are usually longer: "Brand Name - Product Name"
  if (lower.length < 50) {
    for (const pattern of genericTitles) {
      if (pattern.test(lower)) return true;
    }
  }

  // Names that are suspiciously long (> 200 chars) are likely garbage extractions
  // (e.g., SVG icon sprite text, concatenated CSS class names)
  if (lower.length > 200) return true;

  return false;
}

/**
 * Detects if the page was redirected away from a product page.
 * Common when products expire: site redirects to homepage or category.
 */
function isNonProductPage(originalUrl: string, finalUrl: string): boolean {
  try {
    const original = new URL(originalUrl);
    const final = new URL(finalUrl);

    // Same URL = no redirect, fine
    if (original.href === final.href) return false;

    // Redirected to a different domain entirely (geo-redirect to 404)
    // Only flag if the final path looks like homepage
    if (original.hostname !== final.hostname) {
      const finalPath = final.pathname.replace(/\/$/, '');
      if (finalPath === '' || finalPath === '/') return true;
      // Geo-redirect to same product on different TLD is OK
    }

    // Redirected to homepage
    const finalPath = final.pathname.replace(/\/$/, '');
    if (finalPath === '' || finalPath === '/') return true;

    // Redirected to a generic category/search/login page
    const nonProductPaths = [
      /^\/?(search|login|register|account|cart|checkout)\b/i,
      /^\/?(collections|categories|shop)\/?$/i,   // bare collection root
      /^\/?[a-z]{2}(-[a-z]{2})?\/?$/i,            // locale root: /en-us/
      /^\/?[a-z]{2}(-[a-z]{2})?\/?(men|women|sale|new|designers?)\/?$/i,
    ];

    for (const pattern of nonProductPaths) {
      if (pattern.test(finalPath)) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Calculates overall confidence based on extracted data quality.
 */
function calculateConfidence(data: Partial<ExtractedProductData>): number {
  let score = 0;
  let maxScore = 0;

  // Name is important
  maxScore += 2;
  if (data.name) score += 2;

  // Stock status is critical for our use case
  maxScore += 3;
  if (data.inStock !== undefined) score += 3;

  // Price is important
  maxScore += 2;
  if (data.price !== undefined) score += 2;

  // Image is nice to have
  maxScore += 1;
  if (data.imageUrl) score += 1;

  return score / maxScore;
}
