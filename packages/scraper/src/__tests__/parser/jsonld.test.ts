import { describe, it, expect } from 'vitest';
import { extractFromJsonLd } from '../../parser/jsonld.js';

describe('extractFromJsonLd', () => {
  it('extracts product data from standard JSON-LD', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Leather Tote Bag",
          "image": "https://example.com/tote.jpg",
          "offers": {
            "@type": "Offer",
            "price": "125.00",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        }
        </script>
      </head><body></body></html>
    `;

    const result = extractFromJsonLd(html);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Leather Tote Bag');
    expect(result!.imageUrl).toBe('https://example.com/tote.jpg');
    expect(result!.price).toBe(12500); // cents
    expect(result!.currency).toBe('USD');
    expect(result!.inStock).toBe(true);
    expect(result!.confidence).toBe(0.9);
  });

  it('handles @graph format', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@graph": [
            { "@type": "WebSite", "name": "Store" },
            {
              "@type": "Product",
              "name": "Silk Scarf",
              "offers": {
                "price": 85,
                "priceCurrency": "EUR",
                "availability": "https://schema.org/OutOfStock"
              }
            }
          ]
        }
        </script>
      </head><body></body></html>
    `;

    const result = extractFromJsonLd(html);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Silk Scarf');
    expect(result!.price).toBe(8500);
    expect(result!.currency).toBe('EUR');
    expect(result!.inStock).toBe(false);
  });

  it('handles image as array', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Jacket",
          "image": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
          "offers": { "availability": "InStock" }
        }
        </script>
      </head><body></body></html>
    `;

    const result = extractFromJsonLd(html);
    expect(result!.imageUrl).toBe('https://example.com/img1.jpg');
  });

  it('handles image as object with url', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Pants",
          "image": { "url": "https://example.com/pants.jpg" },
          "offers": { "availability": "InStock" }
        }
        </script>
      </head><body></body></html>
    `;

    const result = extractFromJsonLd(html);
    expect(result!.imageUrl).toBe('https://example.com/pants.jpg');
  });

  it('parses sold out / discontinued availability', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Rare Item",
          "offers": { "availability": "https://schema.org/SoldOut" }
        }
        </script>
      </head><body></body></html>
    `;

    const result = extractFromJsonLd(html);
    expect(result!.inStock).toBe(false);
  });

  it('returns null when no JSON-LD is present', () => {
    const html = '<html><head></head><body><h1>Hello</h1></body></html>';
    expect(extractFromJsonLd(html)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{ not valid json }</script>
      </head><body></body></html>
    `;
    expect(extractFromJsonLd(html)).toBeNull();
  });

  it('skips non-Product types', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        { "@type": "Organization", "name": "Some Company" }
        </script>
      </head><body></body></html>
    `;
    expect(extractFromJsonLd(html)).toBeNull();
  });

  it('handles multiple offers (array)', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Sneakers",
          "offers": [
            { "price": "120.00", "priceCurrency": "USD", "availability": "InStock" },
            { "price": "110.00", "priceCurrency": "USD", "availability": "OutOfStock" }
          ]
        }
        </script>
      </head><body></body></html>
    `;

    const result = extractFromJsonLd(html);
    expect(result!.price).toBe(12000); // first offer
    expect(result!.inStock).toBe(true); // first offer
  });
});
