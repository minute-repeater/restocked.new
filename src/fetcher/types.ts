/**
 * Result structure for page fetching operations
 */
export interface FetchResult {
  success: boolean;
  modeUsed: "http" | "playwright" | "failed";
  originalURL: string;
  finalURL: string | null;
  statusCode: number | null;
  rawHTML: string | null;
  renderedHTML: string | null;
  fetchedAt: string;
  metadata: {
    redirects?: string[];
    headers?: Record<string, string>;
    consoleErrors?: string[];
    timing?: {
      httpMs?: number;
      playwrightMs?: number;
    };
    shopifyJson?: boolean;
    jsonLdFound?: boolean;
  };
  error?: string;
}

/**
 * Internal result from HTTP fetch attempt
 */
export interface HttpFetchResult {
  success: boolean;
  statusCode: number;
  finalURL: string;
  html: string;
  headers: Record<string, string>;
  redirects: string[];
  timingMs: number;
  error?: string;
}

/**
 * Internal result from Playwright fetch attempt
 */
export interface PlaywrightFetchResult {
  success: boolean;
  finalURL: string;
  html: string;
  consoleErrors: string[];
  timingMs: number;
  error?: string;
}

