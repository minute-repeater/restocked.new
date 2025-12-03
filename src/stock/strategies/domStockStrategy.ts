import { StockStrategy } from "./baseStockStrategy.js";
import { findAll, getAttr } from "../../parser/queryHelpers.js";
import { extractCleanText, normalizeText } from "../../parser/textExtraction.js";
import type {
  StockExtractionContext,
  StockExtractionResult,
  StockShell,
  StockStatus,
} from "../stockTypes.js";

/**
 * In-stock text patterns (case-insensitive)
 */
const IN_STOCK_PATTERNS = [
  /in\s+stock/i,
  /available/i,
  /ships\s+today/i,
  /ships\s+in/i,
  /add\s+to\s+bag/i,
  /ready\s+to\s+ship/i,
  /ships\s+within/i,
  /available\s+now/i,
  /in\s+stock\s+now/i,
];

/**
 * Out-of-stock text patterns (case-insensitive)
 */
const OUT_OF_STOCK_PATTERNS = [
  /out\s+of\s+stock/i,
  /sold\s+out/i,
  /unavailable/i,
  /not\s+available/i,
  /notify\s+me/i,
  /email\s+me\s+when\s+available/i,
  /coming\s+soon/i,
  /temporarily\s+unavailable/i,
  /currently\s+unavailable/i,
];

/**
 * Low stock patterns
 */
const LOW_STOCK_PATTERNS = [
  /low\s+stock/i,
  /only\s+\d+\s+left/i,
  /few\s+left/i,
  /limited\s+quantity/i,
];

/**
 * Backorder patterns
 */
const BACKORDER_PATTERNS = [
  /backorder/i,
  /back\s+order/i,
  /ships\s+when\s+available/i,
];

/**
 * Preorder patterns
 */
const PREORDER_PATTERNS = [
  /preorder/i,
  /pre[- ]order/i,
  /pre[- ]order\s+now/i,
];

/**
 * Score a stock status match based on context
 * Higher score = more reliable match
 *
 * @param text - Text that matched a pattern
 * @param element - Element containing the text
 * @param patternType - Type of pattern matched
 * @returns Score (higher is better)
 */
function scoreStockMatch(
  text: string,
  element: ReturnType<typeof findAll>[0] | null,
  patternType: "in_stock" | "out_of_stock" | "low_stock" | "backorder" | "preorder"
): number {
  let score = 0;

  if (!element) {
    return score;
  }

  // Check class names and IDs for stock-related indicators
  const className = getAttr(element, "class") || "";
  const id = getAttr(element, "id") || "";

  // Higher priority selectors
  if (
    /stock|availability|inventory/i.test(className) ||
    /stock|availability|inventory/i.test(id)
  ) {
    score += 10;
  }

  // Check parent context
  const parent = element.parent();
  const parentText = extractCleanText(parent);
  if (/stock|availability/i.test(parentText)) {
    score += 5;
  }

  // Prefer exact matches over partial matches
  const normalizedText = normalizeText(text);
  if (
    normalizedText === "in stock" ||
    normalizedText === "out of stock" ||
    normalizedText === "sold out"
  ) {
    score += 3;
  }

  // Pattern type priority
  if (patternType === "in_stock" || patternType === "out_of_stock") {
    score += 2; // These are more reliable
  }

  return score;
}

/**
 * Match text against stock patterns and return status
 *
 * @param text - Text to check
 * @returns Stock status and matched text or null
 */
function matchStockPattern(text: string): {
  status: StockStatus;
  matchedText: string;
} | null {
  const normalized = normalizeText(text);

  // Check in-stock patterns
  for (const pattern of IN_STOCK_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { status: "in_stock", matchedText: match[0] };
    }
  }

  // Check out-of-stock patterns
  for (const pattern of OUT_OF_STOCK_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { status: "out_of_stock", matchedText: match[0] };
    }
  }

  // Check low stock patterns
  for (const pattern of LOW_STOCK_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { status: "low_stock", matchedText: match[0] };
    }
  }

  // Check backorder patterns
  for (const pattern of BACKORDER_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { status: "backorder", matchedText: match[0] };
    }
  }

  // Check preorder patterns
  for (const pattern of PREORDER_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { status: "preorder", matchedText: match[0] };
    }
  }

  return null;
}

/**
 * DOM-based stock extraction strategy
 * Extracts stock status from DOM text patterns and attributes
 */
export class DomStockStrategy extends StockStrategy {
  name = "dom-stock-strategy";

  extract(context: StockExtractionContext): StockExtractionResult {
    const notes: string[] = [];
    const candidates: Array<{
      status: StockStatus;
      raw: string;
      element: ReturnType<typeof findAll>[0] | null;
      score: number;
    }> = [];

    // Search all text nodes for stock patterns
    const allElements = findAll(
      context.$,
      "body *"
    );

    for (const element of allElements) {
      const text = extractCleanText(element);
      if (!text || text.length < 3) {
        continue;
      }

      const match = matchStockPattern(text);
      if (match && match.status !== "unknown") {
        const score = scoreStockMatch(text, element, match.status);
        candidates.push({
          status: match.status,
          raw: match.matchedText,
          element,
          score,
        });
      }
    }

    // Also check data attributes
    const elementsWithData = findAll(context.$, "[data-stock], [data-availability], [data-inventory]");
    for (const element of elementsWithData) {
      const stockAttr =
        getAttr(element, "data-stock") ||
        getAttr(element, "data-availability") ||
        getAttr(element, "data-inventory");

      if (stockAttr) {
        const match = matchStockPattern(stockAttr);
        if (match && match.status !== "unknown") {
          const score = scoreStockMatch(stockAttr, element, match.status);
          candidates.push({
            status: match.status,
            raw: stockAttr,
            element,
            score,
          });
        }
      }
    }

    if (candidates.length === 0) {
      return {
        stock: null,
        notes: ["No stock patterns found in DOM"],
      };
    }

    // Sort by score (highest first) and take the best match
    candidates.sort((a, b) => b.score - a.score);
    const bestMatch = candidates[0];

    notes.push(`Found ${candidates.length} stock pattern(s) in DOM`);
    notes.push(`Selected best match: ${bestMatch.status} (${bestMatch.raw})`);

    return {
      stock: {
        status: bestMatch.status,
        raw: bestMatch.raw,
        metadata: {
          source: "dom",
          score: bestMatch.score,
          candidatesCount: candidates.length,
        },
      },
      notes,
    };
  }
}


