export interface FetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  usedBrowser: boolean;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
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
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
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

    // Check if we got a bot-blocking / access-denied page disguised as 200
    if (isBotBlocked(html, response.url)) {
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
 * Detects bot-blocking pages that return HTTP 200 but no real content.
 * These pages should trigger a browser fallback.
 */
export function isBotBlocked(html: string, finalUrl?: string): boolean {
  const lowerHtml = html.toLowerCase();

  // Very small pages with blocking indicators (e.g., Net-a-Porter "Access Denied")
  if (html.length < 10000) {
    const blockIndicators = [
      'access denied',
      'access to this page has been denied',
      'please verify you are a human',
      'checking your browser',
      'just a moment',           // Cloudflare challenge
      'attention required',       // Cloudflare
      'enable cookies',
      'pardon our interruption',  // Akamai
      'bot protection',
      'blocked',
      'captcha',
      'cf-browser-verification',
      'challenge-platform',
    ];

    for (const indicator of blockIndicators) {
      if (lowerHtml.includes(indicator)) {
        return true;
      }
    }
  }

  // Redirect to homepage or non-product page via meta refresh
  const metaRefreshMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=([^"']+)["']/i);
  if (metaRefreshMatch) {
    const redirectUrl = metaRefreshMatch[1];
    // If redirecting to root / homepage, it's likely a blocked request
    if (redirectUrl === '/' || redirectUrl.match(/^https?:\/\/[^/]+\/?$/)) {
      return true;
    }
  }

  return false;
}

/**
 * Heuristics to detect if a page requires JavaScript rendering.
 */
export function requiresJavaScript(html: string): boolean {
  const lowerHtml = html.toLowerCase();

  // Strong JS-required indicators (always trigger regardless of page size)
  const strongIndicators = [
    'please enable javascript',
    'javascript is required',
    'this site requires javascript',
    'you need to enable javascript',
  ];

  for (const indicator of strongIndicators) {
    if (lowerHtml.includes(indicator)) {
      return true;
    }
  }

  // Short-page indicators — only trigger if page is very small
  // (these often appear on pages that render client-side only)
  if (html.length < 15000) {
    const shortPageIndicators = [
      'window.__INITIAL_STATE__',
      'window.__PRELOADED_STATE__',
      '__NEXT_DATA__',
      '__NUXT__',
    ];

    // SPA shell detection: small page with no product structured data
    // Pages < 15KB that don't contain any product indicators are likely SPA shells
    const hasProductData = lowerHtml.includes('application/ld+json') ||
      lowerHtml.includes('og:price') ||
      lowerHtml.includes('product:price') ||
      lowerHtml.includes('add to cart') ||
      lowerHtml.includes('add to bag') ||
      lowerHtml.includes('addtocart');

    if (!hasProductData && html.length < 15000) {
      return true;
    }

    for (const indicator of shortPageIndicators) {
      if (lowerHtml.includes(indicator)) {
        return true;
      }
    }

    // <noscript> on a short page with actual "enable javascript" messaging = needs JS
    // But <noscript> alone on a larger page (e.g. Shopify analytics) is fine
    if (lowerHtml.includes('<noscript>')) {
      // Check if noscript content mentions JavaScript
      const noscriptMatch = html.match(/<noscript[^>]*>([\s\S]*?)<\/noscript>/i);
      if (noscriptMatch) {
        const noscriptContent = noscriptMatch[1].toLowerCase();
        if (
          noscriptContent.includes('javascript') ||
          noscriptContent.includes('enable') ||
          noscriptContent.includes('browser')
        ) {
          return true;
        }
      }
    }
  }

  // Check for empty body with only script tags (client-side rendered SPA)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .trim();
    if (bodyContent.length < 100) {
      return true;
    }
  }

  return false;
}
