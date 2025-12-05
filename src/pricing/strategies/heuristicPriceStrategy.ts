import { PriceStrategy } from "./basePriceStrategy.js";
import { extractPriceLikeStrings } from "../../parser/textExtraction.js";
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
 *
 * @param rawPrice - Raw price string
 * @returns Parsed number or null
 */
function parsePriceAmount(rawPrice: string): number | null {
  if (!rawPrice || typeof rawPrice !== "string") {
    return null;
  }

  // Remove currency symbols and clean
  let cleaned = rawPrice
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

  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Score a price candidate based on confidence
 *
 * @param priceText - Price text to score
 * @returns Score (higher is better)
 */
function scorePriceCandidate(priceText: string): number {
  let score = 0;

  // Prefer prices with currency symbol or code
  if (detectCurrency(priceText)) {
    score += 10;
  }

  // Prefer decimal prices (more likely to be actual prices)
  if (/\.\d{2}/.test(priceText)) {
    score += 5;
  }

  // Prefer reasonable price ranges
  const amount = parsePriceAmount(priceText);
  if (amount !== null) {
    if (amount >= 0.1 && amount <= 10000) {
      score += 5;
    } else if (amount < 0.1 || amount > 10000) {
      // Penalize unrealistic prices
      score -= 10;
    }
  }

  // Prefer longer price strings (more complete)
  if (priceText.length >= 4) {
    score += 2;
  }

  return score;
}

/**
 * Heuristic-based price extraction strategy
 * Uses text extraction utilities as fallback when DOM and JSON strategies fail
 */
export class HeuristicPriceStrategy extends PriceStrategy {
  name = "heuristic-price-strategy";

  extract(context: PriceExtractionContext): PriceExtractionResult {
    const notes: string[] = [];

    // Use extractPriceLikeStrings from textExtraction
    const priceStrings = extractPriceLikeStrings(context.html);

    if (priceStrings.length === 0) {
      return {
        price: null,
        notes: ["No price-like strings found in HTML"],
      };
    }

    // Filter out unrealistic values
    const validCandidates = priceStrings
      .map((priceText) => ({
        text: priceText,
        amount: parsePriceAmount(priceText),
        currency: detectCurrency(priceText),
        score: scorePriceCandidate(priceText),
      }))
      .filter((candidate) => {
        // Remove candidates that couldn't be parsed
        if (candidate.amount === null) {
          return false;
        }

        // Remove unrealistic prices (below 0.1 or above 10,000)
        if (candidate.amount < 0.1 || candidate.amount > 10000) {
          return false;
        }

        return true;
      });

    if (validCandidates.length === 0) {
      return {
        price: null,
        notes: [
          `Found ${priceStrings.length} price-like string(s) but none were valid`,
        ],
      };
    }

    // Sort by score (highest first)
    validCandidates.sort((a, b) => b.score - a.score);
    const bestCandidate = validCandidates[0];

    notes.push(`Found ${priceStrings.length} price-like string(s) in HTML`);
    notes.push(`Filtered to ${validCandidates.length} valid candidate(s)`);
    notes.push(`Selected best candidate: ${bestCandidate.text}`);

    return {
      price: {
        currency: bestCandidate.currency,
        amount: bestCandidate.amount,
        raw: bestCandidate.text,
        metadata: {
          source: "heuristic",
          candidatesCount: validCandidates.length,
          score: bestCandidate.score,
        },
      },
      notes,
    };
  }
}





