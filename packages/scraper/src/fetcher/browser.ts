import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { FetchResult } from './http.js';

let browser: Browser | null = null;

/**
 * Gets or creates a shared browser instance.
 */
async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });
  }
  return browser;
}

/**
 * Fetches a page using Playwright browser.
 * More expensive but handles JavaScript-heavy sites.
 */
export async function fetchWithBrowser(url: string): Promise<FetchResult | null> {
  let context: BrowserContext | null = null;

  try {
    const browserInstance = await getBrowser();

    context = await browserInstance.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
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
      timeout: 30000,
    });

    if (!response) {
      return null;
    }

    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);

    // Try to wait for common product elements
    try {
      await page.waitForSelector(
        '[data-testid="product"], .product, .pdp, [itemtype*="Product"]',
        { timeout: 5000 }
      );
    } catch {
      // Element not found, continue anyway
    }

    const html = await page.content();
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
 * Closes the shared browser instance.
 * Call this when shutting down the worker.
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
