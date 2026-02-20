import * as cheerio from 'cheerio';
import type { ExtractedProductData } from '@restocked/shared';

interface JsonLdProduct {
  '@type'?: string;
  name?: string;
  image?: string | string[] | { url?: string };
  offers?: JsonLdOffer | JsonLdOffer[];
  sku?: string;
}

interface JsonLdOffer {
  '@type'?: string;
  price?: number | string;
  priceCurrency?: string;
  availability?: string;
  sku?: string;
  name?: string;
}

/**
 * Extracts product data from JSON-LD structured data.
 * This is the most reliable method when available.
 */
export function extractFromJsonLd(html: string): Partial<ExtractedProductData> | null {
  const $ = cheerio.load(html);
  const result: Partial<ExtractedProductData> = {};

  // Find all JSON-LD scripts
  const scripts = $('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const content = $(script).html();
      if (!content) continue;

      const data = JSON.parse(content);

      // Handle @graph format
      const items = data['@graph'] || [data];

      for (const item of items) {
        if (isProductType(item)) {
          const product = item as JsonLdProduct;

          // Name
          if (product.name && !result.name) {
            result.name = product.name;
          }

          // Image
          if (product.image && !result.imageUrl) {
            result.imageUrl = extractImageUrl(product.image);
          }

          // Offers (price and availability)
          if (product.offers) {
            const offers = Array.isArray(product.offers) ? product.offers : [product.offers];

            for (const offer of offers) {
              if (offer.price !== undefined && result.price === undefined) {
                result.price = parsePrice(offer.price);
              }

              if (offer.priceCurrency && !result.currency) {
                result.currency = offer.priceCurrency;
              }

              if (offer.availability !== undefined && result.inStock === undefined) {
                result.inStock = parseAvailability(offer.availability);
              }
            }
          }

          // If we found a product with good data, return early
          if (result.name && result.inStock !== undefined) {
            result.confidence = 0.9; // High confidence for JSON-LD
            return result;
          }
        }
      }
    } catch (e) {
      // Invalid JSON, skip this script
      continue;
    }
  }

  if (Object.keys(result).length > 0) {
    result.confidence = 0.8;
    return result;
  }

  return null;
}

function isProductType(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) return false;

  const type = (item as Record<string, unknown>)['@type'];

  if (typeof type === 'string') {
    return type === 'Product' || type.endsWith('/Product');
  }

  if (Array.isArray(type)) {
    return type.some((t) => t === 'Product' || t.endsWith('/Product'));
  }

  return false;
}

function extractImageUrl(image: string | string[] | { url?: string }): string | null {
  if (typeof image === 'string') {
    return image;
  }

  if (Array.isArray(image) && image.length > 0) {
    return typeof image[0] === 'string' ? image[0] : null;
  }

  if (typeof image === 'object' && !Array.isArray(image) && image.url) {
    return image.url;
  }

  return null;
}

function parsePrice(price: number | string): number | null {
  if (typeof price === 'number') {
    return Math.round(price * 100); // Convert to cents
  }

  if (typeof price === 'string') {
    const cleaned = price.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      return Math.round(parsed * 100);
    }
  }

  return null;
}

function parseAvailability(availability: string): boolean {
  const lower = availability.toLowerCase();

  // Schema.org availability values
  const inStockValues = [
    'instock',
    'in_stock',
    'availablefororder',
    'available',
    'limitedavailability',
    'onlineonly',
    'preorder',
    'presale',
  ];

  const outOfStockValues = [
    'outofstock',
    'out_of_stock',
    'soldout',
    'sold_out',
    'discontinued',
    'unavailable',
  ];

  for (const value of inStockValues) {
    if (lower.includes(value)) {
      return true;
    }
  }

  for (const value of outOfStockValues) {
    if (lower.includes(value)) {
      return false;
    }
  }

  // Default to in stock if we can't determine
  return true;
}
