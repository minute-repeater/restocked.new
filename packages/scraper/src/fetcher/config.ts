function int(envVal: string | undefined, fallback: number): number {
  if (envVal === undefined) return fallback;
  const n = parseInt(envVal, 10);
  return Number.isNaN(n) ? fallback : n;
}

export const scraperConfig = {
  // Inter-request random delay range
  delayMinMs: int(process.env.SCRAPE_DELAY_MIN_MS, 1000),
  delayMaxMs: int(process.env.SCRAPE_DELAY_MAX_MS, 4000),

  // Exponential backoff on failures (per-domain)
  backoffBaseMs: int(process.env.SCRAPE_BACKOFF_BASE_MS, 1000),
  backoffMaxMs: int(process.env.SCRAPE_BACKOFF_MAX_MS, 60000),
  backoffJitterMs: int(process.env.SCRAPE_BACKOFF_JITTER_MS, 3000),

  // Fetch timeouts
  httpTimeoutMs: int(process.env.SCRAPE_HTTP_TIMEOUT_MS, 15000),
  browserTimeoutMs: int(process.env.SCRAPE_BROWSER_TIMEOUT_MS, 30000),

  // Browser lifecycle
  browserMaxPages: int(process.env.SCRAPE_BROWSER_MAX_PAGES, 100),
};
