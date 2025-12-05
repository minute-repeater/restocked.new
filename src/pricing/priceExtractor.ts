import type {
  PriceExtractionContext,
  PriceExtractionResult,
} from "./priceTypes.js";
import { JsonPriceStrategy } from "./strategies/jsonPriceStrategy.js";
import { DomPriceStrategy } from "./strategies/domPriceStrategy.js";
import { HeuristicPriceStrategy } from "./strategies/heuristicPriceStrategy.js";

/**
 * Extract price using multiple strategies
 * Runs strategies sequentially and returns the first non-null result
 *
 * Strategy execution order:
 * 1. JSON strategy (most reliable if JSON exists)
 * 2. DOM strategy (works for most HTML pages)
 * 3. Heuristic strategy (fallback for ambiguous cases)
 *
 * @param context - Extraction context with DOM, HTML, JSON, and URL
 * @returns PriceExtractionResult from the first successful strategy
 */
export function extractPrice(
  context: PriceExtractionContext
): PriceExtractionResult {
  const allNotes: string[] = [];

  // Strategy execution order matters - run in priority order
  const strategies = [
    new JsonPriceStrategy(),
    new DomPriceStrategy(),
    new HeuristicPriceStrategy(),
  ];

  // Run each strategy sequentially until one returns a non-null price
  for (const strategy of strategies) {
    try {
      const result = strategy.extract(context);

      // If this strategy found a price, return it immediately
      if (result.price !== null) {
        // Combine notes from all strategies attempted
        if (result.notes) {
          allNotes.push(...result.notes);
        }
        allNotes.push(`Price extracted using ${strategy.name}`);

        return {
          price: result.price,
          notes: allNotes.length > 0 ? allNotes : undefined,
        };
      }

      // Strategy didn't find a price, collect notes and continue
      if (result.notes) {
        allNotes.push(...result.notes);
      }
    } catch (error) {
      // If a strategy fails, log it but continue with other strategies
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      allNotes.push(`Strategy ${strategy.name} failed: ${errorMessage}`);
    }
  }

  // No strategy found a price
  return {
    price: null,
    notes: allNotes.length > 0 ? allNotes : ["No price found by any strategy"],
  };
}





