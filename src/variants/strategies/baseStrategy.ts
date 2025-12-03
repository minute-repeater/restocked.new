import type {
  VariantExtractionContext,
  VariantExtractionResult,
} from "../variantTypes.js";

/**
 * Abstract base class for variant extraction strategies
 * Provides a pluggable architecture for different extraction approaches
 *
 * Each strategy implements its own extraction logic:
 * - JSON-based extraction (from embedded JSON-LD, Shopify JSON, etc.)
 * - DOM-based extraction (from select elements, buttons, etc.)
 * - Attribute-based extraction (heuristic detection of variant attributes)
 */
export abstract class VariantStrategy {
  /**
   * Unique name identifier for this strategy
   * Used for logging and debugging
   */
  abstract name: string;

  /**
   * Extract variants from the given context
   * Each strategy implements its own extraction logic
   *
   * @param context - Extraction context with DOM, HTML, JSON, and URL
   * @returns VariantExtractionResult with extracted variants and notes
   */
  abstract extract(
    context: VariantExtractionContext
  ): VariantExtractionResult;
}

