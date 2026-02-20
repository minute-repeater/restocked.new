import { fetchWithHttp, type FetchResult } from './http.js';
import { fetchWithBrowser, closeBrowser } from './browser.js';

export type { FetchResult };
export { closeBrowser };

/**
 * Fetches a product page, trying HTTP first and falling back to browser.
 */
export async function fetchPage(url: string): Promise<FetchResult> {
  // Try simple HTTP first (faster, cheaper)
  const httpResult = await fetchWithHttp(url);

  if (httpResult) {
    return httpResult;
  }

  // Fall back to browser for JS-heavy sites
  const browserResult = await fetchWithBrowser(url);

  if (browserResult) {
    return browserResult;
  }

  throw new Error(`Failed to fetch page: ${url}`);
}
