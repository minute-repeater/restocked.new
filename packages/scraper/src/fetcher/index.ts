import { fetchWithHttp, type FetchResult } from './http.js';
import { fetchWithBrowser, closeBrowser } from './browser.js';
import { waitForBackoff, recordFailure, recordSuccess } from './backoff.js';

export type { FetchResult };
export { closeBrowser };
export { interRequestDelay } from './delays.js';

/**
 * Fetches a product page, trying HTTP first and falling back to browser.
 * Applies per-domain backoff when previous attempts have failed.
 */
export async function fetchPage(url: string): Promise<FetchResult> {
  // Wait if this domain has recent failures (exponential backoff with jitter)
  await waitForBackoff(url);

  // Try simple HTTP first (faster, cheaper)
  const httpResult = await fetchWithHttp(url);

  if (httpResult) {
    recordSuccess(url);
    return httpResult;
  }

  // Fall back to browser for JS-heavy sites
  const browserResult = await fetchWithBrowser(url);

  if (browserResult) {
    recordSuccess(url);
    return browserResult;
  }

  recordFailure(url);
  throw new Error(`Failed to fetch page: ${url}`);
}
