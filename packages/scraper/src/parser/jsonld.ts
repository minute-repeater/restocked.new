import * as cheerio from 'cheerio';
import type { ExtractedProductData } from '@covet/shared';

interface JsonLdProduct {
  '@type'?: string;
  name?: string;
  image?: string | string[] | { url?: string } | Array<{ url?: string }>;
  offers?: JsonLdOffer | JsonLdOffer[];
  sku?: string;
  mainEntity?: Record<string, unknown>;
}

interface JsonLdOffer {
  '@type'?: string;
  price?: number | string;
  lowPrice?: number | string;
  highPrice?: number | string;
  priceCurrency?: string;
  availability?: string;
  sku?: string;
  name?: string;
  offers?: JsonLdOffer | JsonLdOffer[];
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
        // Check for Product directly
        if (isProductType(item)) {
          extractProductFields(item as JsonLdProduct, result);
        }

        // Check for WebPage.mainEntity → Product (Net-a-Porter, Mytheresa pattern)
        if (typeof item === 'object' && item !== null) {
          const entity = (item as Record<string, unknown>).mainEntity;
          if (entity && isProductType(entity)) {
            extractProductFields(entity as JsonLdProduct, result);
          }
        }

        // If we found a product with good data, return early
        if (result.name && result.inStock !== undefined) {
          result.confidence = 0.9;
          return result;
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

/**
 * Extract all product fields from a JSON-LD Product item into the result.
 */
function extractProductFields(product: JsonLdProduct, result: Partial<ExtractedProductData>): void {
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
    extractOffersData(product.offers, result);
  }
}

/**
 * Recursively extract price/currency/availability from offers.
 * Handles Offer, AggregateOffer, and nested offers.
 */
function extractOffersData(
  offers: JsonLdOffer | JsonLdOffer[],
  result: Partial<ExtractedProductData>
): void {
  const offerList = Array.isArray(offers) ? offers : [offers];

  for (const offer of offerList) {
    const offerType = offer['@type'];

    // Handle AggregateOffer — use lowPrice
    if (offerType === 'AggregateOffer') {
      if (offer.lowPrice !== undefined && result.price === undefined) {
        result.price = parsePrice(offer.lowPrice);
      }
      if (offer.priceCurrency && !result.currency) {
        result.currency = offer.priceCurrency;
      }
      if (offer.availability !== undefined && result.inStock === undefined) {
        result.inStock = parseAvailability(offer.availability);
      }
      // AggregateOffer can contain nested offers
      if (offer.offers) {
        extractOffersData(offer.offers, result);
      }
      continue;
    }

    // Standard Offer
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

function extractImageUrl(image: string | string[] | { url?: string } | Array<{ url?: string }>): string | null {
  if (typeof image === 'string') {
    return image;
  }

  if (Array.isArray(image) && image.length > 0) {
    const first = image[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null && first.url) return first.url;
    return null;
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
