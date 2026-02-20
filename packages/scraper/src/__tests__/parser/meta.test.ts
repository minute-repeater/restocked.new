import { describe, it, expect } from 'vitest';
import { extractFromMeta } from '../../parser/meta.js';

describe('extractFromMeta', () => {
  it('extracts product data from Open Graph tags', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Cashmere Sweater" />
        <meta property="og:image" content="https://example.com/sweater.jpg" />
        <meta property="product:price:amount" content="250.00" />
        <meta property="product:price:currency" content="GBP" />
        <meta property="product:availability" content="instock" />
      </head><body></body></html>
    `;

    const result = extractFromMeta(html);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Cashmere Sweater');
    expect(result!.imageUrl).toBe('https://example.com/sweater.jpg');
    expect(result!.price).toBe(25000);
    expect(result!.currency).toBe('GBP');
    expect(result!.inStock).toBe(true);
    expect(result!.confidence).toBe(0.6);
  });

  it('handles Shopify og:price format', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Vintage Tee" />
        <meta property="og:price:amount" content="45.00" />
        <meta property="og:price:currency" content="USD" />
        <meta property="og:availability" content="instock" />
      </head><body></body></html>
    `;

    const result = extractFromMeta(html);
    expect(result!.price).toBe(4500);
    expect(result!.currency).toBe('USD');
  });

  it('prefers og:image:secure_url over og:image', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Product" />
        <meta property="og:image" content="http://example.com/img.jpg" />
        <meta property="og:image:secure_url" content="https://example.com/img.jpg" />
      </head><body></body></html>
    `;

    const result = extractFromMeta(html);
    expect(result!.imageUrl).toBe('https://example.com/img.jpg');
  });

  it('falls back to Twitter card tags', () => {
    const html = `
      <html><head>
        <meta name="twitter:title" content="Twitter Product" />
        <meta name="twitter:image" content="https://example.com/twitter.jpg" />
      </head><body></body></html>
    `;

    const result = extractFromMeta(html);
    expect(result!.name).toBe('Twitter Product');
    expect(result!.imageUrl).toBe('https://example.com/twitter.jpg');
  });

  it('falls back to title tag', () => {
    const html = `
      <html><head>
        <title>Page Title Product</title>
      </head><body></body></html>
    `;

    const result = extractFromMeta(html);
    expect(result!.name).toBe('Page Title Product');
  });

  it('detects out of stock from availability meta', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Sold Out Item" />
        <meta property="product:availability" content="outofstock" />
      </head><body></body></html>
    `;

    const result = extractFromMeta(html);
    expect(result!.inStock).toBe(false);
  });

  it('returns result with empty name for minimal HTML', () => {
    const html = '<html><head></head><body></body></html>';
    const result = extractFromMeta(html);
    // Meta parser returns a result even with minimal HTML (empty title tag matches)
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0.6);
  });
});
