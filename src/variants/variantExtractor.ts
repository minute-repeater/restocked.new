import type {
  VariantExtractionContext,
  VariantExtractionResult,
  VariantShell,
} from "./variantTypes.js";
import { MAX_VARIANTS } from "./variantConstants.js";
import { JsonVariantStrategy } from "./strategies/jsonStrategy.js";
import { DomVariantStrategy } from "./strategies/domStrategy.js";
import { AttributesVariantStrategy } from "./strategies/attributesStrategy.js";

/**
 * Deduplicate variants by comparing their attributes
 * Two variants are considered duplicates if they have the same attribute set
 *
 * @param variants - Array of variants to deduplicate
 * @returns Deduplicated array of variants
 */
function deduplicateVariants(variants: VariantShell[]): VariantShell[] {
  const seen = new Set<string>();
  const unique: VariantShell[] = [];

  for (const variant of variants) {
    // Create a signature from variant ID or attributes
    let signature: string;

    if (variant.id) {
      signature = `id:${variant.id}`;
    } else {
      // Create signature from sorted attributes
      const attrs = variant.attributes
        .map((attr) => `${attr.name}:${attr.value}`)
        .sort()
        .join("|");
      signature = `attrs:${attrs}`;
    }

    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(variant);
    }
  }

  return unique;
}

/**
 * Extract variants using multiple strategies
 * Runs strategies sequentially and combines their results
 *
 * Strategy execution order:
 * 1. JSON strategy (most reliable if JSON exists)
 * 2. DOM strategy (works for most HTML pages)
 * 3. Attributes strategy (heuristic fallback)
 *
 * This function contains NO business logic - it only orchestrates strategies
 *
 * @param context - Extraction context with DOM, HTML, JSON, and URL
 * @returns Combined VariantExtractionResult from all strategies
 */
export function extractVariants(
  context: VariantExtractionContext
): VariantExtractionResult {
  const allVariants: VariantShell[] = [];
  const allNotes: string[] = [];

  // Strategy execution order matters - run in priority order
  const strategies = [
    new JsonVariantStrategy(),
    new DomVariantStrategy(),
    new AttributesVariantStrategy(),
  ];

  // Run each strategy sequentially
  for (const strategy of strategies) {
    try {
      const result = strategy.extract(context);
      allVariants.push(...result.variants);
      if (result.notes) {
        allNotes.push(...result.notes);
      }
    } catch (error) {
      // If a strategy fails, log it but continue with other strategies
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      allNotes.push(
        `Strategy ${strategy.name} failed: ${errorMessage}`
      );
    }
  }

  // Deduplicate variants
  let uniqueVariants = deduplicateVariants(allVariants);

  // Cap variants if they exceed MAX_VARIANTS (after deduplication)
  const originalCount = uniqueVariants.length;
  if (originalCount > MAX_VARIANTS) {
    uniqueVariants = uniqueVariants.slice(0, MAX_VARIANTS);
    allNotes.push(
      `Variant combinations exceeded ${MAX_VARIANTS} (found ${originalCount}). Trimmed for performance.`
    );
    console.warn(
      `[Extractor] Variant explosion prevented: ${originalCount} -> ${uniqueVariants.length}`
    );
  }

  // Combine results
  return {
    variants: uniqueVariants,
    notes: allNotes.length > 0 ? allNotes : undefined,
  };
}

