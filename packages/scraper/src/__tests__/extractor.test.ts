import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExtractedProductData } from '@covet/shared';

// Mock the fetcher module
vi.mock('../fetcher/index.js', () => ({
  fetchPage: vi.fn(),
}));

// Mock parsers to control inputs
vi.mock('../parser/jsonld.js', () => ({
  extractFromJsonLd: vi.fn(),
}));
vi.mock('../parser/meta.js', () => ({
  extractFromMeta: vi.fn(),
}));
vi.mock('../parser/dom.js', () => ({
  extractFromDom: vi.fn(),
}));

import { extractProductData } from '../extractor.js';
import { fetchPage } from '../fetcher/index.js';
import { extractFromJsonLd } from '../parser/jsonld.js';
import { extractFromMeta } from '../parser/meta.js';
import { extractFromDom } from '../parser/dom.js';

// Helpers
function mockFetch(overrides: Partial<{ html: string; finalUrl: string; statusCode: number; usedBrowser: boolean }> = {}) {
  vi.mocked(fetchPage).mockResolvedValue({
    html: '<html></html>',
    finalUrl: 'https://www.example.com/product/leather-bag',
    statusCode: 200,
    usedBrowser: false,
    ...overrides,
  });
}

function mockParsers(
  jsonld: Partial<ExtractedProductData> | null = null,
  meta: Partial<ExtractedProductData> | null = null,
  dom: Partial<ExtractedProductData> | null = null,
) {
  vi.mocked(extractFromJsonLd).mockReturnValue(jsonld);
  vi.mocked(extractFromMeta).mockReturnValue(meta);
  vi.mocked(extractFromDom).mockReturnValue(dom);
}

