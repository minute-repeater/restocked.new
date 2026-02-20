import * as cheerio from 'cheerio';
import type { ExtractedProductData } from '@restocked/shared';

/**
 * Extracts product data by analyzing DOM elements.
 * This is the fallback when structured data isn't available.
 */
export function extractFromDom(html: string): Partial<ExtractedProductData> | null {
  const $ = cheerio.load(html);
  const result: Partial<ExtractedProductData> = {};

  // ===== PRODUCT NAME =====
  const nameSelectors = [
    'h1[itemprop="name"]',
    '[data-testid="product-title"]',
    '[data-testid="productTitle"]',
    '.product-title',
    '.product-name',
    '.pdp-title',
    '#productTitle', // Amazon
    'h1.product-title',
    'h1.title',
    '[class*="ProductTitle"]',
    '[class*="product-title"]',
    '[class*="productName"]',
    // Shopify-specific selectors
    '.product-single__title',
    '.product__title',
    '[data-product-title]',
    '.product-meta__title',
    'h1',
  ];

  for (const selector of nameSelectors) {
    const element = $(selector).first();
    const text = element.text().trim();
    if (text && text.length > 0 && text.length < 500) {
      result.name = text;
      break;
    }
  }

  // ===== IMAGE =====
  const imageSelectors = [
    'img[itemprop="image"]',
    '[data-testid="product-image"] img',
    '.product-image img',
    '.pdp-image img',
    '#landingImage', // Amazon
    '.primary-image img',
    '[class*="ProductImage"] img',
    '[class*="product-image"] img',
    // Shopify-specific selectors
    '.product-single__photo img',
    '.product__image img',
    '.product-featured-media img',
    '[data-product-featured-image]',
    '.product-gallery img',
  ];

  for (const selector of imageSelectors) {
    const element = $(selector).first();
    const src = element.attr('src') || element.attr('data-src');
    if (src && src.startsWith('http')) {
      result.imageUrl = src;
      break;
    }
  }

  // ===== PRICE =====
  const priceSelectors = [
    '[itemprop="price"]',
    '[data-testid="product-price"]',
    '.product-price',
    '.price-current',
    '.sale-price',
    '#priceblock_ourprice', // Amazon
    '#priceblock_dealprice',
    '.a-price .a-offscreen', // Amazon new
    '[class*="Price"]',
    '[class*="price"]',
    // Shopify-specific selectors
    '.product__price',
    '.product-single__price',
    '[data-product-price]',
    '.money',
    '.price__regular .price-item',
    '.product-price__price',
  ];

  for (const selector of priceSelectors) {
    const element = $(selector).first();

    // Check for content attribute first (structured)
    const contentAttr = element.attr('content');
    if (contentAttr) {
      const price = parsePrice(contentAttr);
      if (price !== null) {
        result.price = price;
        break;
      }
    }

    // Then check text content
    const text = element.text().trim();
    const price = parsePrice(text);
    if (price !== null) {
      result.price = price;
      break;
    }
  }

  // ===== STOCK STATUS =====
  result.inStock = determineStockStatus($);

  if (Object.keys(result).length > 0) {
    result.confidence = 0.5; // Lower confidence for DOM parsing
    return result;
  }

  return null;
}

/**
 * Determines stock status by analyzing various DOM indicators.
 */
function determineStockStatus($: cheerio.CheerioAPI): boolean | null {
  const pageText = $('body').text().toLowerCase();

  // ===== OUT OF STOCK INDICATORS =====
  const outOfStockIndicators = [
    'out of stock',
    'sold out',
    'currently unavailable',
    'not available',
    'no longer available',
    'out-of-stock',
    'oos',
    'notify me when available',
    'email when in stock',
    'back in stock notification',
    'waitlist',
    'coming soon',
  ];

  for (const indicator of outOfStockIndicators) {
    if (pageText.includes(indicator)) {
      // Verify it's not negated (e.g., "not out of stock")
      const index = pageText.indexOf(indicator);
      const before = pageText.slice(Math.max(0, index - 10), index);
      if (!before.includes('not ') && !before.includes("n't ")) {
        return false;
      }
    }
  }

  // ===== IN STOCK INDICATORS =====
  const inStockIndicators = [
    'in stock',
    'add to cart',
    'add to bag',
    'add to basket',
    'buy now',
    'available',
    'ships from',
    'ready to ship',
    'in-stock',
  ];

  for (const indicator of inStockIndicators) {
    if (pageText.includes(indicator)) {
      return true;
    }
  }

  // Check for add to cart button being enabled
  const addToCartSelectors = [
    'button[data-testid="add-to-cart"]',
    '#add-to-cart-button',
    '.add-to-cart',
    '[class*="AddToCart"]',
    'button:contains("Add to Cart")',
    'button:contains("Add to Bag")',
    // Shopify-specific selectors
    '.product-form__cart-submit',
    '.product-form__submit',
    '[name="add"]',
    '.btn-add-to-cart',
    '.shopify-payment-button button',
  ];

  for (const selector of addToCartSelectors) {
    const button = $(selector).first();
    if (button.length > 0) {
      const disabled = button.attr('disabled');
      const ariaDisabled = button.attr('aria-disabled');
      const buttonText = button.text().toLowerCase();

      // Check if button says "sold out" or similar
      if (buttonText.includes('sold out') || buttonText.includes('unavailable')) {
        return false;
      }

      if (!disabled && ariaDisabled !== 'true') {
        return true;
      }
    }
  }

  // Couldn't determine
  return null;
}

/**
 * Parses a price string to cents.
 */
function parsePrice(priceStr: string): number | null {
  // Remove currency symbols and whitespace
  const cleaned = priceStr.replace(/[^0-9.,]/g, '').trim();

  if (!cleaned) return null;

  // Handle different formats (1,234.56 or 1.234,56)
  let normalized = cleaned;

  // If comma appears after period, it's the decimal separator (European)
  if (cleaned.indexOf(',') > cleaned.indexOf('.') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Otherwise assume comma is thousands separator
    normalized = cleaned.replace(/,/g, '');
  }

  const price = parseFloat(normalized);
  if (isNaN(price)) return null;

  return Math.round(price * 100);
}
