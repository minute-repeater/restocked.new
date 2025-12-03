import { chromium, Browser, Page, BrowserContext } from "playwright";
import type { PlaywrightFetchResult } from "./types.js";

/**
 * Realistic desktop browser user agent
 */
const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Fetches a page using Playwright with headless Chromium
 * Properly configured with timeout and user agent
 * Ensures browser, context, and page are always closed in finally block
 */
export async function playwrightFetch(
  url: string,
  timeoutMs: number = 15000
): Promise<PlaywrightFetchResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const consoleErrors: string[] = [];

  try {
    // Launch headless Chromium browser
    browser = await chromium.launch({
      headless: true,
    });

    // Create browser context with user agent
    context = await browser.newContext({
      userAgent: DESKTOP_USER_AGENT,
    });

    // Create new page
    page = await context.newPage();

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        consoleErrors.push(text);
      }
    });

    // Capture page errors
    page.on("pageerror", (error) => {
      consoleErrors.push(`Page error: ${error.message}`);
    });

    // Navigate to URL with domcontentloaded (faster than networkidle)
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

    if (!response) {
      throw new Error("Navigation failed: no response received");
    }

    // Get final URL (after redirects)
    const finalURL = page.url();

    // Extract fully rendered HTML
    const html = await page.content();

    const timingMs = Date.now() - startTime;

    return {
      success: true,
      finalURL,
      html,
      consoleErrors,
      timingMs,
    };
  } catch (error) {
    const timingMs = Date.now() - startTime;

    return {
      success: false,
      finalURL: url,
      html: "",
      consoleErrors,
      timingMs,
      error: error instanceof Error ? error.message : "Unknown Playwright error",
    };
  } finally {
    // CRITICAL: Always close page, context, and browser, no code path should skip this
    try {
      if (page) {
        await page.close();
        page = null;
      }
    } catch (closeError) {
      console.error("[Playwright] Error closing page:", closeError);
    }

    try {
      if (context) {
        await context.close();
        context = null;
      }
    } catch (closeError) {
      console.error("[Playwright] Error closing context:", closeError);
    }

    try {
      if (browser) {
        await browser.close();
        browser = null;
      }
    } catch (closeError) {
      console.error("[Playwright] Error closing browser:", closeError);
    }

    // Force cleanup of any remaining references
    if (page) page = null;
    if (context) context = null;
    if (browser) browser = null;
  }
}

