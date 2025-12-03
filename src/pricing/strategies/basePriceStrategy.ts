import type {
  PriceExtractionContext,
  PriceExtractionResult,
} from "../priceTypes.js";

/**
 * Abstract base class for price extraction strategies
 * Provides a pluggable architecture for different extraction approaches
 *
 * Each strategy implements its own extraction logic:
 * - JSON-based extraction (from embedded JSON-LD, Shopify JSON, etc.)
 * - DOM-based extraction (from price selectors, meta tags, etc.)
 * - Heuristic-based extraction (from text patterns, fallback detection)
 */
export abstract class PriceStrategy {
  /**
   * Unique name identifier for this strategy
   * Used for logging and debugging
   */
  abstract name: string;

  /**
   * Extract price from the given context
   * Each strategy implements its own extraction logic
   *
   * @param context - Extraction context with DOM, HTML, JSON, and URL
   * @returns PriceExtractionResult with extracted price and notes
   */
  abstract extract(
    context: PriceExtractionContext
  ): PriceExtractionResult;
}


