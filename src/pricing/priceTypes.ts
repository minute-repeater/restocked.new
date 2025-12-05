import type { CheerioAPI } from "../parser/loadDom.js";

/**
 * PriceShell - Represents extracted price information
 */
export interface PriceShell {
  /** Currency code (e.g., "USD", "EUR", "GBP") or null if unknown */
  currency: string | null;
  /** Parsed numeric price amount or null if not parseable */
  amount: number | null;
  /** Original raw price string (e.g., "$39.99", "€199") or null */
  raw: string | null;
  /** Additional metadata about the price extraction */
  metadata?: Record<string, any>;
}

/**
 * Context provided to price extraction strategies
 * Contains all necessary data for price detection
 */
export interface PriceExtractionContext {
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
 * Result of price extraction from a single strategy or combined strategies
 */
export interface PriceExtractionResult {
  /** Extracted price shell or null if no price found */
  price: PriceShell | null;
  /** Optional notes about the extraction process */
  notes?: string[];
}





