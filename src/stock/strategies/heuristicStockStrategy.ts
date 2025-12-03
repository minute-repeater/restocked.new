import { StockStrategy } from "./baseStockStrategy.js";
import { extractStockLikeStrings } from "../../parser/textExtraction.js";
import type {
  StockExtractionContext,
  StockExtractionResult,
  StockShell,
  StockStatus,
} from "../stockTypes.js";

/**
 * Map stock-like strings to stock status
 *
 * @param stockString - Stock-like string from text extraction
 * @returns Stock status or null
 */
function mapStockStringToStatus(stockString: string): StockStatus | null {
  const normalized = stockString.toLowerCase().trim();

  // In-stock patterns
  if (
    normalized.includes("in stock") ||
    normalized.includes("available") ||
    normalized.includes("ships today") ||
    normalized.includes("ready to ship")
  ) {
    return "in_stock";
  }

  // Out-of-stock patterns
  if (
    normalized.includes("out of stock") ||
    normalized.includes("sold out") ||
    normalized.includes("unavailable") ||
    normalized.includes("not available")
  ) {
    return "out_of_stock";
  }

  // Low stock patterns
  if (
    normalized.includes("low stock") ||
    normalized.includes("only") ||
    normalized.includes("few left")
  ) {
    return "low_stock";
  }

  // Backorder patterns
  if (
    normalized.includes("backorder") ||
    normalized.includes("back order") ||
    normalized.includes("ships when available")
  ) {
    return "backorder";
  }

  // Preorder patterns
  if (
    normalized.includes("preorder") ||
    normalized.includes("pre-order") ||
    normalized.includes("pre order")
  ) {
    return "preorder";
  }

  return null;
}

/**
 * Score a stock string based on confidence
 *
 * @param stockString - Stock string to score
 * @param status - Mapped status
 * @returns Score (higher is better)
 */
function scoreStockString(stockString: string, status: StockStatus): number {
  let score = 5; // Base score

  const normalized = stockString.toLowerCase();

  // Prefer exact matches
  if (
    normalized === "in stock" ||
    normalized === "out of stock" ||
    normalized === "sold out"
  ) {
    score += 5;
  }

  // Prefer more specific statuses
  if (status === "in_stock" || status === "out_of_stock") {
    score += 3;
  }

  return score;
}

/**
 * Heuristic-based stock extraction strategy
 * Uses text extraction utilities as fallback when other strategies fail
 */
export class HeuristicStockStrategy extends StockStrategy {
  name = "heuristic-stock-strategy";

  extract(context: StockExtractionContext): StockExtractionResult {
    const notes: string[] = [];

    // Use extractStockLikeStrings from textExtraction
    const stockStrings = extractStockLikeStrings(context.html);

    if (stockStrings.length === 0) {
      return {
        stock: null,
        notes: ["No stock-like strings found in HTML"],
      };
    }

    // Map strings to statuses and score them
    const candidates: Array<{
      status: StockStatus;
      raw: string;
      score: number;
    }> = [];

    for (const stockString of stockStrings) {
      const status = mapStockStringToStatus(stockString);
      if (status) {
        const score = scoreStockString(stockString, status);
        candidates.push({ status, raw: stockString, score });
      }
    }

    if (candidates.length === 0) {
      return {
        stock: null,
        notes: [
          `Found ${stockStrings.length} stock-like string(s) but none mapped to valid status`,
        ],
      };
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);
    const bestCandidate = candidates[0];

    notes.push(`Found ${stockStrings.length} stock-like string(s) in HTML`);
    notes.push(`Filtered to ${candidates.length} valid candidate(s)`);
    notes.push(`Selected best candidate: ${bestCandidate.status} (${bestCandidate.raw})`);

    return {
      stock: {
        status: bestCandidate.status,
        raw: bestCandidate.raw,
        metadata: {
          source: "heuristic",
          candidatesCount: candidates.length,
          score: bestCandidate.score,
        },
      },
      notes,
    };
  }
}


