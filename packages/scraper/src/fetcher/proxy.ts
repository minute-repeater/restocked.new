/**
 * Optional proxy rotation for HTTP and Playwright fetchers.
 * Reads from PROXY_URLS env var (comma-separated) and/or PROXY_FILE (one per line).
 * When no proxies are configured, all functions return null/undefined — no-op.
 */

import { readFileSync } from 'node:fs';

export interface ProxyEntry {
  url: string;
  /** Temporarily removed from rotation until this timestamp */
  cooldownUntil: number;
}

const COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown on failed proxies

let proxies: ProxyEntry[] = [];
let currentIndex = 0;
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;

  const urls: string[] = [];

  // From env var (comma-separated)
  const envUrls = process.env.PROXY_URLS;
  if (envUrls) {
    urls.push(...envUrls.split(',').map(u => u.trim()).filter(Boolean));
  }

  // From file (one per line)
  const filePath = process.env.PROXY_FILE;
  if (filePath) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      urls.push(...content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')));
    } catch {
      // File not found or unreadable — continue without
    }
  }

  proxies = urls.map(url => ({ url, cooldownUntil: 0 }));
}

/**
 * Returns the next available proxy URL via round-robin, or null if none configured.
 */
export function getNextProxy(): string | null {
  ensureLoaded();
  if (proxies.length === 0) return null;

  const now = Date.now();
  // Try up to proxies.length times to find one not in cooldown
  for (let i = 0; i < proxies.length; i++) {
    const idx = (currentIndex + i) % proxies.length;
    const entry = proxies[idx];
    if (entry.cooldownUntil <= now) {
      currentIndex = (idx + 1) % proxies.length;
      return entry.url;
    }
  }

  // All proxies in cooldown — use the least-recently-failed one anyway
  currentIndex = (currentIndex + 1) % proxies.length;
  return proxies[currentIndex].url;
}

/**
 * Marks a proxy as failed, putting it in cooldown.
 */
export function markProxyFailed(proxyUrl: string): void {
  const entry = proxies.find(p => p.url === proxyUrl);
  if (entry) {
    entry.cooldownUntil = Date.now() + COOLDOWN_MS;
  }
}

/**
 * Returns a Playwright-compatible proxy config, or undefined if no proxies configured.
 */
export function getProxyForPlaywright(): { server: string; username?: string; password?: string } | undefined {
  const url = getNextProxy();
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    const server = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
    const result: { server: string; username?: string; password?: string } = { server };
    if (parsed.username) result.username = decodeURIComponent(parsed.username);
    if (parsed.password) result.password = decodeURIComponent(parsed.password);
    return result;
  } catch {
    return undefined;
  }
}

/**
 * Returns proxy URL for HTTP fetch, or null if no proxies configured.
 */
export function getProxyForHttp(): string | null {
  return getNextProxy();
}

/** Visible for testing */
export function _resetForTesting(): void {
  proxies = [];
  currentIndex = 0;
  loaded = false;
}
