/**
 * Per-domain exponential backoff with jitter.
 * Prevents hammering retailers that are rate-limiting or blocking us.
 */

import { scraperConfig } from './config.js';

interface BackoffState {
  attempts: number;
  lastFailure: number;
}

const state = new Map<string, BackoffState>();

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Prune entries older than TTL to prevent unbounded growth */
function pruneStale(): void {
  const now = Date.now();
  for (const [domain, entry] of state) {
    if (now - entry.lastFailure > STATE_TTL_MS) {
      state.delete(domain);
    }
  }
}

/**
 * Sleeps for the appropriate backoff duration based on past failures for this URL's domain.
 * No-op when no failures are recorded.
 */
export async function waitForBackoff(url: string): Promise<void> {
  const domain = getDomain(url);
  const entry = state.get(domain);
  if (!entry) return;

  // If entry is stale, clear it and skip
  if (Date.now() - entry.lastFailure > STATE_TTL_MS) {
    state.delete(domain);
    return;
  }

  const { backoffBaseMs, backoffMaxMs, backoffJitterMs } = scraperConfig;
  const delay = Math.min(backoffBaseMs * Math.pow(2, entry.attempts - 1), backoffMaxMs);
  const jitter = Math.floor(Math.random() * backoffJitterMs);
  const totalDelay = delay + jitter;

  await new Promise(resolve => setTimeout(resolve, totalDelay));
}

/**
 * Record a fetch failure for the domain, incrementing the backoff counter.
 */
export function recordFailure(url: string): void {
  const domain = getDomain(url);
  const entry = state.get(domain);
  if (entry) {
    entry.attempts++;
    entry.lastFailure = Date.now();
  } else {
    state.set(domain, { attempts: 1, lastFailure: Date.now() });
  }

  // Occasional prune
  if (state.size > 50) pruneStale();
}

/**
 * Record a successful fetch, clearing backoff state for the domain.
 */
export function recordSuccess(url: string): void {
  const domain = getDomain(url);
  state.delete(domain);
}
