import { describe, it, expect } from 'vitest';
import { normalizeProductUrl, extractRetailer, isValidProductUrl } from '../utils/url.js';

describe('normalizeProductUrl', () => {
  it('forces HTTPS', () => {
    const result = normalizeProductUrl('http://example.com/product/123');
    expect(result).toMatch(/^https:\/\//);
  });

  it('removes UTM tracking parameters', () => {
    const result = normalizeProductUrl(
      'https://example.com/product/123?utm_source=google&utm_medium=cpc&utm_campaign=sale'
    );
    expect(result).toBe('https://example.com/product/123');
  });

  it('removes fbclid, gclid, and other tracking params', () => {
    const result = normalizeProductUrl(
      'https://example.com/product/123?fbclid=abc123&gclid=xyz789&ref=homepage'
    );
    expect(result).toBe('https://example.com/product/123');
  });

  it('preserves non-tracking query parameters', () => {
    const result = normalizeProductUrl(
      'https://example.com/product/123?variant=blue&size=M'
    );
    expect(result).toContain('variant=blue');
    expect(result).toContain('size=M');
  });

  it('removes trailing slash', () => {
    const result = normalizeProductUrl('https://example.com/product/123/');
    expect(result).toBe('https://example.com/product/123');
  });

  it('does not remove slash from root path', () => {
    const result = normalizeProductUrl('https://example.com/');
    expect(result).toBe('https://example.com/');
  });

  it('removes hash fragments', () => {
    const result = normalizeProductUrl('https://example.com/product/123#reviews');
    expect(result).toBe('https://example.com/product/123');
  });

  it('lowercases hostname', () => {
    const result = normalizeProductUrl('https://EXAMPLE.COM/Product/123');
    expect(result).toContain('example.com');
  });

  it('returns original string for invalid URLs', () => {
    const result = normalizeProductUrl('not-a-url');
    expect(result).toBe('not-a-url');
  });

  it('handles complex real-world URLs', () => {
    const result = normalizeProductUrl(
      'http://www.shopify-store.com/products/cool-jacket?utm_source=ig&ref=bio&variant=42494842208317'
    );
    expect(result).toContain('https://');
    expect(result).toContain('variant=42494842208317');
    expect(result).not.toContain('utm_source');
    expect(result).not.toContain('ref=bio');
  });
});

describe('extractRetailer', () => {
  it('extracts retailer from standard URL', () => {
    expect(extractRetailer('https://www.amazon.com/dp/B0D1XD1ZV3')).toBe('amazon');
  });

  it('strips www prefix', () => {
    expect(extractRetailer('https://www.apple.com/shop/buy-mac')).toBe('apple');
  });

  it('handles URLs without www', () => {
    expect(extractRetailer('https://akindofguise.com/products/pants')).toBe('akindofguise');
  });

  it('handles subdomains', () => {
    expect(extractRetailer('https://shop.example.com/products')).toBe('example');
  });

  it('returns null for invalid URLs', () => {
    expect(extractRetailer('not-a-url')).toBeNull();
  });
});

describe('isValidProductUrl', () => {
  it('accepts https URLs', () => {
    expect(isValidProductUrl('https://example.com/product')).toBe(true);
  });

  it('accepts http URLs', () => {
    expect(isValidProductUrl('http://example.com/product')).toBe(true);
  });

  it('rejects non-http protocols', () => {
    expect(isValidProductUrl('ftp://example.com/product')).toBe(false);
  });

  it('rejects javascript: protocol', () => {
    expect(isValidProductUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects non-URL strings', () => {
    expect(isValidProductUrl('not a url')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidProductUrl('')).toBe(false);
  });
});
