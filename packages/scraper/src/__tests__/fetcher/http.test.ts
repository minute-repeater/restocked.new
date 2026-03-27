import { describe, it, expect } from 'vitest';
import { requiresJavaScript, isBotBlocked } from '../../fetcher/http.js';

// ---------------------------------------------------------------------------
// Helpers to build HTML pages of controlled size
// ---------------------------------------------------------------------------

/** Build a minimal HTML page with the given body content. */
function page(body: string, head = ''): string {
  return `<html><head>${head}</head><body>${body}</body></html>`;
}

/** Pad a string with invisible filler to reach a target byte length. */
function padTo(html: string, targetLength: number): string {
  if (html.length >= targetLength) return html;
  const filler = '<!-- ' + 'x'.repeat(targetLength - html.length - 10) + ' -->';
  return html.replace('</body>', filler + '</body>');
}

/** Build a small product page (< 15KB) with ld+json structured data. */
function smallProductPage(): string {
  return page(
    `<h1>Silk Dress</h1>
     <p>A beautiful silk dress.</p>
     <span>$450.00</span>
     <button>Add to Cart</button>`,
    `<script type="application/ld+json">{"@type":"Product","name":"Silk Dress"}</script>`,
  );
}

/** Build a realistic large page (> 15KB) with product content. */
function largeProductPage(): string {
  const body = `
    <h1>Leather Tote Bag</h1>
    <p>${'Premium Italian leather with gold hardware. '.repeat(80)}</p>
    <span class="price">$1,250.00</span>
    <button>Add to Cart</button>
  `;
  const head = `<script type="application/ld+json">{"@type":"Product","name":"Leather Tote Bag"}</script>`;
  return padTo(page(body, head), 20000);
}

// ===========================================================================
// requiresJavaScript
// ===========================================================================

