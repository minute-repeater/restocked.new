import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { getRandomBrowserProfile } from './fingerprints.js';
import { getProxyForPlaywright } from './proxy.js';
import { scraperConfig } from './config.js';
import type { FetchResult } from './http.js';

// Apply stealth plugin — handles WebDriver flag, Chrome runtime,
// navigator.plugins, WebGL vendor, canvas fingerprint, etc.
chromium.use(StealthPlugin());

let browser: Browser | null = null;
let pageCount = 0;

/**
 * Gets or creates a shared browser instance.
 * Recycles after browserMaxPages fetches to prevent memory leaks.
 */
async function getBrowser(): Promise<Browser> {
  if (browser && pageCount >= scraperConfig.browserMaxPages) {
    await browser.close().catch(() => {});
    browser = null;
    pageCount = 0;
  }

  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });
    pageCount = 0;
  }
  return browser;
}

/**
 * Fetches a page using Playwright browser with stealth plugin.
 * More expensive but handles JavaScript-heavy sites.
 */
export async function fetchWithBrowser(url: string): Promise<FetchResult | null> {
  let context: BrowserContext | null = null;

  try {
    const browserInstance = await getBrowser();
    pageCount++;

    const profile = getRandomBrowserProfile();
    const proxyConfig = getProxyForPlaywright();

    context = await browserInstance.newContext({
      ...profile,
      ...(proxyConfig ? { proxy: proxyConfig } : {}),
    });

    const page = await context.newPage();

    // Block unnecessary resources to speed up loading
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: scraperConfig.browserTimeoutMs,
    });

    if (!response) {
      return null;
    }

    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);

    // Try to dismiss cookie consent banners (common on European luxury retailers)
    await dismissCookieConsent(page);

    // Try to wait for common product elements (expanded selectors)
    try {
      await page.waitForSelector(
        [
          '[data-testid="product"]',
          '[data-component="ProductDetail"]',
          '.product',
          '.product-detail',
          '.product-info',
          '.pdp',
          '[itemtype*="Product"]',
          '[class*="ProductDetail"]',
          '[class*="product-detail"]',
        ].join(', '),
        { timeout: 5000 }
      );
    } catch {
      // Element not found, continue anyway — content may still be usable
    }

    // Get page content (retry once if page is still navigating)
    let html: string;
    try {
      html = await page.content();
    } catch (contentError: unknown) {
      const msg = contentError instanceof Error ? contentError.message : '';
      if (msg.includes('navigating') || msg.includes('changing the content')) {
        // Page is still navigating — wait and retry
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        html = await page.content();
      } else {
        throw contentError;
      }
    }
    const finalUrl = page.url();

    return {
      html,
      finalUrl,
      statusCode: response.status(),
      usedBrowser: true,
    };
  } catch (error) {
    console.error('Browser fetch error:', error);
    return null;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

/**
 * Attempts to dismiss common cookie consent banners.
 * Non-blocking — failures are silently ignored.
 */
async function dismissCookieConsent(page: import('playwright').Page): Promise<void> {
  const consentSelectors = [
    // Common cookie consent buttons
    'button[id*="accept" i]',
    'button[id*="consent" i]',
    'button[class*="accept" i]',
    'button[class*="consent" i]',
    'button[data-testid*="accept" i]',
    'button[data-testid*="cookie" i]',
    // OneTrust (used by many luxury brands)
    '#onetrust-accept-btn-handler',
    // Didomi
    '#didomi-notice-agree-button',
    // CookieBot
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    // Generic patterns
    'button:has-text("Accept All")',
    'button:has-text("Accept Cookies")',
    'button:has-text("Accept all cookies")',
    'button:has-text("Allow all")',
    'button:has-text("I Accept")',
    'button:has-text("Got it")',
    'button:has-text("OK")',
  ];

  for (const selector of consentSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click({ timeout: 1000 });
        // Wait briefly for the banner to dismiss
        await page.waitForTimeout(500);
        return;
      }
    } catch {
      // Selector not found or not clickable — try next
      continue;
    }
  }
}

/**
 * Closes the shared browser instance.
 * Call this when shutting down the worker.
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    pageCount = 0;
  }
}
