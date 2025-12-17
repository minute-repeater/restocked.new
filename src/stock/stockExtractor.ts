import type {
  StockExtractionContext,
  StockExtractionResult,
} from "./stockTypes.js";
import { NotifyMeStockStrategy } from "./strategies/notifyMeStockStrategy.js";
import { JsonStockStrategy } from "./strategies/jsonStockStrategy.js";
import { DomStockStrategy } from "./strategies/domStockStrategy.js";
import { ButtonStockStrategy } from "./strategies/buttonStockStrategy.js";
import { HeuristicStockStrategy } from "./strategies/heuristicStockStrategy.js";

/**
 * Extract stock status using multiple strategies
 * Runs strategies sequentially and returns the first non-null result
 *
 * Strategy execution order (PRECEDENCE RULES):
 * 
 * 1. NotifyMe strategy (HIGHEST PRIORITY)
 *    - Runs FIRST because fashion/luxury sites remove purchase controls when OOS
 *    - Detects "Notify me" / "Get notified" CTAs, email waitlist forms
 *    - Product JSON often shows product-level availability, not variant-level
 *    - If notify UI is present AND no active purchase CTA → OUT_OF_STOCK
 * 
 * 2. JSON strategy (high reliability if JSON exists)
 *    - Extracts from JSON-LD, product JSON, etc.
 *    - May not reflect variant-specific availability
 * 
 * 3. DOM strategy (works for most HTML pages)
 *    - Text pattern matching in DOM elements
 *    - Checks data attributes
 * 
 * 4. Button strategy (UI element state detection)
 *    - Checks button text and disabled states
 * 
 * 5. Heuristic strategy (fallback for ambiguous cases)
 *    - Last resort pattern matching
 *
 * VARIANT HANDLING:
 * - URL params like ?variant=... are respected because the page renders variant-specific UI
 * - NotifyMe strategy detects the current UI state which reflects the selected variant
 * - JSON strategy may show product-level data (less reliable for variants)
 *
 * @param context - Extraction context with DOM, HTML, JSON, and URL
 * @returns StockExtractionResult from the first successful strategy
 */
export function extractStock(
  context: StockExtractionContext
): StockExtractionResult {
  const allNotes: string[] = [];

  // Strategy execution order matters - run in priority order
  // NotifyMe runs FIRST to catch fashion/luxury OOS patterns before JSON
  const strategies = [
    new NotifyMeStockStrategy(),  // HIGHEST PRIORITY: Detects notify-me UI patterns
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
          // FIX #6: Return strategyName as structured field instead of parsing from notes
          strategyName: strategy.name,
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
    strategyName: undefined,
  };
}









