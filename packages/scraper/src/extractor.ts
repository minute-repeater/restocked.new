import type { ExtractedProductData } from '@restocked/shared';
import { extractRetailer } from '@restocked/shared';
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