describe('requiresJavaScript', () => {
  // -----------------------------------------------------------------------
  // Strong indicators (always trigger regardless of page size)
  // -----------------------------------------------------------------------

  describe('strong indicators', () => {
    it('detects "please enable javascript" on any size page', () => {
      const html = padTo(
        page('<noscript>Please enable JavaScript to continue.</noscript><p>Content here.</p>'.repeat(5)),
        20000,
      );
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('detects "javascript is required"', () => {
      const html = page('<div>JavaScript is required to view this page.</div>');
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('detects "this site requires javascript"', () => {
      const html = page('<p>This site requires JavaScript for the best experience.</p>');
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('detects "you need to enable javascript"', () => {
      const html = page('<p>You need to enable JavaScript to run this app.</p>');
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('is case-insensitive for strong indicators', () => {
      const html = page('<p>PLEASE ENABLE JAVASCRIPT to continue.</p>');
      expect(requiresJavaScript(html)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Short-page indicators (< 15KB only)
  // -----------------------------------------------------------------------

  describe('short-page indicators (< 15KB)', () => {
    it('detects __NEXT_DATA__ on a small page with product data', () => {
      // Even with product data present, __NEXT_DATA__ on a short page triggers true
      const html = page(
        `<div id="__next"></div>
         <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>
         <button>Add to Cart</button>`,
        `<script type="application/ld+json">{"@type":"Product"}</script>`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('detects __NUXT__ on a small page with product data', () => {
      const html = page(
        `<div id="__nuxt"></div>
         <script>window.__NUXT__={data:{}}</script>
         <button>Add to cart</button>`,
        `<meta property="og:price:amount" content="99.00">`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('detects window.__INITIAL_STATE__ on a small page', () => {
      const html = page(
        `<div id="app"></div>
         <script>window.__INITIAL_STATE__={"products":[]}</script>
         <button>Add to bag</button>`,
        `<script type="application/ld+json">{"@type":"Product"}</script>`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('does NOT trigger __NEXT_DATA__ on a large page (> 15KB)', () => {
      // Large pages with __NEXT_DATA__ are already server-rendered with enough content
      const body = `
        <h1>Product Page</h1>
        <p>${'Server-rendered product description. '.repeat(100)}</p>
        <button>Add to Cart</button>
        <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>
      `;
      const head = `<script type="application/ld+json">{"@type":"Product","name":"Test"}</script>`;
      const html = padTo(page(body, head), 20000);
      expect(html.length).toBeGreaterThan(15000);
      expect(requiresJavaScript(html)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // SPA shell detection
  // -----------------------------------------------------------------------

  describe('SPA shell detection', () => {
    it('detects small page without product data as SPA shell', () => {
      // A tiny page with just a div#app and scripts — no product signals at all
      const html = page(
        `<div id="app"></div>
         <script src="/assets/main.js"></script>`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('returns false for a small page WITH product data indicators', () => {
      // Small page but has ld+json and Add to Cart — real product page
      const html = smallProductPage();
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(false);
    });

    it('returns false for a small page with og:price meta tag', () => {
      const html = page(
        `<h1>Cashmere Sweater</h1>
         <p>Soft cashmere blend knit in a relaxed silhouette. Available in ivory, charcoal, and navy colorways.</p>
         <span class="price">$320.00</span>
         <div class="details">Material: 100% Grade-A Mongolian Cashmere</div>`,
        `<meta property="og:price:amount" content="320.00">`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(false);
    });

    it('returns false for a small page with "add to bag"', () => {
      const html = page(
        `<h1>Wool Coat</h1>
         <p>Double-breasted wool coat in navy.</p>
         <button class="btn-primary">Add to Bag</button>`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(false);
    });

    it('returns false for a small page with "addtocart" attribute', () => {
      const html = page(
        `<h1>Linen Shirt</h1>
         <p>100% linen, relaxed fit.</p>
         <form action="/addtocart" method="post"><button type="submit">Buy</button></form>`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Noscript on short pages
  // -----------------------------------------------------------------------

  describe('noscript detection on short pages', () => {
    it('triggers when noscript mentions "javascript"', () => {
      const html = page(
        `<div id="root"></div>
         <noscript>You need JavaScript enabled to view this page.</noscript>
         <button>Add to Cart</button>`,
        `<script type="application/ld+json">{"@type":"Product"}</script>`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('triggers when noscript mentions "enable"', () => {
      const html = page(
        `<div id="root"></div>
         <noscript>Please enable scripts in your settings.</noscript>
         <button>Add to Cart</button>`,
        `<script type="application/ld+json">{"@type":"Product"}</script>`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('triggers when noscript mentions "browser"', () => {
      const html = page(
        `<div id="root"></div>
         <noscript>Your browser does not support this application.</noscript>
         <button>Add to Cart</button>`,
        `<script type="application/ld+json">{"@type":"Product"}</script>`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('does NOT trigger for Shopify analytics noscript (no JS-required message)', () => {
      // Shopify pages commonly have <noscript> for tracking pixels — not a JS requirement
      const html = page(
        `<h1>Designer Handbag</h1>
         <p>Italian calfskin leather.</p>
         <span class="price">$2,150.00</span>
         <button>Add to Cart</button>
         <noscript><img src="https://cdn.shopify.com/track.gif" alt="" /></noscript>`,
        `<script type="application/ld+json">{"@type":"Product","name":"Designer Handbag"}</script>`,
      );
      expect(html.length).toBeLessThan(15000);
      expect(requiresJavaScript(html)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Empty body detection
  // -----------------------------------------------------------------------

  describe('empty body detection', () => {
    it('detects body with only script tags and minimal text', () => {
      const html = `<html><head></head><body>
        <div id="root"></div>
        <script src="/bundle.js"></script>
        <script>window.start()</script>
      </body></html>`;
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('detects body with scripts and noscript only', () => {
      const html = `<html><head></head><body>
        <script src="/app.js"></script>
        <noscript>Enable JS</noscript>
      </body></html>`;
      expect(requiresJavaScript(html)).toBe(true);
    });

    it('does NOT trigger for body with substantial text content', () => {
      const html = page(
        `<h1>Product Title</h1>
         <p>${'This is a detailed product description with real content. '.repeat(5)}</p>
         <button>Add to Cart</button>
         <script src="/bundle.js"></script>`,
        `<script type="application/ld+json">{"@type":"Product"}</script>`,
      );
      expect(requiresJavaScript(html)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Normal / large pages
  // -----------------------------------------------------------------------

  describe('normal pages', () => {
    it('returns false for a large product page with content', () => {
      const html = largeProductPage();
      expect(html.length).toBeGreaterThan(15000);
      expect(requiresJavaScript(html)).toBe(false);
    });

    it('returns false for a page with product:price meta', () => {
      const html = page(
        `<h1>Merino Scarf</h1>
         <p>Hand-woven merino wool scarf in a generous oversized cut. Perfect for layering through the colder months.</p>
         <span class="price">$89.00</span>
         <div class="details">Composition: 100% Extra-fine Merino Wool. Made in Scotland.</div>`,
        `<meta property="product:price:amount" content="89.00">`,
      );
      // product:price matches the hasProductData check in requiresJavaScript
      expect(requiresJavaScript(html)).toBe(false);
    });
  });
});

// ===========================================================================
// isBotBlocked
// ===========================================================================

describe('isBotBlocked', () => {
  // -----------------------------------------------------------------------
  // Small page blocking indicators (< 10KB)
  // -----------------------------------------------------------------------

  describe('small-page blocking indicators', () => {
    it('detects "access denied" on a small page', () => {
      const html = page('<h1>Access Denied</h1><p>You do not have permission.</p>');
      expect(html.length).toBeLessThan(10000);
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects "please verify you are a human"', () => {
      const html = page('<p>Please verify you are a human to continue.</p>');
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects "checking your browser" (Cloudflare challenge)', () => {
      const html = page('<h2>Checking your browser before accessing the site...</h2>');
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects "just a moment" (Cloudflare waiting page)', () => {
      const html = page('<h1>Just a moment...</h1><p>Verifying request.</p>');
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects "captcha"', () => {
      const html = page('<div class="captcha-container"><p>Solve the captcha.</p></div>');
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects "attention required" (Cloudflare)', () => {
      const html = page('<h1>Attention Required!</h1><p>Cloudflare</p>');
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects "pardon our interruption" (Akamai)', () => {
      const html = page('<h2>Pardon Our Interruption</h2><p>We need to verify your request.</p>');
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects "cf-browser-verification"', () => {
      const html = page('<div id="cf-browser-verification">Verifying...</div>');
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects "challenge-platform"', () => {
      const html = page('<div class="challenge-platform"><script src="/challenge.js"></script></div>');
      expect(isBotBlocked(html)).toBe(true);
    });

    it('is case-insensitive for blocking indicators', () => {
      const html = page('<h1>ACCESS DENIED</h1>');
      expect(isBotBlocked(html)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Large pages should NOT be flagged
  // -----------------------------------------------------------------------

  describe('large pages (> 10KB)', () => {
    it('does NOT flag a large page containing "blocked" text', () => {
      // A real product page might mention "blocked" in its content incidentally
      const body = `
        <h1>Leather Blocked Heel Boot</h1>
        <p>${'Premium craftsmanship with a blocked heel design. '.repeat(100)}</p>
        <span>$695.00</span>
        <button>Add to Cart</button>
      `;
      const html = padTo(page(body), 15000);
      expect(html.length).toBeGreaterThan(10000);
      expect(isBotBlocked(html)).toBe(false);
    });

    it('does NOT flag a large page with "access denied" in content', () => {
      const body = `
        <h1>Admin Panel Guide</h1>
        <p>If you see "access denied", contact your administrator.</p>
        <p>${'Documentation content. '.repeat(200)}</p>
      `;
      const html = padTo(page(body), 15000);
      expect(html.length).toBeGreaterThan(10000);
      expect(isBotBlocked(html)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Meta refresh redirect to homepage
  // -----------------------------------------------------------------------

  describe('meta refresh redirect', () => {
    it('detects meta refresh redirect to "/"', () => {
      const html = page(
        '<p>Redirecting...</p>',
        '<meta http-equiv="refresh" content="0; url=/">',
      );
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects meta refresh redirect to bare homepage URL', () => {
      const html = page(
        '<p>Redirecting...</p>',
        '<meta http-equiv="refresh" content="0; url=https://www.example.com/">',
      );
      expect(isBotBlocked(html)).toBe(true);
    });

    it('detects meta refresh redirect to homepage without trailing slash', () => {
      const html = page(
        '<p>Redirecting...</p>',
        '<meta http-equiv="refresh" content="3; url=https://www.example.com">',
      );
      expect(isBotBlocked(html)).toBe(true);
    });

    it('does NOT flag meta refresh redirect to a product page', () => {
      const html = page(
        '<p>Redirecting to product...</p>',
        '<meta http-equiv="refresh" content="0; url=https://www.example.com/products/silk-dress">',
      );
      expect(isBotBlocked(html)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Normal pages
  // -----------------------------------------------------------------------

  describe('normal pages', () => {
    it('returns false for a normal product page', () => {
      const html = page(
        `<h1>Cashmere Sweater</h1>
         <p>100% cashmere, ribbed knit.</p>
         <span class="price">$450.00</span>
         <button>Add to Cart</button>`,
        `<script type="application/ld+json">{"@type":"Product","name":"Cashmere Sweater"}</script>`,
      );
      expect(isBotBlocked(html)).toBe(false);
    });

    it('returns false for an empty small page without block indicators', () => {
      const html = page('<div id="root"></div>');
      expect(isBotBlocked(html)).toBe(false);
    });
  });
});
