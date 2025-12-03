import type { Cheerio } from "cheerio";
import type { Element } from "domhandler";

/**
 * Type alias for Cheerio element (wrapper around DOM Element)
 */
type CheerioElement = Cheerio<Element>;

/**
 * Get raw text content from an element
 * Returns raw text of the element or empty string
 * Handles null/undefined gracefully
 *
 * @param el - Cheerio element instance or undefined
 * @returns Raw text content
 */
export function getText(el: CheerioElement | undefined): string {
  if (!el) {
    return "";
  }

  try {
    return el.text() || "";
  } catch (error) {
    return "";
  }
}

/**
 * Extract clean text from an element
 * Returns normalized text: trimmed, whitespace collapsed, no newlines unless meaningful
 *
 * @param el - Cheerio element instance or undefined
 * @returns Clean, normalized text
 */
export function extractCleanText(el: CheerioElement | undefined): string {
  const rawText = getText(el);
  if (!rawText) {
    return "";
  }

  // Trim and normalize whitespace
  return rawText
    .trim()
    .replace(/\r\n/g, " ") // Replace line breaks with space
    .replace(/\n/g, " ") // Replace newlines with space
    .replace(/\r/g, " ") // Replace carriage returns with space
    .replace(/\s+/g, " "); // Collapse multiple spaces to single space
}

/**
 * Normalize text string
 * Lowercases, trims, normalizes consecutive whitespace, and strips non-essential punctuation
 *
 * @param str - Input string
 * @returns Normalized string
 */
export function normalizeText(str: string): string {
  if (!str || typeof str !== "string") {
    return "";
  }

  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .replace(/\s+/g, " "); // Normalize consecutive whitespace to single space
}

/**
 * Extract price-like strings from HTML
 * Scans raw HTML for price-like tokens: $xx.xx, xx.xx, USD xx, £xx, €xx
 * Returns an array of strings (NOT parsed into numbers)
 * Uses conservative regex patterns to avoid overly greedy matches
 *
 * @param html - HTML string to scan
 * @returns Array of price-like strings found
 */
export function extractPriceLikeStrings(html: string): string[] {
  if (!html || typeof html !== "string") {
    return [];
  }

  const prices: string[] = [];
  
  // Pattern 1: Currency symbols followed by digits with optional decimal
  // Matches: $39.99, €50.00, £29.99, ¥100
  const currencySymbolPattern = /[£$€¥₹]\s*\d+\.?\d{0,2}/g;
  const currencyMatches = html.match(currencySymbolPattern);
  if (currencyMatches) {
    prices.push(...currencyMatches.map((m) => m.trim()));
  }

  // Pattern 2: Decimal numbers (conservative - requires at least one digit before and after decimal)
  // Matches: 39.99, 1.50, but not .99 or 39.
  const decimalPattern = /\d+\.\d{1,2}\b/g;
  const decimalMatches = html.match(decimalPattern);
  if (decimalMatches) {
    prices.push(...decimalMatches.map((m) => m.trim()));
  }

  // Pattern 3: Currency codes followed by digits
  // Matches: USD 39.99, EUR 50, GBP 29.99
  const currencyCodePattern = /(?:USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR)\s+\d+\.?\d{0,2}/gi;
  const codeMatches = html.match(currencyCodePattern);
  if (codeMatches) {
    prices.push(...codeMatches.map((m) => m.trim()));
  }

  // Pattern 4: Whole numbers that might be prices (conservative - 2+ digits)
  // Matches: 99, 100, 1250 (but not single digits)
  const wholeNumberPattern = /\b\d{2,}\b/g;
  const wholeMatches = html.match(wholeNumberPattern);
  if (wholeMatches) {
    // Filter out numbers that are clearly not prices (like years, IDs, etc.)
    // Keep numbers between 1 and 999999 (reasonable price range)
    const filtered = wholeMatches
      .map((m) => m.trim())
      .filter((m) => {
        const num = parseInt(m, 10);
        return num >= 1 && num <= 999999;
      });
    prices.push(...filtered);
  }

  // Remove duplicates and filter out very short matches
  const uniquePrices = Array.from(
    new Set(prices.filter((p) => p.length >= 2))
  );

  return uniquePrices;
}

/**
 * Extract stock-like strings from HTML
 * Searches HTML text (not DOM) for stock status indicators
 * Case-insensitive search
 * Returns an array of matched strings
 *
 * @param html - HTML string to scan
 * @returns Array of stock-like strings found
 */
export function extractStockLikeStrings(html: string): string[] {
  if (!html || typeof html !== "string") {
    return [];
  }

  const stockIndicators: string[] = [];

  // Pattern 1: Common stock status phrases (case-insensitive word boundaries)
  // Matches: "in stock", "out of stock", "sold out", "unavailable", "available", etc.
  const stockStatusPattern =
    /\b(?:in\s+stock|out\s+of\s+stock|sold\s+out|unavailable|available|backorder|backordered|preorder|pre-?order|discontinued|limited\s+stock|low\s+stock|only\s+\d+\s+left|out\s+of\s+stock|in\s+stock|stock\s+available)\b/gi;
  const statusMatches = html.match(stockStatusPattern);
  if (statusMatches) {
    stockIndicators.push(
      ...statusMatches.map((m) => m.trim().replace(/\s+/g, " "))
    );
  }

  // Pattern 2: Stock count patterns
  // Matches: "5 in stock", "only 2 left", "10 available", "3 remaining"
  const stockCountPattern =
    /\b(?:\d+\s+)?(?:in\s+stock|available|left|remaining|in\s+inventory)\b/gi;
  const countMatches = html.match(stockCountPattern);
  if (countMatches) {
    stockIndicators.push(
      ...countMatches.map((m) => m.trim().replace(/\s+/g, " "))
    );
  }

  // Pattern 3: Availability labels
  // Matches: "Availability: in stock", "Stock Status: available", etc.
  const availabilityLabelPattern =
    /\b(?:availability|stock\s+status|inventory\s+status|item\s+status)[:\s]+([^<\n]{1,50})/gi;
  let labelMatch;
  while ((labelMatch = availabilityLabelPattern.exec(html)) !== null) {
    if (labelMatch[1]) {
      const status = labelMatch[1].trim();
      if (status.length > 0 && status.length < 50) {
        stockIndicators.push(status);
      }
    }
  }

  // Remove duplicates and normalize
  const uniqueIndicators = Array.from(
    new Set(
      stockIndicators.map((indicator) =>
        indicator.toLowerCase().replace(/\s+/g, " ").trim()
      )
    )
  );

  return uniqueIndicators;
}
