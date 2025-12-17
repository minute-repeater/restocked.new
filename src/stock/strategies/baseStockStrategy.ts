import type {
  StockExtractionContext,
  StockExtractionResult,
} from "../stockTypes.js";

/**
 * Abstract base class for stock extraction strategies
 * Provides a pluggable architecture for different extraction approaches
 *
 * Each strategy implements its own extraction logic:
 * - JSON-based extraction (from embedded JSON-LD, Shopify JSON, etc.)
 * - DOM-based extraction (from text patterns, attributes, etc.)
 * - Button-based extraction (from button states and text)
 * - Heuristic-based extraction (from text patterns, fallback detection)
 */
export abstract class StockStrategy {
  /**
   * Unique name identifier for this strategy
   * Used for logging and debugging
   */
  abstract name: string;

  /**
   * Extract stock status from the given context
   * Each strategy implements its own extraction logic
   *
   * @param context - Extraction context with DOM, HTML, JSON, and URL
   * @returns StockExtractionResult with extracted stock status and notes
   */
  abstract extract(
    context: StockExtractionContext
  ): StockExtractionResult;
}









