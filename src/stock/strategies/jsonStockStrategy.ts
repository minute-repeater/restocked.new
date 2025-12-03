import { StockStrategy } from "./baseStockStrategy.js";
import type {
  StockExtractionContext,
  StockExtractionResult,
  StockShell,
  StockStatus,
} from "../stockTypes.js";

/**
 * Common stock/availability field names in JSON structures
 */
const STOCK_FIELDS = [
  "availability",
  "availableForSale",
  "inStock",
  "isAvailable",
  "stock_status",
  "stockStatus",
  "quantity",
  "inventory",
  "availability_status",
  "availabilityStatus",
];

/**
 * JSON-LD availability values mapping
 */
const JSON_LD_AVAILABILITY_MAP: Record<string, StockStatus> = {
  "https://schema.org/InStock": "in_stock",
  "https://schema.org/OutOfStock": "out_of_stock",
  "https://schema.org/PreOrder": "preorder",
  "https://schema.org/BackOrder": "backorder",
  "https://schema.org/PreSale": "preorder",
  "InStock": "in_stock",
  "OutOfStock": "out_of_stock",
  "PreOrder": "preorder",
  "BackOrder": "backorder",
  "PreSale": "preorder",
};

/**
 * Map a value to stock status
 *
 * @param value - Value to map
 * @returns Stock status or null
 */
function mapValueToStatus(value: any): StockStatus | null {
  if (value === null || value === undefined) {
    return null;
  }

  const str = String(value).trim();

  // Check JSON-LD availability values
  if (JSON_LD_AVAILABILITY_MAP[str]) {
    return JSON_LD_AVAILABILITY_MAP[str];
  }

  // Check boolean values
  if (typeof value === "boolean") {
    return value ? "in_stock" : "out_of_stock";
  }

  // Check numeric quantity
  if (typeof value === "number") {
    if (value > 0) {
      return value < 5 ? "low_stock" : "in_stock";
    }
    return "out_of_stock";
  }

  // Check string patterns
  const lowerStr = str.toLowerCase();
  if (lowerStr.includes("in stock") || lowerStr.includes("available")) {
    return "in_stock";
  }
  if (
    lowerStr.includes("out of stock") ||
    lowerStr.includes("sold out") ||
    lowerStr.includes("unavailable")
  ) {
    return "out_of_stock";
  }
  if (lowerStr.includes("backorder")) {
    return "backorder";
  }
  if (lowerStr.includes("preorder")) {
    return "preorder";
  }
  if (lowerStr.includes("low stock")) {
    return "low_stock";
  }

  return null;
}

/**
 * Recursively search for stock/availability values in JSON object
 *
 * @param obj - Object to search
 * @param depth - Current depth (prevents infinite recursion)
 * @param maxDepth - Maximum depth
 * @returns Array of stock candidates with context
 */
function findStockCandidates(
  obj: any,
  depth: number = 0,
  maxDepth: number = 10
): Array<{ status: StockStatus; raw: any; path: string }> {
  const candidates: Array<{ status: StockStatus; raw: any; path: string }> = [];

  if (depth > maxDepth || !obj || typeof obj !== "object") {
    return candidates;
  }

  // If it's an array, search each element
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      candidates.push(...findStockCandidates(obj[i], depth + 1, maxDepth));
    }
    return candidates;
  }

  // Check for stock fields
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase();

    // Check if this is a stock field
    if (STOCK_FIELDS.some((field) => normalizedKey.includes(field))) {
      const status = mapValueToStatus(value);
      if (status) {
        candidates.push({
          status,
          raw: value,
          path: key,
        });
      }
    }

    // Check for offers array (JSON-LD pattern)
    if (normalizedKey === "offers" && Array.isArray(value)) {
      for (const offer of value) {
        if (offer && typeof offer === "object") {
          // Look for availability in offer
          const offerAvailability = offer.availability || offer.availableForSale;

          if (offerAvailability !== undefined) {
            const status = mapValueToStatus(offerAvailability);
            if (status) {
              candidates.push({
                status,
                raw: offerAvailability,
                path: `${key}[].availability`,
              });
            }
          }

          // Also check quantity
          if (offer.quantity !== undefined) {
            const status = mapValueToStatus(offer.quantity);
            if (status) {
              candidates.push({
                status,
                raw: offer.quantity,
                path: `${key}[].quantity`,
              });
            }
          }
        }
      }
    }

    // Recursively search nested objects
    if (value && typeof value === "object") {
      candidates.push(...findStockCandidates(value, depth + 1, maxDepth));
    }
  }

  return candidates;
}

/**
 * Score a stock candidate based on context
 *
 * @param candidate - Stock candidate to score
 * @returns Score (higher is better)
 */
function scoreStockCandidate(candidate: {
  status: StockStatus;
  raw: any;
  path: string;
}): number {
  let score = 0;

  // Prefer more specific statuses
  if (candidate.status === "in_stock" || candidate.status === "out_of_stock") {
    score += 10;
  }

  // Prefer offers array (JSON-LD)
  if (candidate.path.includes("offers")) {
    score += 5;
  }

  // Prefer availability field over quantity
  if (candidate.path.toLowerCase().includes("availability")) {
    score += 3;
  }

  return score;
}

/**
 * JSON-based stock extraction strategy
 * Extracts stock status from embedded JSON structures
 */
export class JsonStockStrategy extends StockStrategy {
  name = "json-stock-strategy";

  extract(context: StockExtractionContext): StockExtractionResult {
    const notes: string[] = [];

    if (!context.jsonBlobs || context.jsonBlobs.length === 0) {
      return {
        stock: null,
        notes: ["No JSON blobs found for stock extraction"],
      };
    }

    const allCandidates: Array<{
      status: StockStatus;
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
        const candidates = findStockCandidates(blob);
        if (candidates.length > 0) {
          notes.push(
            `Found ${candidates.length} stock candidate(s) in JSON source ${i + 1}`
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
        stock: null,
        notes: notes.length > 0 ? notes : ["No stock fields found in JSON"],
      };
    }

    // Score and sort candidates
    const scoredCandidates = allCandidates.map((c) => ({
      ...c,
      score: scoreStockCandidate(c),
    }));

    scoredCandidates.sort((a, b) => b.score - a.score);
    const bestCandidate = scoredCandidates[0];

    notes.push(`Selected best candidate: ${bestCandidate.status} (from ${bestCandidate.path})`);

    return {
      stock: {
        status: bestCandidate.status,
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


