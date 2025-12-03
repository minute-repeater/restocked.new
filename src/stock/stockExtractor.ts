import type {
  StockExtractionContext,
  StockExtractionResult,
} from "./stockTypes.js";
import { JsonStockStrategy } from "./strategies/jsonStockStrategy.js";
import { DomStockStrategy } from "./strategies/domStockStrategy.js";
import { ButtonStockStrategy } from "./strategies/buttonStockStrategy.js";
import { HeuristicStockStrategy } from "./strategies/heuristicStockStrategy.js";

/**
 * Extract stock status using multiple strategies
 * Runs strategies sequentially and returns the first non-null result
 *
 * Strategy execution order:
 * 1. JSON strategy (most reliable if JSON exists)
 * 2. DOM strategy (works for most HTML pages)
 * 3. Button strategy (UI element state detection)
 * 4. Heuristic strategy (fallback for ambiguous cases)
 *
 * @param context - Extraction context with DOM, HTML, JSON, and URL
 * @returns StockExtractionResult from the first successful strategy
 */
export function extractStock(
  context: StockExtractionContext
): StockExtractionResult {
  const allNotes: string[] = [];

  // Strategy execution order matters - run in priority order
  const strategies = [
    new JsonStockStrategy(),
    new DomStockStrategy(),
    new ButtonStockStrategy(),
    new HeuristicStockStrategy(),
  ];

  // Run each strategy sequentially until one returns a non-null stock status
  for (const strategy of strategies) {
    try {
      const result = strategy.extract(context);

      // If this strategy found stock info, return it immediately
      if (result.stock !== null) {
        // Combine notes from all strategies attempted
        if (result.notes) {
          allNotes.push(...result.notes);
        }
        allNotes.push(`Stock status extracted using ${strategy.name}`);

        return {
          stock: result.stock,
          notes: allNotes.length > 0 ? allNotes : undefined,
        };
      }

      // Strategy didn't find stock info, collect notes and continue
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

  // No strategy found stock info
  return {
    stock: null,
    notes: allNotes.length > 0 ? allNotes : ["No stock status found by any strategy"],
  };
}