describe('extractProductData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Merge logic: highest confidence source wins per field
  // ---------------------------------------------------------------------------
  describe('merge logic', () => {
    it('prefers JSON-LD (confidence 0.9) over Meta (0.6) and DOM (0.5) for each field', async () => {
      mockFetch();
      mockParsers(
        { name: 'JSON-LD Name', price: 10000, confidence: 0.9 },
        { name: 'Meta Name', price: 8000, imageUrl: 'https://img.meta/photo.jpg', confidence: 0.6 },
        { name: 'DOM Name', price: 5000, imageUrl: 'https://img.dom/photo.jpg', inStock: true, confidence: 0.5 },
      );

      const { data } = await extractProductData('https://www.example.com/product/leather-bag');

      // Name and price come from JSON-LD (highest confidence)
      expect(data.name).toBe('JSON-LD Name');
      expect(data.price).toBe(10000);
      // imageUrl fills in from Meta (JSON-LD didn't provide it)
      expect(data.imageUrl).toBe('https://img.meta/photo.jpg');
      // inStock fills in from DOM (JSON-LD and Meta didn't provide it)
      expect(data.inStock).toBe(true);
    });

    it('fills gaps from lower-confidence sources when higher sources are missing fields', async () => {
      mockFetch();
      mockParsers(
        { name: 'Silk Scarf', confidence: 0.9 },           // Only name
        { price: 8500, currency: 'EUR', confidence: 0.6 },  // Only price + currency
        { imageUrl: 'https://img.dom/scarf.jpg', inStock: false, confidence: 0.5 },
      );

      const { data } = await extractProductData('https://www.example.com/product/silk-scarf');

      expect(data.name).toBe('Silk Scarf');
      expect(data.price).toBe(8500);
      expect(data.currency).toBe('EUR');
      expect(data.imageUrl).toBe('https://img.dom/scarf.jpg');
      expect(data.inStock).toBe(false);
    });

    it('handles all parsers returning null', async () => {
      mockFetch();
      mockParsers(null, null, null);

      const { data } = await extractProductData('https://www.example.com/product/mystery');

      expect(data.name).toBeNull();
      expect(data.price).toBeNull();
      expect(data.inStock).toBeNull();
      expect(data.imageUrl).toBeNull();
      expect(data.currency).toBe('USD'); // default
      expect(data.variants).toEqual([]);
    });

    it('uses variants from the highest-confidence source that has them', async () => {
      mockFetch();
      mockParsers(
        { name: 'T-Shirt', confidence: 0.9 },
        {
          variants: [
            { name: 'Size: M', sku: 'TSH-M', inStock: true, price: null },
            { name: 'Size: L', sku: 'TSH-L', inStock: false, price: null },
          ],
          confidence: 0.6,
        },
        {
          variants: [{ name: 'Size: S', sku: null, inStock: null, price: null }],
          confidence: 0.5,
        },
      );

      const { data } = await extractProductData('https://www.example.com/product/tshirt');

      // Variants should come from Meta (0.6) since JSON-LD had none
      expect(data.variants).toHaveLength(2);
      expect(data.variants[0].name).toBe('Size: M');
      expect(data.variants[1].name).toBe('Size: L');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Error page name rejection (isErrorPageName)
  // ---------------------------------------------------------------------------
  describe('error page name rejection', () => {
    it('rejects "404" and "Page not found" names', async () => {
      const errorNames = [
        '404',
        '404 Not Found',
        'Page not found',
        "Page can't be found",
        'Error 500',
      ];

      for (const errorName of errorNames) {
        vi.clearAllMocks();
        mockFetch();
        mockParsers({ name: errorName, price: 5000, inStock: true, confidence: 0.9 });

        const { data } = await extractProductData('https://www.example.com/product/gone');
        expect(data.name).toBeNull();
      }
    });

    it('rejects "Access Denied" and "Forbidden" names', async () => {
      const blockedNames = [
        'Access Denied',
        'Access Blocked - Please Try Again',
        'Forbidden',
      ];

      for (const name of blockedNames) {
        vi.clearAllMocks();
        mockFetch();
        mockParsers({ name, price: 5000, confidence: 0.9 });

        const { data } = await extractProductData('https://www.example.com/product/blocked');
        expect(data.name).toBeNull();
      }
    });

    it('rejects names containing "Our Legacy - 404" pattern', async () => {
      mockFetch();
      // The name has "404" in it, which matches the error pattern
      mockParsers({ name: 'Our Legacy - 404', price: 5000, confidence: 0.9 });

      const { data } = await extractProductData('https://www.example.com/product/missing');
      expect(data.name).toBeNull();
    });

    it('rejects names longer than 200 characters as garbage', async () => {
      mockFetch();
      const longName = 'A'.repeat(201);
      mockParsers({ name: longName, price: 5000, confidence: 0.9 });

      const { data } = await extractProductData('https://www.example.com/product/garbage');
      expect(data.name).toBeNull();
    });

    it('rejects generic retailer homepage names like "Mytheresa", "SSENSE", "Net-a-Porter"', async () => {
      const retailerNames = [
        'Mytheresa',
        'SSENSE',
        'Net-a-Porter',
        'Mr Porter',
        'Farfetch',
        'Selfridges',
        'Nordstrom',
      ];

      for (const name of retailerNames) {
        vi.clearAllMocks();
        mockFetch();
        mockParsers({ name, price: 5000, inStock: true, confidence: 0.9 });

        const { data } = await extractProductData('https://www.example.com/product/home');
        expect(data.name).toBeNull();
      }
    });

    it('allows valid product names that happen to contain a retailer brand', async () => {
      mockFetch();
      // This is > 50 chars and includes a real product name after the retailer, so it should pass
      mockParsers({
        name: 'Mytheresa - Saint Laurent Leather Monogram Shoulder Bag',
        price: 125000,
        inStock: true,
        confidence: 0.9,
      });

      const { data } = await extractProductData('https://www.mytheresa.com/bag');
      expect(data.name).toBe('Mytheresa - Saint Laurent Leather Monogram Shoulder Bag');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Non-product page redirect detection (isNonProductPage)
  // ---------------------------------------------------------------------------
  describe('non-product page redirect detection', () => {
    it('discards results when redirected to homepage "/"', async () => {
      mockFetch({ finalUrl: 'https://www.example.com/' });
      mockParsers({ name: 'Homepage', price: 5000, inStock: true, confidence: 0.9 });

      const { data } = await extractProductData('https://www.example.com/product/expired');

      expect(data.name).toBeNull();
      expect(data.price).toBeNull();
      expect(data.inStock).toBeNull();
      expect(data.imageUrl).toBeNull();
    });

    it('discards results when redirected to locale root "/en-us/"', async () => {
      mockFetch({ finalUrl: 'https://www.example.com/en-us/' });
      mockParsers({ name: 'Store', price: 5000, inStock: true, confidence: 0.9 });

      const { data } = await extractProductData('https://www.example.com/product/gone');

      expect(data.name).toBeNull();
      expect(data.price).toBeNull();
      expect(data.inStock).toBeNull();
    });

    it('discards results when redirected to login, search, or cart pages', async () => {
      const nonProductPaths = [
        'https://www.example.com/login',
        'https://www.example.com/search',
        'https://www.example.com/cart',
        'https://www.example.com/checkout',
      ];

      for (const redirectUrl of nonProductPaths) {
        vi.clearAllMocks();
        mockFetch({ finalUrl: redirectUrl });
        mockParsers({ name: 'Some Page', price: 5000, inStock: true, confidence: 0.9 });

        const { data } = await extractProductData('https://www.example.com/product/restricted');
        expect(data.name).toBeNull();
        expect(data.price).toBeNull();
      }
    });

    it('discards results when redirected to bare collection root "/collections/"', async () => {
      mockFetch({ finalUrl: 'https://www.example.com/collections/' });
      mockParsers({ name: 'All Products', price: 5000, inStock: true, confidence: 0.9 });

      const { data } = await extractProductData('https://www.example.com/product/removed');

      expect(data.name).toBeNull();
      expect(data.price).toBeNull();
    });

    it('keeps results when there is no redirect (same URL)', async () => {
      const url = 'https://www.example.com/product/leather-bag';
      mockFetch({ finalUrl: url });
      mockParsers({ name: 'Leather Bag', price: 25000, inStock: true, confidence: 0.9 });

      const { data } = await extractProductData(url);

      expect(data.name).toBe('Leather Bag');
      expect(data.price).toBe(25000);
      expect(data.inStock).toBe(true);
    });

    it('discards results when redirected to a different domain homepage', async () => {
      mockFetch({ finalUrl: 'https://www.store-us.com/' });
      mockParsers({ name: 'Store US', price: 5000, inStock: true, confidence: 0.9 });

      const { data } = await extractProductData('https://www.store.co.uk/product/shirt');

      expect(data.name).toBeNull();
      expect(data.price).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Default to in-stock
  // ---------------------------------------------------------------------------
  describe('default to in-stock', () => {
    it('defaults inStock to true when name + price exist but inStock is not set', async () => {
      mockFetch();
      mockParsers(
        { name: 'Cashmere Sweater', price: 35000, confidence: 0.9 },
        null,
        null,
      );

      const { data } = await extractProductData('https://www.example.com/product/sweater');

      expect(data.inStock).toBe(true);
    });

    it('does NOT default inStock when name is missing', async () => {
      mockFetch();
      mockParsers(
        { price: 35000, confidence: 0.9 },
        null,
        null,
      );

      const { data } = await extractProductData('https://www.example.com/product/unnamed');

      expect(data.inStock).toBeNull();
    });

    it('does NOT default inStock when price is missing', async () => {
      mockFetch();
      mockParsers(
        { name: 'Cashmere Sweater', confidence: 0.9 },
        null,
        null,
      );

      const { data } = await extractProductData('https://www.example.com/product/no-price');

      expect(data.inStock).toBeNull();
    });

    it('preserves explicit inStock=false even when name + price exist', async () => {
      mockFetch();
      mockParsers(
        { name: 'Sold Out Jacket', price: 45000, inStock: false, confidence: 0.9 },
        null,
        null,
      );

      const { data } = await extractProductData('https://www.example.com/product/jacket');

      expect(data.inStock).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Confidence calculation
  // ---------------------------------------------------------------------------
  describe('confidence calculation', () => {
    it('returns 1.0 when all fields are present (name=2, stock=3, price=2, image=1 / max=8)', async () => {
      mockFetch();
      mockParsers({
        name: 'Full Product',
        price: 10000,
        inStock: true,
        imageUrl: 'https://img.example.com/full.jpg',
        confidence: 0.9,
      });

      const { data } = await extractProductData('https://www.example.com/product/full');

      expect(data.confidence).toBe(1.0); // 8/8
    });

    it('returns 0 when no fields are extracted', async () => {
      mockFetch();
      mockParsers(null, null, null);

      const { data } = await extractProductData('https://www.example.com/product/empty');

      // No name, no price, no stock, no image → 0/8
      expect(data.confidence).toBe(0);
    });

    it('calculates partial confidence correctly', async () => {
      mockFetch();
      // Only name (2/8 = 0.25)
      mockParsers({ name: 'Just a Name', confidence: 0.9 }, null, null);

      const { data } = await extractProductData('https://www.example.com/product/partial');

      expect(data.confidence).toBe(0.25); // 2/8
    });

    it('scores name + price as 0.5', async () => {
      mockFetch();
      mockParsers({ name: 'Product', price: 5000, confidence: 0.9 }, null, null);

      const { data } = await extractProductData('https://www.example.com/product/np');

      // name (2) + price (2) + inStock defaulted to true (3) = 7/8
      // BUT inStock gets defaulted before confidence is already calculated in merge
      // Actually: merge calculates confidence BEFORE the default-to-in-stock logic
      // Merge sees: name=2, price=2 → 4/8 = 0.5, then after merge, inStock is defaulted
      expect(data.confidence).toBe(0.5);
    });

    it('scores stock status as the heaviest field (3 out of 8)', async () => {
      mockFetch();
      // Only stock status
      mockParsers({ inStock: false, confidence: 0.9 }, null, null);

      const { data } = await extractProductData('https://www.example.com/product/stock-only');

      expect(data.confidence).toBe(0.375); // 3/8
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Retailer extraction from URL
  // ---------------------------------------------------------------------------
  describe('retailer extraction', () => {
    it('extracts retailer from the URL hostname', async () => {
      mockFetch({ finalUrl: 'https://www.mytheresa.com/en-us/product/123' });
      mockParsers({ name: 'Designer Bag', price: 100000, inStock: true, confidence: 0.9 });

      const { data } = await extractProductData('https://www.mytheresa.com/en-us/product/123');

      expect(data.retailer).toBe('mytheresa');
    });

    it('extracts retailer from various luxury domains', async () => {
      const cases: [string, string][] = [
        ['https://www.ssense.com/product/coat', 'ssense'],
        ['https://www.farfetch.com/shopping/jacket', 'farfetch'],
        ['https://www.net-a-porter.com/product/dress', 'net-a-porter'],
        ['https://www.nordstrom.com/s/shoes/12345', 'nordstrom'],
      ];

      for (const [url, expectedRetailer] of cases) {
        vi.clearAllMocks();
        mockFetch({ finalUrl: url });
        mockParsers({ name: 'Product', price: 5000, inStock: true, confidence: 0.9 });

        const { data } = await extractProductData(url);
        expect(data.retailer).toBe(expectedRetailer);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. fetchResult passthrough
  // ---------------------------------------------------------------------------
  describe('fetchResult passthrough', () => {
    it('returns the fetchResult alongside extracted data', async () => {
      mockFetch({
        html: '<html><body>Test</body></html>',
        finalUrl: 'https://www.example.com/product/bag',
        statusCode: 200,
        usedBrowser: true,
      });
      mockParsers({ name: 'Bag', confidence: 0.9 });

      const { fetchResult } = await extractProductData('https://www.example.com/product/bag');

      expect(fetchResult.statusCode).toBe(200);
      expect(fetchResult.usedBrowser).toBe(true);
      expect(fetchResult.finalUrl).toBe('https://www.example.com/product/bag');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('defaults currency to USD when not provided by any source', async () => {
      mockFetch();
      mockParsers({ name: 'No Currency Product', price: 5000, confidence: 0.9 });

      const { data } = await extractProductData('https://www.example.com/product/noc');

      expect(data.currency).toBe('USD');
    });

    it('defaults variants to empty array when not provided', async () => {
      mockFetch();
      mockParsers({ name: 'Simple Product', confidence: 0.9 });

      const { data } = await extractProductData('https://www.example.com/product/simple');

      expect(data.variants).toEqual([]);
    });

    it('calls all three parsers with the fetched HTML', async () => {
      const html = '<html><body>Product Page</body></html>';
      mockFetch({ html });
      mockParsers(null, null, null);

      await extractProductData('https://www.example.com/product/test');

      expect(extractFromJsonLd).toHaveBeenCalledWith(html);
      expect(extractFromMeta).toHaveBeenCalledWith(html);
      expect(extractFromDom).toHaveBeenCalledWith(html);
    });

    it('propagates fetchPage errors', async () => {
      vi.mocked(fetchPage).mockRejectedValue(new Error('Failed to fetch page: https://down.com/nope'));

      await expect(extractProductData('https://down.com/nope')).rejects.toThrow(
        'Failed to fetch page',
      );
    });
  });
});
