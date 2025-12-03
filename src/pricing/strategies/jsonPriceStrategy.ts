import { PriceStrategy } from "./basePriceStrategy.js";
import type {
  PriceExtractionContext,
  PriceExtractionResult,
  PriceShell,
} from "../priceTypes.js";

/**
 * Currency symbol to currency code mapping (same as DOM strategy)
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
 * Common price field names in JSON structures
 */
const PRICE_FIELDS = [
  "price",
  "price_amount",
  "priceValue",
  "price_value",
  "amount",
  "cost",
  "value",
  "current_price",
  "sale_price",
  "regular_price",
  "final_price",
];

/**
 * Common currency field names
 */
const CURRENCY_FIELDS = [
  "currency",
  "currency_code",
  "currencyCode",
  "price_currency",
  "priceCurrency",
];

/**
 * Detect currency from value
 *
 * @param value - Value that might contain currency info
 * @returns Currency code or null
 */
function detectCurrency(value: any): string | null {
  if (!value) {
    return null;
  }

  const str = String(value).toUpperCase();

  // Check for currency codes
  for (const code of CURRENCY_CODES) {
    if (str === code || str.includes(code)) {
      return code;
    }
  }

  // Check for currency symbols
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (str.includes(symbol)) {
      return code;
    }
  }

  return null;
}

/**
 * Parse numeric price from value
 *
 * @param value - Value that might be a price
 * @returns Parsed number or null
 */
function parsePriceAmount(value: any): number | null {
  if (typeof value === "number") {
    return value > 0 && isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  // Remove currency symbols and clean
  let cleaned = value
    .replace(/[$€£¥₹]/g, "")
    .replace(/[^\d.,\s-]/g, "")
    .trim();

  // Handle European format
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, ".");
  }

  cleaned = cleaned.replace(/\s+/g, "");
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

/**
 * Recursively search for price-like values in JSON object
 *
 * @param obj - Object to search
 * @param depth - Current depth (prevents infinite recursion)
 * @param maxDepth - Maximum depth
 * @returns Array of price candidates with context
 */
function findPriceCandidates(
  obj: any,
  depth: number = 0,
  maxDepth: number = 10
): Array<{ amount: number; currency: string | null; raw: any; path: string }> {
  const candidates: Array<{
    amount: number;
    currency: string | null;
    raw: any;
    path: string;
  }> = [];

  if (depth > maxDepth || !obj || typeof obj !== "object") {
    return candidates;
  }

  // If it's an array, search each element
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      candidates.push(...findPriceCandidates(obj[i], depth + 1, maxDepth));
    }
    return candidates;
  }

  // Check for price fields
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase();

    // Check if this is a price field
    if (PRICE_FIELDS.some((field) => normalizedKey.includes(field))) {
      const amount = parsePriceAmount(value);
      if (amount !== null) {
        // Look for currency in same object or parent
        let currency: string | null = null;

        // Check for currency field in same object
        for (const currencyField of CURRENCY_FIELDS) {
          if (obj[currencyField]) {
            currency = detectCurrency(obj[currencyField]);
            if (currency) break;
          }
        }

        // Check for currency in key name
        if (!currency) {
          currency = detectCurrency(key);
        }

        candidates.push({
          amount,
          currency,
          raw: value,
          path: key,
        });
      }
    }

    // Check for offers array (JSON-LD pattern)
    if (normalizedKey === "offers" && Array.isArray(value)) {
      for (const offer of value) {
        if (offer && typeof offer === "object") {
          // Look for price and priceCurrency in offer
          const offerPrice = offer.price || offer.priceAmount;
          const offerCurrency = offer.priceCurrency || offer.currency;

          if (offerPrice) {
            const amount = parsePriceAmount(offerPrice);
            if (amount !== null) {
              candidates.push({
                amount,
                currency: offerCurrency ? detectCurrency(offerCurrency) : null,
                raw: offerPrice,
                path: `${key}[].price`,
              });
            }
          }
        }
      }
    }

    // Recursively search nested objects
    if (value && typeof value === "object") {
      candidates.push(...findPriceCandidates(value, depth + 1, maxDepth));
    }
  }

  return candidates;
}

/**
 * Score a price candidate based on context
 * Higher score = more likely to be the actual product price
 *
 * @param candidate - Price candidate to score
 * @returns Score (higher is better)
 */
function scorePriceCandidate(candidate: {
  amount: number;
  currency: string | null;
  raw: any;
  path: string;
}): number {
  let score = 0;

  // Prefer prices with currency
  if (candidate.currency) {
    score += 10;
  }

  // Prefer reasonable price ranges
  if (candidate.amount >= 0.01 && candidate.amount <= 100000) {
    score += 5;
  }

  // Prefer "current_price" or "sale_price" over generic "price"
  if (candidate.path.toLowerCase().includes("current") || candidate.path.toLowerCase().includes("sale")) {
    score += 3;
  }

  // Prefer offers array prices (JSON-LD)
  if (candidate.path.includes("offers")) {
    score += 2;
  }

  return score;
}

/**
 * JSON-based price extraction strategy
 * Extracts prices from embedded JSON structures
 */
export class JsonPriceStrategy extends PriceStrategy {
  name = "json-price-strategy";

  extract(context: PriceExtractionContext): PriceExtractionResult {
    const notes: string[] = [];

    if (!context.jsonBlobs || context.jsonBlobs.length === 0) {
      return {
        price: null,
        notes: ["No JSON blobs found for price extraction"],
      };
    }

    const allCandidates: Array<{
      amount: number;
      currency: string | null;
      raw: any;
      path: string;
    }> = [];

    // Search each JSON blob
    for (let i = 0; i < context.jsonBlobs.length; i++) {
      const blob = context.jsonBlobs[i];
      if (!blob || typeof blob !== "object") {
        continue;
      }

      try {
        const candidates = findPriceCandidates(blob);
        if (candidates.length > 0) {
          notes.push(
            `Found ${candidates.length} price candidate(s) in JSON source ${i + 1}`
          );
          allCandidates.push(...candidates);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        notes.push(`Error searching JSON source ${i + 1}: ${errorMessage}`);
      }
    }

    if (allCandidates.length === 0) {
      return {
        price: null,
        notes: notes.length > 0 ? notes : ["No price fields found in JSON"],
      };
    }

    // Score and sort candidates
    const scoredCandidates = allCandidates.map((c) => ({
      ...c,
      score: scorePriceCandidate(c),
    }));

    scoredCandidates.sort((a, b) => b.score - a.score);
    const bestCandidate = scoredCandidates[0];

    notes.push(`Selected best candidate: ${bestCandidate.amount} ${bestCandidate.currency || ""}`);

    return {
      price: {
        currency: bestCandidate.currency,
        amount: bestCandidate.amount,
        raw: String(bestCandidate.raw),
        metadata: {
          source: "json",
          path: bestCandidate.path,
          candidatesCount: allCandidates.length,
          score: bestCandidate.score,
        },
      },
      notes,
    };
  }
}


