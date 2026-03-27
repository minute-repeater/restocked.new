import * as cheerio from 'cheerio';
import type { ExtractedProductData } from '@covet/shared';

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
    '[data-test="product-name"]',
    '[data-component="ProductName"]',
    '.product-title',
    '.product-name',
    '.product-detail__name',
    '.product-info__name',
    '.pdp-title',
    '#productTitle', // Amazon
    'h1.product-title',
    'h1.title',
    '[class*="ProductTitle"]',
    '[class*="product-title"]',
    '[class*="productName"]',
    '[class*="ProductName"]',
    // Shopify-specific selectors
    '.product-single__title',
    '.product__title',
    '[data-product-title]',
    '.product-meta__title',
    // Fallback — any h1 with data-testid
    'h1[data-testid]',
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
    '.product-detail__image img',
    '.pdp-image img',
    '#landingImage', // Amazon
    '.primary-image img',
    '[class*="ProductImage"] img',
    '[class*="product-image"] img',
    '[class*="ProductGallery"] img',
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
    '[data-test="product-price"]',
    '.product-price',
    '.price-current',
    '.sale-price',
    '.price-sales',
    '.product-price__amount',
    '#priceblock_ourprice', // Amazon
    '#priceblock_dealprice',
    '.a-price .a-offscreen', // Amazon new
    'span[data-price]',
    '.price--current',
    '.price--sale',
    '[class*="Price"]:not([class*="compare"]):not([class*="Compare"]):not([class*="was"]):not([class*="Was"])',
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

  // ===== CURRENCY DETECTION =====
  if (result.price !== undefined && !result.currency) {
    result.currency = detectCurrency($);
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
 * Gets the product context scope — restricts text searches to the product
 * detail area to avoid false positives from footer/sidebar/nav text.
 */
function getProductScope($: cheerio.CheerioAPI) {
  const productContainerSelectors = [
    '[itemscope][itemtype*="Product"]',
    '[data-testid="product-detail"]',
    '[data-component="ProductDetail"]',
    '.product-detail',
    '.product-info',
    '.pdp',
    '.product-page',
    'main [class*="product"]',
    'main [class*="Product"]',
    'main',
  ];

  for (const selector of productContainerSelectors) {
    const container = $(selector).first();
    if (container.length > 0 && container.text().trim().length > 50) {
      return container;
    }
  }

  // Fallback to body if no product container found
  return $('body');
}

/**
 * Determines stock status by analyzing DOM indicators.
 * Scopes text searches to product area to avoid false positives.
 */
function determineStockStatus($: cheerio.CheerioAPI): boolean | null {
  const scope = getProductScope($);
  const scopeText = scope.text().toLowerCase();

  // ===== OUT OF STOCK INDICATORS (text-based) =====
  const outOfStockIndicators = [
    'out of stock',
    'sold out',
    'currently unavailable',
    'not available',
    'no longer available',
    'out-of-stock',
    'notify me when available',
    'email when in stock',
    'back in stock notification',
    'coming soon',
  ];

  for (const indicator of outOfStockIndicators) {
    if (scopeText.includes(indicator)) {
      // Verify it's not negated (e.g., "not out of stock")
      const index = scopeText.indexOf(indicator);
      const before = scopeText.slice(Math.max(0, index - 10), index);
      if (!before.includes('not ') && !before.includes("n't ")) {
        return false;
      }
    }
  }

  // ===== IN STOCK INDICATORS (text-based) =====
  const inStockIndicators = [
    'in stock',
    'add to cart',
    'add to bag',
    'add to basket',
    'buy now',
    'ships from',
    'ready to ship',
    'in-stock',
  ];

  for (const indicator of inStockIndicators) {
    if (scopeText.includes(indicator)) {
      return true;
    }
  }

  // ===== CHECK ADD-TO-CART BUTTONS =====
  const addToCartSelectors = [
    'button[data-testid="add-to-cart"]',
    '#add-to-cart-button',
    '.add-to-cart',
    '[class*="AddToCart"]',
    '[class*="addToCart"]',
    '[class*="add-to-cart"]',
    'button:contains("Add to Cart")',
    'button:contains("Add to Bag")',
    'button:contains("Add to Basket")',
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
      if (buttonText.includes('sold out') || buttonText.includes('unavailable') || buttonText.includes('notify')) {
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
 * Detect currency from price symbols or page metadata.
 */
function detectCurrency($: cheerio.CheerioAPI): string | null {
  // Check itemprop priceCurrency
  const currencyMeta = $('[itemprop="priceCurrency"]').first();
  if (currencyMeta.length > 0) {
    const content = currencyMeta.attr('content');
    if (content) return content.toUpperCase();
  }

  // Check meta tags
  const ogCurrency = $('meta[property="product:price:currency"]').attr('content');
  if (ogCurrency) return ogCurrency.toUpperCase();

  // Detect from first price-like text on page
  const priceElements = $('[itemprop="price"], .product-price, .price, .money, [class*="price"], [class*="Price"]');
  for (const el of priceElements) {
    const text = $(el).text().trim();
    if (text.includes('£')) return 'GBP';
    if (text.includes('€')) return 'EUR';
    if (text.includes('$') && !text.includes('CA$') && !text.includes('AU$')) return 'USD';
    if (text.includes('CA$') || text.includes('C$')) return 'CAD';
    if (text.includes('AU$') || text.includes('A$')) return 'AUD';
    if (text.includes('¥')) return 'JPY';
  }

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
