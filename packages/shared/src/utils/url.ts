/**
 * Normalizes a product URL to a canonical form for deduplication.
 * Removes tracking parameters, normalizes protocol, etc.
 */
export function normalizeProductUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Force HTTPS
    parsed.protocol = 'https:';

    // Remove common tracking parameters
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'ref_',
      'tag',
      'fbclid',
      'gclid',
      'msclkid',
      'affiliate',
      'aff',
      'source',
      'src',
    ];

    trackingParams.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    // Remove trailing slash
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    // Remove hash
    parsed.hash = '';

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    return parsed.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Extracts the retailer/domain name from a URL.
 */
export function extractRetailer(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Remove 'www.' prefix and extract domain
    const hostname = parsed.hostname.replace(/^www\./, '');
    // Get the main domain (e.g., "amazon" from "amazon.com")
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return hostname;
  } catch {
    return null;
  }
}

/**
 * Validates that a string is a valid HTTP(S) URL.
 */
export function isValidProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
