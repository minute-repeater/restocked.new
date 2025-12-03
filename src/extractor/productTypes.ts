import type { PriceShell } from "../pricing/priceTypes.js";
import type { StockShell } from "../stock/stockTypes.js";
import type { VariantShell } from "../variants/variantTypes.js";

// Re-export these types so they can be imported from extractor/index.ts
export type { PriceShell, StockShell, VariantShell };

// VariantShell is now imported from variants module - see re-export above

/**
 * ProductShell - High-level product data structure
 * Contains basic extracted fields and empty shells for variants, pricing, and stock
 * These shells will be populated in future prompts
 */
export interface ProductShell {
  /** Original URL that was fetched */
  url: string;
  /** Final URL after redirects */
  finalURL: string | null;
  /** ISO timestamp when the page was fetched */
  fetchedAt: string;
  /** Product title extracted from page */
  title: string | null;
  /** Product description extracted from page */
  description: string | null;
  /** Array of product image URLs */
  images: string[];
  /** Raw HTML from HTTP fetch (if available) */
  rawHTML: string;
  /** Rendered HTML from Playwright (if available) */
  renderedHTML?: string | null;
  /** Optional notes about extraction process */
  notes?: string[];
  /** Empty shell for variants - to be populated later */
  variants: VariantShell[];
  /** Empty shell for pricing - to be populated later */
  pricing: PriceShell | null;
  /** Empty shell for stock - to be populated later */
  stock: StockShell | null;
  /** Metadata about the page and extraction process */
  metadata: {
    /** Whether the page is likely dynamically rendered */
    isLikelyDynamic: boolean;
    /** Indicators that suggest dynamic content */
    dynamicIndicators: string[];
    /** Count of embedded JSON blobs found */
    jsonBlobsCount: number;
  };
}

