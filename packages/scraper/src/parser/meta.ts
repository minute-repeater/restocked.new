import * as cheerio from 'cheerio';
import type { ExtractedProductData } from '@covet/shared';

/**
 * Extracts product data from Open Graph and other meta tags.
 */
export function extractFromMeta(html: string): Partial<ExtractedProductData> | null {
  const $ = cheerio.load(html);
  const result: Partial<ExtractedProductData> = {};

  // Open Graph tags
  const ogTitle = $('meta[property="og:title"]').attr('content');
  // Prefer secure URL (Shopify provides both og:image and og:image:secure_url)
  const ogImage = $('meta[property="og:image:secure_url"]').attr('content')
    || $('meta[property="og:image"]').attr('content');
  const ogType = $('meta[property="og:type"]').attr('content');

  // Product-specific OG tags - check both standard (product:*) and Shopify (og:price:*) formats
  const ogPriceAmount = $('meta[property="product:price:amount"]').attr('content')
    || $('meta[property="og:price:amount"]').attr('content');
  const ogPriceCurrency = $('meta[property="product:price:currency"]').attr('content')
    || $('meta[property="og:price:currency"]').attr('content');
  const ogAvailability = $('meta[property="product:availability"]').attr('content')
    || $('meta[property="og:availability"]').attr('content');

  // Twitter card
  const twitterTitle = $('meta[name="twitter:title"]').attr('content');
  const twitterImage = $('meta[name="twitter:image"]').attr('content');

  // Standard meta
  const title = $('title').text();

  // Name priority: og:title > twitter:title > title tag
  result.name = ogTitle || twitterTitle || title || null;

  // Image priority: og:image:secure_url > og:image > twitter:image
  result.imageUrl = ogImage || twitterImage || null;

  // Price from OG tags
  if (ogPriceAmount) {
    const price = parseFloat(ogPriceAmount);
    if (!isNaN(price)) {
      result.price = Math.round(price * 100);
    }
  }

  if (ogPriceCurrency) {
    result.currency = ogPriceCurrency;
  }

  // Availability from OG tags
  if (ogAvailability) {
    const lower = ogAvailability.toLowerCase();
    if (lower.includes('instock') || lower.includes('in stock') || lower.includes('available')) {
      result.inStock = true;
    } else if (
      lower.includes('outofstock') ||
      lower.includes('out of stock') ||
      lower.includes('soldout')
    ) {
      result.inStock = false;
    }
  }

  // Confidence is lower for meta tags since they're less specific
  if (Object.keys(result).length > 0) {
    result.confidence = 0.6;
    return result;
  }

  return null;
}
