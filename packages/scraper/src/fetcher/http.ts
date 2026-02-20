export interface FetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  usedBrowser: boolean;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Attempts to fetch a page using simple HTTP.
 * Returns null if the page requires JavaScript rendering.
 */
export async function fetchWithHttp(url: string): Promise<FetchResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Check if page requires JavaScript
    if (requiresJavaScript(html)) {
      return null;
    }

    return {
      html,
      finalUrl: response.url,
      statusCode: response.status,
      usedBrowser: false,
    };
  } catch (error) {
    // Network error or timeout - will try browser fallback
    return null;
  }
}

/**
 * Heuristics to detect if a page requires JavaScript rendering.
 */
function requiresJavaScript(html: string): boolean {
  const lowerHtml = html.toLowerCase();

  // Common indicators that the page needs JS
  const jsIndicators = [
    'please enable javascript',
    'javascript is required',
    'this site requires javascript',
    'you need to enable javascript',
    '<noscript>',
    'window.__INITIAL_STATE__',
    'window.__PRELOADED_STATE__',
    '__NEXT_DATA__', // Next.js SSR should have data, but SPA won't
  ];

  // If page is very short and has these indicators, likely needs JS
  if (html.length < 5000) {
    for (const indicator of jsIndicators) {
      if (lowerHtml.includes(indicator)) {
        return true;
      }
    }
  }

  // Check for empty body with only script tags
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim();
    if (bodyContent.length < 100) {
      return true;
    }
  }

  return false;
}
