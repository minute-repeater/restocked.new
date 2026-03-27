import { describe, it, expect } from 'vitest';
import { extractFromDom } from '../../parser/dom.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap a body fragment in a minimal HTML document. */
function html(body: string, head = ''): string {
  return `<html><head>${head}</head><body>${body}</body></html>`;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('extractFromDom', () => {
  // ===================================================================
  // NAME EXTRACTION
  // ===================================================================
  describe('name extraction', () => {
    it('extracts name from h1[itemprop="name"]', () => {
      const result = extractFromDom(
        html('<h1 itemprop="name">Cashmere Sweater</h1>')
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Cashmere Sweater');
    });

    it('extracts name from .product-title', () => {
      const result = extractFromDom(
        html('<div class="product-title">Merino Wool Coat</div>')
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Merino Wool Coat');
    });

    it('extracts name from .product-name when earlier selectors miss', () => {
      const result = extractFromDom(
        html('<span class="product-name">Silk Blouse</span>')
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Silk Blouse');
    });

    it('falls back to plain h1 when no specific selectors match', () => {
      const result = extractFromDom(
        html('<h1>Linen Trousers</h1>')
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Linen Trousers');
    });

    it('prefers higher-priority selector over lower one', () => {
      const result = extractFromDom(
        html(`
          <h1 itemprop="name">Priority Name</h1>
          <div class="product-title">Fallback Name</div>
          <h1>Generic Heading</h1>
        `)
      );
      expect(result!.name).toBe('Priority Name');
    });

    it('rejects names that are 500 characters or longer', () => {
      const longName = 'A'.repeat(500);
      // Use .product-title for the long name and .product-name for fallback
      // so the h1 fallback selector is not involved
      const result = extractFromDom(
        html(`<div class="product-title">${longName}</div><div class="product-name">Valid Fallback</div>`)
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Valid Fallback');
    });

    it('skips empty name elements and falls through', () => {
      // .product-title is empty, .product-name is whitespace-only,
      // .product-detail__name has the real name
      const result = extractFromDom(
        html(`
          <div class="product-title"></div>
          <div class="product-name">   </div>
          <div class="product-detail__name">Actual Product</div>
        `)
      );
      expect(result!.name).toBe('Actual Product');
    });

    it('extracts name from Shopify .product-single__title', () => {
      const result = extractFromDom(
        html('<h1 class="product-single__title">Oversized Blazer</h1>')
      );
      expect(result!.name).toBe('Oversized Blazer');
    });

    it('extracts name from Amazon #productTitle', () => {
      const result = extractFromDom(
        html('<span id="productTitle">  Premium Leather Belt  </span>')
      );
      expect(result!.name).toBe('Premium Leather Belt');
    });
  });

  // ===================================================================
  // PRICE PARSING
  // ===================================================================
  describe('price parsing', () => {
    it('parses US-format price "$1,234.56" to 123456 cents', () => {
      const result = extractFromDom(
        html('<span class="product-price">$1,234.56</span>')
      );
      expect(result!.price).toBe(123456);
    });

    it('parses European-format price "1.234,56" to 123456 cents', () => {
      const result = extractFromDom(
        html('<span class="product-price">1.234,56 &euro;</span>')
      );
      expect(result!.price).toBe(123456);
    });

    it('parses simple price "$49.99" to 4999 cents', () => {
      const result = extractFromDom(
        html('<span class="product-price">$49.99</span>')
      );
      expect(result!.price).toBe(4999);
    });

    it('reads price from content attribute on [itemprop="price"]', () => {
      const result = extractFromDom(
        html('<meta itemprop="price" content="275.00">')
      );
      expect(result!.price).toBe(27500);
    });

    it('prefers content attribute over text content', () => {
      const result = extractFromDom(
        html('<span itemprop="price" content="99.00">$99.00 USD</span>')
      );
      expect(result!.price).toBe(9900);
    });

    it('handles whole-dollar prices without cents', () => {
      const result = extractFromDom(
        html('<span class="product-price">$250</span>')
      );
      expect(result!.price).toBe(25000);
    });

    it('returns no price when no price elements exist', () => {
      const result = extractFromDom(
        html('<h1>Some Product</h1>')
      );
      expect(result).not.toBeNull();
      expect(result!.price).toBeUndefined();
    });
  });

  // ===================================================================
  // STOCK STATUS
  // ===================================================================
  describe('stock status detection', () => {
    it('detects "out of stock" text as not in stock', () => {
      const result = extractFromDom(
        html(`
          <main>
            <div class="product-detail">
              <h1>Vintage Jacket</h1>
              <p class="availability">Out of Stock</p>
              ${'x'.repeat(50)}
            </div>
          </main>
        `)
      );
      expect(result!.inStock).toBe(false);
    });

    it('detects "sold out" text as not in stock', () => {
      const result = extractFromDom(
        html(`
          <main>
            <div class="product-detail">
              <h1>Limited Edition Bag</h1>
              <span>Sold Out</span>
              ${'x'.repeat(50)}
            </div>
          </main>
        `)
      );
      expect(result!.inStock).toBe(false);
    });

    it('detects "currently unavailable" as not in stock', () => {
      const result = extractFromDom(
        html(`
          <main>
            <div class="product-detail">
              <h1>Designer Shoes</h1>
              <div>This item is currently unavailable</div>
              ${'x'.repeat(50)}
            </div>
          </main>
        `)
      );
      expect(result!.inStock).toBe(false);
    });

    it('detects "add to cart" text as in stock', () => {
      const result = extractFromDom(
        html(`
          <main>
            <div class="product-detail">
              <h1>Classic T-Shirt</h1>
              <button>Add to Cart</button>
              ${'x'.repeat(50)}
            </div>
          </main>
        `)
      );
      expect(result!.inStock).toBe(true);
    });

    it('detects "add to bag" text as in stock', () => {
      const result = extractFromDom(
        html(`
          <main>
            <div class="product-detail">
              <h1>Denim Jeans</h1>
              <button>Add to Bag</button>
              ${'x'.repeat(50)}
            </div>
          </main>
        `)
      );
      expect(result!.inStock).toBe(true);
    });

    it('detects enabled add-to-cart button as in stock', () => {
      const result = extractFromDom(
        html('<button id="add-to-cart-button">Add to Cart</button>')
      );
      expect(result!.inStock).toBe(true);
    });

    it('detects add-to-cart button with "sold out" text as not in stock', () => {
      const result = extractFromDom(
        html('<button class="add-to-cart">Sold Out</button>')
      );
      expect(result!.inStock).toBe(false);
    });

    it('does not treat negated "out of stock" as unavailable', () => {
      const result = extractFromDom(
        html(`
          <main>
            <div class="product-detail">
              <h1>Available Item</h1>
              <p>This item is not out of stock</p>
              <button>Add to Cart</button>
              ${'x'.repeat(50)}
            </div>
          </main>
        `)
      );
      // "not out of stock" should be skipped; "add to cart" means in stock
      expect(result!.inStock).toBe(true);
    });

    it('returns null when stock status cannot be determined', () => {
      const result = extractFromDom(
        html('<h1>Mystery Product</h1><p>Some description text here.</p>')
      );
      expect(result!.inStock).toBeNull();
    });

    it('detects "notify me when available" as out of stock', () => {
      const result = extractFromDom(
        html(`
          <main>
            <div class="product-detail">
              <h1>Sold Out Sneakers</h1>
              <a href="#">Notify me when available</a>
              ${'x'.repeat(50)}
            </div>
          </main>
        `)
      );
      expect(result!.inStock).toBe(false);
    });
  });

  // ===================================================================
  // IMAGE EXTRACTION
  // ===================================================================
  describe('image extraction', () => {
    it('extracts image from img[itemprop="image"]', () => {
      const result = extractFromDom(
        html('<img itemprop="image" src="https://cdn.example.com/product.jpg">')
      );
      expect(result!.imageUrl).toBe('https://cdn.example.com/product.jpg');
    });

    it('extracts image from .product-image img', () => {
      const result = extractFromDom(
        html('<div class="product-image"><img src="https://cdn.example.com/shoe.jpg"></div>')
      );
      expect(result!.imageUrl).toBe('https://cdn.example.com/shoe.jpg');
    });

    it('ignores relative image URLs (no http prefix)', () => {
      const result = extractFromDom(
        html(`
          <img itemprop="image" src="/images/product.jpg">
          <h1>Some Product</h1>
        `)
      );
      // imageUrl should not be set since /images/product.jpg doesn't start with http
      expect(result!.imageUrl).toBeUndefined();
    });

    it('uses data-src attribute when src is missing', () => {
      const result = extractFromDom(
        html('<img itemprop="image" data-src="https://cdn.example.com/lazy.jpg">')
      );
      expect(result!.imageUrl).toBe('https://cdn.example.com/lazy.jpg');
    });

    it('picks the first matching image selector', () => {
      const result = extractFromDom(
        html(`
          <img itemprop="image" src="https://cdn.example.com/first.jpg">
          <div class="product-image"><img src="https://cdn.example.com/second.jpg"></div>
        `)
      );
      expect(result!.imageUrl).toBe('https://cdn.example.com/first.jpg');
    });

    it('extracts Shopify product featured image', () => {
      const result = extractFromDom(
        html('<img data-product-featured-image src="https://cdn.shopify.com/featured.jpg">')
      );
      expect(result!.imageUrl).toBe('https://cdn.shopify.com/featured.jpg');
    });
  });

  // ===================================================================
  // CURRENCY DETECTION
  // ===================================================================
  describe('currency detection', () => {
    it('detects GBP from pound symbol in price', () => {
      const result = extractFromDom(
        html('<span class="product-price">&pound;125.00</span>')
      );
      expect(result!.price).toBe(12500);
      expect(result!.currency).toBe('GBP');
    });

    it('detects EUR from euro symbol in price', () => {
      const result = extractFromDom(
        html('<span class="product-price">&euro;89.99</span>')
      );
      expect(result!.price).toBe(8999);
      expect(result!.currency).toBe('EUR');
    });

    it('detects USD from dollar symbol in price', () => {
      const result = extractFromDom(
        html('<span class="product-price">$199.00</span>')
      );
      expect(result!.price).toBe(19900);
      expect(result!.currency).toBe('USD');
    });

    it('detects currency from [itemprop="priceCurrency"] content attr', () => {
      const result = extractFromDom(
        html(`
          <span itemprop="price" content="350.00">$350.00</span>
          <meta itemprop="priceCurrency" content="usd">
        `)
      );
      expect(result!.price).toBe(35000);
      expect(result!.currency).toBe('USD');
    });

    it('detects currency from meta[property="product:price:currency"]', () => {
      const result = extractFromDom(
        html(
          '<span class="product-price">350</span>',
          '<meta property="product:price:currency" content="eur">'
        )
      );
      expect(result!.price).toBe(35000);
      expect(result!.currency).toBe('EUR');
    });

    it('detects CAD from "CA$" prefix', () => {
      const result = extractFromDom(
        html('<span class="product-price">CA$75.00</span>')
      );
      expect(result!.price).toBe(7500);
      expect(result!.currency).toBe('CAD');
    });

    it('does not set currency when no price is extracted', () => {
      const result = extractFromDom(html('<h1>No Price Here</h1>'));
      expect(result!.currency).toBeUndefined();
    });
  });

  // ===================================================================
  // PRODUCT SCOPE
  // ===================================================================
  describe('product scope', () => {
    it('scopes stock text search to .product-detail container', () => {
      // "sold out" only in footer, not in product scope
      const result = extractFromDom(
        html(`
          <main>
            <div class="product-detail">
              <h1>Leather Wallet</h1>
              <button>Add to Cart</button>
              ${'x'.repeat(50)}
            </div>
          </main>
          <footer>
            <p>Some previously sold out items may return</p>
          </footer>
        `)
      );
      // Should be in stock because the product scope has "add to cart"
      // and "sold out" is only in the footer, outside the scope
      expect(result!.inStock).toBe(true);
    });

    it('scopes stock text search to main element', () => {
      const result = extractFromDom(
        html(`
          <main>
            <h1>Canvas Bag</h1>
            <p>In Stock - Ships tomorrow</p>
            ${'x'.repeat(50)}
          </main>
          <aside>
            <p>Check our sold out archive</p>
          </aside>
        `)
      );
      expect(result!.inStock).toBe(true);
    });

    it('scopes to [itemtype*="Product"] container', () => {
      const result = extractFromDom(
        html(`
          <div itemscope itemtype="https://schema.org/Product">
            <h1 itemprop="name">Woven Scarf</h1>
            <span>In Stock</span>
            ${'x'.repeat(50)}
          </div>
          <div class="sidebar">
            <p>Sold out items list</p>
          </div>
        `)
      );
      expect(result!.inStock).toBe(true);
    });

    it('falls back to body when no product container exists', () => {
      // No product container selectors match, so body is the scope
      // "sold out" in body text will be detected
      const result = extractFromDom(
        html(`
          <div>
            <h1>Random Page</h1>
            <p>This item is sold out</p>
          </div>
        `)
      );
      expect(result!.inStock).toBe(false);
    });
  });

  // ===================================================================
  // CONFIDENCE & EDGE CASES
  // ===================================================================
  describe('confidence and edge cases', () => {
    it('always returns confidence 0.5 when data is found', () => {
      const result = extractFromDom(
        html('<h1>Any Product</h1>')
      );
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(0.5);
    });

    it('extracts multiple fields from a full product page', () => {
      const result = extractFromDom(
        html(`
          <main>
            <div class="product-detail" style="padding:20px">
              <h1 itemprop="name">Luxury Handbag</h1>
              <img itemprop="image" src="https://cdn.example.com/handbag.jpg">
              <span itemprop="price" content="2450.00">$2,450.00</span>
              <meta itemprop="priceCurrency" content="USD">
              <p>In Stock - Ready to Ship</p>
              ${'x'.repeat(50)}
            </div>
          </main>
        `)
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Luxury Handbag');
      expect(result!.imageUrl).toBe('https://cdn.example.com/handbag.jpg');
      expect(result!.price).toBe(245000);
      expect(result!.currency).toBe('USD');
      expect(result!.inStock).toBe(true);
      expect(result!.confidence).toBe(0.5);
    });

    it('returns result with only inStock when nothing else is found', () => {
      // Body text contains "sold out" and nothing else matches
      const result = extractFromDom(
        html('<div><p>This product is sold out.</p></div>')
      );
      expect(result).not.toBeNull();
      expect(result!.inStock).toBe(false);
      expect(result!.name).toBeUndefined();
      expect(result!.price).toBeUndefined();
      expect(result!.imageUrl).toBeUndefined();
    });
  });
});
