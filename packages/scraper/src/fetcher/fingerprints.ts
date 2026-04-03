/**
 * Randomized browser fingerprints for anti-detection.
 * Provides rotating user agents, headers, and browser profiles.
 */

// ---------------------------------------------------------------------------
// User-Agent pool (50+ modern desktop browsers)
// ---------------------------------------------------------------------------

const CHROME_VERSIONS = ['120.0.0.0', '121.0.0.0', '122.0.0.0', '123.0.0.0', '124.0.0.0', '125.0.0.0', '126.0.0.0', '127.0.0.0', '128.0.0.0', '129.0.0.0', '130.0.0.0', '131.0.0.0'];
const FIREFOX_VERSIONS = ['121.0', '122.0', '123.0', '124.0', '125.0', '126.0', '127.0', '128.0', '129.0', '130.0', '131.0', '132.0'];
const SAFARI_VERSIONS = ['17.2', '17.3', '17.4', '17.5', '18.0', '18.1', '18.2'];
const EDGE_VERSIONS = ['120.0.0.0', '121.0.0.0', '122.0.0.0', '123.0.0.0', '124.0.0.0', '125.0.0.0', '126.0.0.0', '127.0.0.0', '128.0.0.0', '129.0.0.0', '130.0.0.0', '131.0.0.0'];

const OS_PLATFORMS = {
  macIntel: 'Macintosh; Intel Mac OS X 10_15_7',
  macArm: 'Macintosh; Intel Mac OS X 14_0',
  win10: 'Windows NT 10.0; Win64; x64',
  win11: 'Windows NT 10.0; Win64; x64',
  linux: 'X11; Linux x86_64',
};

function buildChromeUA(version: string, os: string): string {
  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
}

function buildFirefoxUA(version: string, os: string): string {
  return `Mozilla/5.0 (${os}; rv:${version}) Gecko/20100101 Firefox/${version}`;
}

function buildSafariUA(version: string): string {
  const webkitVersions: Record<string, string> = {
    '17.2': '605.1.15', '17.3': '605.1.15', '17.4': '605.1.15',
    '17.5': '605.1.15', '18.0': '605.1.15', '18.1': '605.1.15', '18.2': '605.1.15',
  };
  const wk = webkitVersions[version] ?? '605.1.15';
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/${wk} (KHTML, like Gecko) Version/${version} Safari/${wk}`;
}

function buildEdgeUA(version: string, os: string): string {
  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36 Edg/${version}`;
}

export interface UserAgentEntry {
  ua: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  platform: string;
}

function buildPool(): UserAgentEntry[] {
  const pool: UserAgentEntry[] = [];

  // Chrome on Mac, Win, Linux (heaviest weight — most common)
  for (const v of CHROME_VERSIONS) {
    pool.push({ ua: buildChromeUA(v, OS_PLATFORMS.macIntel), browser: 'chrome', platform: 'macOS' });
    pool.push({ ua: buildChromeUA(v, OS_PLATFORMS.win10), browser: 'chrome', platform: 'Windows' });
  }
  // A few on Linux
  for (const v of CHROME_VERSIONS.slice(-4)) {
    pool.push({ ua: buildChromeUA(v, OS_PLATFORMS.linux), browser: 'chrome', platform: 'Linux' });
  }

  // Firefox on Mac and Win
  for (const v of FIREFOX_VERSIONS.slice(-6)) {
    pool.push({ ua: buildFirefoxUA(v, OS_PLATFORMS.macIntel), browser: 'firefox', platform: 'macOS' });
    pool.push({ ua: buildFirefoxUA(v, OS_PLATFORMS.win10), browser: 'firefox', platform: 'Windows' });
  }

  // Safari (macOS only)
  for (const v of SAFARI_VERSIONS) {
    pool.push({ ua: buildSafariUA(v), browser: 'safari', platform: 'macOS' });
  }

  // Edge on Windows
  for (const v of EDGE_VERSIONS.slice(-6)) {
    pool.push({ ua: buildEdgeUA(v, OS_PLATFORMS.win10), browser: 'edge', platform: 'Windows' });
  }

  return pool;
}

export const USER_AGENTS: UserAgentEntry[] = buildPool();

// Chrome-only subset for Playwright (since we launch Chromium)
const CHROMIUM_UAS = USER_AGENTS.filter(e => e.browser === 'chrome');

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Accept-Language rotation
// ---------------------------------------------------------------------------

const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.9',
  'en-US,en;q=0.5',
  'en-GB,en;q=0.9',
  'en-GB,en-US;q=0.8,en;q=0.7',
  'en,en-US;q=0.9',
  'en-US,en;q=0.9,fr;q=0.8',
  'en-US,en;q=0.9,de;q=0.8',
  'en-US,en;q=0.9,es;q=0.8',
];

// ---------------------------------------------------------------------------
// Referer generation
// ---------------------------------------------------------------------------

function getReferer(url: string): string | undefined {
  const roll = Math.random();
  if (roll < 0.70) {
    // Google search referrer
    return 'https://www.google.com/';
  }
  if (roll < 0.90) {
    // Retailer homepage
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.hostname}/`;
    } catch {
      return undefined;
    }
  }
  // 10% — no referer (direct navigation)
  return undefined;
}

// ---------------------------------------------------------------------------
// Sec-CH-UA for Chromium-based UAs
// ---------------------------------------------------------------------------

function getSecChUa(entry: UserAgentEntry): Record<string, string> {
  if (entry.browser !== 'chrome' && entry.browser !== 'edge') return {};

  const majorVersion = entry.ua.match(/Chrome\/(\d+)/)?.[1] ?? '131';
  const brand = entry.browser === 'edge' ? 'Microsoft Edge' : 'Google Chrome';
  const platform = entry.platform === 'macOS' ? 'macOS' : entry.platform === 'Windows' ? 'Windows' : 'Linux';

  return {
    'Sec-Ch-Ua': `"${brand}";v="${majorVersion}", "Chromium";v="${majorVersion}", "Not_A Brand";v="24"`,
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': `"${platform}"`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a full set of randomized HTTP headers for a request.
 */
export function getRandomHeaders(url: string): Record<string, string> {
  const entry = pick(USER_AGENTS);
  const referer = getReferer(url);

  const headers: Record<string, string> = {
    'User-Agent': entry.ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': pick(ACCEPT_LANGUAGES),
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': referer ? 'cross-site' : 'none',
    'Sec-Fetch-User': '?1',
    ...getSecChUa(entry),
  };

  if (referer) {
    headers['Referer'] = referer;
  }

  return headers;
}

/**
 * Returns a randomized browser profile for Playwright context creation.
 * Uses Chrome-only UAs since we launch Chromium.
 */
export function getRandomBrowserProfile(): {
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezoneId: string;
} {
  const entry = pick(CHROMIUM_UAS);

  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1600, height: 900 },
  ];

  const locales = ['en-US', 'en-GB', 'en'];
  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
  ];

  return {
    userAgent: entry.ua,
    viewport: pick(viewports),
    locale: pick(locales),
    timezoneId: pick(timezones),
  };
}
