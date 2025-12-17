import type { CheerioAPI } from "../parser/loadDom.js";

/**
 * Stock status types
 */
export type StockStatus =
  | "in_stock"
  | "out_of_stock"
  | "low_stock"
  | "backorder"
  | "preorder"
  | "unknown";

/**
 * StockShell - Represents extracted stock/availability information
 */
export interface StockShell {
  /** Stock status */
  status: StockStatus;
  /** Original raw text that triggered this status or null */
  raw: string | null;
  /** Additional metadata about the stock extraction */
  metadata?: Record<string, any>;
}

/**
 * Context provided to stock extraction strategies
 * Contains all necessary data for stock detection
 */
export interface StockExtractionContext {
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
 * Result of stock extraction from a single strategy or combined strategies
 */
export interface StockExtractionResult {
  /** Extracted stock shell or null if no stock info found */
  stock: StockShell | null;
  /** Optional notes about the extraction process */
  notes?: string[];
  /** 
   * Name of the strategy that successfully extracted stock info (added in fix #6)
   * This is a structured field to avoid parsing from free-form notes
   * Example values: 'notify-me-ui', 'json', 'dom', 'button', 'heuristic'
   */
  strategyName?: string;
}









