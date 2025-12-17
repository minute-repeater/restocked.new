import { PriceStrategy } from "./basePriceStrategy.js";
import { safeQuery, findAll, getAttr } from "../../parser/queryHelpers.js";
import { extractCleanText } from "../../parser/textExtraction.js";
import type {
  PriceExtractionContext,
  PriceExtractionResult,
  PriceShell,
} from "../priceTypes.js";

/**
 * Currency symbol to currency code mapping
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "A$": "AUD",
  "C$": "CAD",
  "CHF": "CHF",
  "CN¥": "CNY",
};

/**
 * Currency code patterns (case-insensitive)
 */
const CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "INR",
];

/**
 * Detect currency from raw price string
 * Looks for currency symbols ($, €, £) or currency codes (USD, EUR, GBP)
 *
 * @param rawPrice - Raw price string
 * @returns Currency code or null
 */
function detectCurrency(rawPrice: string): string | null {
  if (!rawPrice || typeof rawPrice !== "string") {
    return null;
  }

  // Check for currency symbols
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (rawPrice.includes(symbol)) {
      return code;
    }
  }

  // Check for currency codes
  const upperPrice = rawPrice.toUpperCase();
  for (const code of CURRENCY_CODES) {
    if (upperPrice.includes(code)) {
      return code;
    }
  }

  return null;
}

/**
 * Parse numeric value from price string
 * Removes currency symbols and non-numeric characters except decimal point
 *
 * @param rawPrice - Raw price string
 * @returns Parsed number or null
 */
function parsePriceAmount(rawPrice: string): number | null {
  if (!rawPrice || typeof rawPrice !== "string") {
    return null;
  }

  // Remove currency symbols and clean the string
  let cleaned = rawPrice
    .replace(/[$€£¥₹]/g, "") // Remove currency symbols
    .replace(/[^\d.,\s-]/g, "") // Keep only digits, dots, commas, spaces, minus
    .trim();

  // Handle European format (comma as decimal separator)
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // If both comma and dot, assume comma is thousands separator
    cleaned = cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    // Only comma, assume it's decimal separator
    cleaned = cleaned.replace(/,/g, ".");
  }

  // Remove spaces and parse
  cleaned = cleaned.replace(/\s+/g, "");
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Extract price from text using regex patterns
 * Finds price-like strings in text content
 *
 * @param text - Text to scan
 * @returns Array of potential price strings
 */
function extractPricePatterns(text: string): string[] {
  const prices: string[] = [];

  // Pattern 1: Currency symbol followed by digits ($29.99, €199, £79)
  const symbolPattern = /[$€£¥₹]\s*\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?/g;
  const symbolMatches = text.match(symbolPattern);
  if (symbolMatches) {
    prices.push(...symbolMatches.map((m) => m.trim()));
  }

  // Pattern 2: Currency code followed by digits (USD 39, EUR 50.99)
  const codePattern = /(?:USD|EUR|GBP|JPY|AUD|CAD|CHF|CNY|INR)\s+\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?/gi;
  const codeMatches = text.match(codePattern);
  if (codeMatches) {
    prices.push(...codeMatches.map((m) => m.trim()));
  }

  // Pattern 3: Decimal numbers that look like prices (39.99, 1,234.56)
  const decimalPattern = /\d{1,3}(?:[,\s]\d{3})*\.\d{2}\b/g;
  const decimalMatches = text.match(decimalPattern);
  if (decimalMatches) {
    prices.push(...decimalMatches.map((m) => m.trim()));
  }

  return prices;
}

/**
 * Score a price candidate based on context
 * Higher score = more likely to be the actual product price
 *
 * @param priceText - Price text to score
 * @param element - Element containing the price
 * @returns Score (higher is better)
 */
function scorePriceCandidate(
  priceText: string,
  element: ReturnType<typeof safeQuery>
): number {
  let score = 0;

  if (!element) {
    return score;
  }

  // Check class names
  const className = getAttr(element, "class") || "";
  const id = getAttr(element, "id") || "";

  // Higher priority selectors
  if (
    /current[-_]?price|sale[-_]?price|product[-_]?price|price[-_]?now/i.test(
      className
    ) ||
    /current[-_]?price|sale[-_]?price|product[-_]?price/i.test(id)
  ) {
    score += 10;
  }

  // Medium priority selectors
  if (/price/i.test(className) || /price/i.test(id)) {
    score += 5;
  }

  // Check for "sale" or "discount" indicators
  const parentText = element.parent().text() || "";
  if (/sale|discount|special|deal/i.test(parentText)) {
    score += 3;
  }

  // Prefer prices that look complete (have currency symbol or code)
  if (detectCurrency(priceText)) {
    score += 2;
  }

  // Prefer reasonable price ranges (0.01 to 100,000)
  const amount = parsePriceAmount(priceText);
  if (amount !== null && amount >= 0.01 && amount <= 100000) {
    score += 1;
  }

  return score;
}

/**
 * DOM-based price extraction strategy
 * Extracts prices from DOM selectors, meta tags, and visible text patterns
 */
export class DomPriceStrategy extends PriceStrategy {
  name = "dom-price-strategy";

  extract(context: PriceExtractionContext): PriceExtractionResult {
    const notes: string[] = [];
    const candidates: Array<{ text: string; element: ReturnType<typeof safeQuery>; score: number }> = [];

    // A. Check common price selectors
    const priceSelectors = [
      '[class*="price"]',
      '[id*="price"]',
      '.current-price',
      '.sale-price',
      '.product-price',
      '.price .amount',
      '[data-price]',
    ];

    for (const selector of priceSelectors) {
      const elements = findAll(context.$, selector);
      for (const element of elements) {
        const text = extractCleanText(element);
        if (text) {
          const prices = extractPricePatterns(text);
          for (const price of prices) {
            const score = scorePriceCandidate(price, element);
            candidates.push({ text: price, element, score });
          }
        }
      }
    }

    // B. Check meta tags
    const metaPrice = safeQuery(context.$, 'meta[property="product:price:amount"]');
    if (metaPrice) {
      const amount = getAttr(metaPrice, "content");
      const currency = safeQuery(context.$, 'meta[property="product:price:currency"]');
      const currencyCode = currency ? getAttr(currency, "content") : null;

      if (amount) {
        const priceText = currencyCode ? `${currencyCode} ${amount}` : `$${amount}`;
        candidates.push({
          text: priceText,
          element: metaPrice,
          score: 15, // Meta tags are high priority
        });
      }
    }

    // C. Scan visible text for price patterns
    const bodyText = extractCleanText(context.$("body"));
    const textPrices = extractPricePatterns(bodyText);
    for (const price of textPrices) {
      // Only add if not already found in selectors
      if (!candidates.some((c) => c.text === price)) {
        candidates.push({ text: price, element: null, score: 1 });
      }
    }

    // D. Choose best candidate
    if (candidates.length === 0) {
      return {
        price: null,
        notes: ["No price patterns found in DOM"],
      };
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);
    const bestCandidate = candidates[0];

    // Parse the price
    const amount = parsePriceAmount(bestCandidate.text);
    const currency = detectCurrency(bestCandidate.text);

    if (amount === null) {
      return {
        price: null,
        notes: ["Found price-like strings but could not parse numeric value"],
      };
    }

    notes.push(`Found ${candidates.length} price candidate(s) in DOM`);
    notes.push(`Selected best candidate: ${bestCandidate.text}`);

    return {
      price: {
        currency,
        amount,
        raw: bestCandidate.text,
        metadata: {
          source: "dom",
          score: bestCandidate.score,
          candidatesCount: candidates.length,
        },
      },
      notes,
    };
  }
}









