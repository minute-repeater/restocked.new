import type { CheerioAPI } from "../parser/loadDom.js";

/**
 * Represents a single variant attribute (e.g., size, color, length)
 */
export interface VariantAttribute {
  /** Attribute name (e.g., "size", "color", "length") */
  name: string;
  /** Attribute value (e.g., "32", "Black", "10ft") */
  value: string;
}

/**
 * VariantShell - Represents a product variant
 * Most fields are optional/nullable as they will be populated in future prompts
 */
export interface VariantShell {
  /** Unique identifier for the variant (if available) */
  id: string | null;
  /** Array of attributes that define this variant */
  attributes: VariantAttribute[];
  /** Whether the variant is available (null if unknown) */
  isAvailable: boolean | null;
  /** Direct URL to this variant (if available) */
  variantURL?: string | null;
  /** Price for this variant (null if not extracted yet) */
  price?: number | null;
  /** Additional metadata about the variant */
  metadata?: Record<string, any>;
}

/**
 * Context provided to variant extraction strategies
 * Contains all necessary data for variant detection
 */
export interface VariantExtractionContext {
  /** Cheerio DOM reference for querying HTML */
  $: CheerioAPI;
  /** Raw HTML string */
  html: string;
  /** Array of embedded JSON objects found in the page */
  jsonBlobs: any[];
  /** Final resolved URL after redirects */
  finalURL: string | null;
}

/**
 * Result of variant extraction from a single strategy or combined strategies
 */
export interface VariantExtractionResult {
  /** Array of extracted variants */
  variants: VariantShell[];
  /** Optional notes about the extraction process */
  notes?: string[];
}

