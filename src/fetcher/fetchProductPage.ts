import { httpFetchWithRetry } from "./httpFetch.js";
import { playwrightFetch } from "./playwrightFetch.js";
import type { FetchResult } from "./types.js";
import axios from "axios";

/**
 * Detect if a URL is a Shopify store
 */
function isShopifyStore(url: string, html?: string): boolean {
  // Check URL pattern
  if (url.includes("myshopify.com") || url.includes(".myshopify.com")) {
    return true;
  }

  // Check HTML for Shopify indicators
  if (html) {
    if (
      html.includes("Shopify.theme") ||
      html.includes("cdn.shopify.com") ||
      html.includes('"shopify"') ||
      html.includes("window.Shopify")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Try to fetch Shopify product JSON endpoint
 */
async function tryShopifyJson(url: string): Promise<{ success: boolean; html?: string; finalURL?: string }> {
  try {
    // Try ?view=json
    try {
      const jsonUrl = url.includes("?") ? `${url}&view=json` : `${url}?view=json`;
      const response = await axios.get(jsonUrl, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (response.data && typeof response.data === "object") {
        // Convert JSON to HTML-like structure for extraction
        const jsonHtml = `<script type="application/json" id="product-json">${JSON.stringify(response.data)}</script>`;
        return { success: true, html: jsonHtml, finalURL: jsonUrl };
      }
    } catch {}

    // Try product.json
    try {
      const jsonUrl = url.replace(/\/$/, "") + ".json";
      const response = await axios.get(jsonUrl, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (response.data && typeof response.data === "object") {
        const jsonHtml = `<script type="application/json" id="product-json">${JSON.stringify(response.data)}</script>`;
        return { success: true, html: jsonHtml, finalURL: jsonUrl };
      }
    } catch {}

    // Try /products/product-handle.json
    try {
      const jsonUrl = url.replace(/\/$/, "") + ".json";
      const response = await axios.get(jsonUrl, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (response.data && typeof response.data === "object") {
        const jsonHtml = `<script type="application/json" id="product-json">${JSON.stringify(response.data)}</script>`;
        return { success: true, html: jsonHtml, finalURL: jsonUrl };
      }
    } catch {}
  } catch (error) {
    // Ignore errors, fall through to next method
  }

  return { success: false };
}

/**
 * Check if HTML contains JSON-LD Product schema
 */
function hasJsonLdProduct(html: string): boolean {
  const jsonLdPattern = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      if (
        json["@type"] === "Product" ||
        json["@type"] === "http://schema.org/Product" ||
        json["@type"] === "https://schema.org/Product" ||
        (Array.isArray(json["@type"]) && json["@type"].includes("Product"))
      ) {
        return true;
      }
    } catch {
      // Continue checking other JSON-LD blocks
    }
  }
  return false;
}

/**
 * Fetches product page content using a fetch-first strategy:
 * 1. Try HTTP GET first
 * 2. If Shopify detected, try JSON endpoints
 * 3. If JSON-LD Product schema found, use that
 * 4. Fallback to Playwright only if fetch-based extraction fails
 *
 * @param url - The product URL to fetch
 * @returns Promise<FetchResult> - Normalized result structure
 */
export async function fetchProductPage(url: string): Promise<FetchResult> {
  const startTime = Date.now();
  const fetchedAt = new Date().toISOString();
  const originalURL = url;

  // Log memory before extraction
  const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[Memory] Before extraction: ${memBefore.toFixed(2)} MB`);

  // Check memory and force GC if needed
  if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
    console.warn("[Memory] High memory usage – forcing GC");
    if (global.gc) {
      global.gc();
    }
  }

  // HTML size limit: 10MB to prevent OOM
  const MAX_HTML_SIZE = 10 * 1024 * 1024; // 10MB

  // Wrap entire extraction in 20-second timeout
  const timeoutPromise = new Promise<FetchResult>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Extraction timeout after 20 seconds"));
    }, 20000);
  });

  const extractionPromise = (async (): Promise<FetchResult> => {
    try {
      // Step 1: Try HTTP fetch first
  const httpResult = await httpFetchWithRetry(url, 10000);

  if (httpResult.success && httpResult.html) {
        // Check if it's Shopify and try JSON endpoints
        if (isShopifyStore(url, httpResult.html)) {
          const shopifyJson = await tryShopifyJson(url);
          if (shopifyJson.success && shopifyJson.html) {
            console.log("[Fetch] Using Shopify JSON endpoint");
            return {
              success: true,
              modeUsed: "http",
              originalURL,
              finalURL: shopifyJson.finalURL || httpResult.finalURL,
              statusCode: 200,
              rawHTML: shopifyJson.html,
              renderedHTML: null,
              fetchedAt,
              metadata: {
                redirects: httpResult.redirects,
                headers: httpResult.headers,
                timing: {
                  httpMs: Date.now() - startTime,
                },
                shopifyJson: true,
              },
            };
          }
        }

        // Check if HTML contains JSON-LD Product schema
        if (hasJsonLdProduct(httpResult.html)) {
          console.log("[Fetch] Found JSON-LD Product schema, using HTTP result");
          return {
            success: true,
            modeUsed: "http",
            originalURL,
            finalURL: httpResult.finalURL,
            statusCode: httpResult.statusCode,
            rawHTML: httpResult.html,
            renderedHTML: null,
            fetchedAt,
            metadata: {
              redirects: httpResult.redirects,
              headers: httpResult.headers,
              timing: {
                httpMs: httpResult.timingMs,
              },
              jsonLdFound: true,
            },
          };
        }

    // HTTP fetch succeeded with valid HTML
    return {
      success: true,
      modeUsed: "http",
      originalURL,
      finalURL: httpResult.finalURL,
      statusCode: httpResult.statusCode,
      rawHTML: httpResult.html,
      renderedHTML: null,
      fetchedAt,
      metadata: {
        redirects: httpResult.redirects,
        headers: httpResult.headers,
        timing: {
          httpMs: httpResult.timingMs,
        },
      },
    };
  }

      // Step 2: HTTP failed or HTML incomplete, try Playwright as fallback
      // Skip Playwright if disabled (e.g., in profiling mode)
      if (process.env.DISABLE_PLAYWRIGHT === "true") {
        console.log("[Fetch] Playwright disabled, skipping fallback");
        return {
          success: false,
          modeUsed: "failed",
          originalURL,
          finalURL: httpResult.finalURL || null,
          statusCode: httpResult.statusCode,
          rawHTML: null,
          renderedHTML: null,
          fetchedAt,
          metadata: {
            redirects: httpResult.redirects,
            headers: httpResult.headers,
            timing: {
              httpMs: httpResult.timingMs,
            },
          },
          error: `HTTP fetch failed: ${httpResult.error || "unknown"}. Playwright disabled.`,
        };
      }

      console.log("[Fetch] HTTP fetch failed or incomplete, trying Playwright");
      const playwrightResult = await playwrightFetch(url, 15000);

  if (playwrightResult.success && playwrightResult.html) {
        // Check HTML size from Playwright
        if (playwrightResult.html.length > MAX_HTML_SIZE) {
          console.warn(`[Fetch] Playwright HTML too large: ${(playwrightResult.html.length / 1024 / 1024).toFixed(2)} MB`);
          return {
            success: false,
            modeUsed: "failed",
            originalURL,
            finalURL: playwrightResult.finalURL,
            statusCode: null,
            rawHTML: null,
            renderedHTML: null,
            fetchedAt,
            metadata: {
              consoleErrors: playwrightResult.consoleErrors,
              timing: {
                httpMs: httpResult.timingMs,
                playwrightMs: playwrightResult.timingMs,
              },
            },
            error: `HTML content too large (${(playwrightResult.html.length / 1024 / 1024).toFixed(2)} MB, max ${MAX_HTML_SIZE / 1024 / 1024} MB)`,
          };
        }

    return {
      success: true,
      modeUsed: "playwright",
      originalURL,
      finalURL: playwrightResult.finalURL,
          statusCode: null,
      rawHTML: null,
      renderedHTML: playwrightResult.html,
      fetchedAt,
      metadata: {
        consoleErrors: playwrightResult.consoleErrors,
        timing: {
          httpMs: httpResult.timingMs,
          playwrightMs: playwrightResult.timingMs,
        },
      },
    };
  }

  // Both methods failed
  return {
    success: false,
    modeUsed: "failed",
    originalURL,
    finalURL: playwrightResult.finalURL || httpResult.finalURL || null,
    statusCode: httpResult.statusCode,
    rawHTML: null,
    renderedHTML: null,
    fetchedAt,
    metadata: {
      redirects: httpResult.redirects,
      headers: httpResult.headers,
      consoleErrors: playwrightResult.consoleErrors,
      timing: {
        httpMs: httpResult.timingMs,
        playwrightMs: playwrightResult.timingMs,
      },
    },
    error: `HTTP: ${httpResult.error || "unknown"}; Playwright: ${playwrightResult.error || "unknown"}`,
  };
    } catch (error: any) {
      // Ensure we don't crash the server
      console.error("[Fetch] Error during extraction:", error.message);
      return {
        success: false,
        modeUsed: "failed",
        originalURL,
        finalURL: null,
        statusCode: null,
        rawHTML: null,
        renderedHTML: null,
        fetchedAt,
        metadata: {
          timing: {
            httpMs: Date.now() - startTime,
          },
        },
        error: error.message || "Unknown extraction error",
      };
    }
  })();

  try {
    const result = await Promise.race([extractionPromise, timeoutPromise]);

    // Log memory after extraction
    const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[Memory] After extraction: ${memAfter.toFixed(2)} MB (delta: ${(memAfter - memBefore).toFixed(2)} MB)`);

    return result;
  } catch (error: any) {
    // Timeout or other error
    console.error("[Fetch] Extraction failed:", error.message);

    // Log memory after error
    const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[Memory] After error: ${memAfter.toFixed(2)} MB`);

    return {
      success: false,
      modeUsed: "failed",
      originalURL,
      finalURL: null,
      statusCode: null,
      rawHTML: null,
      renderedHTML: null,
      fetchedAt,
      metadata: {
        timing: {
          httpMs: Date.now() - startTime,
        },
      },
      error: error.message || "Extraction timeout or error",
    };
  }
}

