import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

// Export CheerioAPI type for use in other modules
export type { CheerioAPI };

/**
 * Options for loading DOM
 */
export interface LoadDomOptions {
  /**
   * Strip script and style tags from HTML
   * @default false
   */
  stripScriptsAndStyles?: boolean;
}

/**
 * Loads HTML into Cheerio and returns the root API
 * Handles malformed HTML gracefully and normalizes whitespace
 *
 * @param html - Raw HTML string to parse
 * @param options - Configuration options
 * @returns CheerioAPI instance
 */
export function loadDom(
  html: string,
  options: LoadDomOptions = {}
): CheerioAPI {
  const { stripScriptsAndStyles = false } = options;

  if (!html || typeof html !== "string") {
    // Return empty Cheerio instance for invalid input
    return cheerio.load("");
  }

  try {
    // HTML size limit: 10MB to prevent OOM
    const MAX_HTML_SIZE = 10 * 1024 * 1024;
    if (html.length > MAX_HTML_SIZE) {
      console.warn(`[LoadDOM] HTML too large: ${(html.length / 1024 / 1024).toFixed(2)} MB, truncating`);
      html = html.substring(0, MAX_HTML_SIZE);
    }

    // Normalize whitespace before parsing
    let normalizedHtml = html
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n");

    // Optionally strip script and style tags (reduces memory significantly)
    if (stripScriptsAndStyles) {
      normalizedHtml = normalizedHtml
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "");
    }

    // Load with Cheerio - it handles malformed HTML gracefully
    const $ = cheerio.load(normalizedHtml);

    return $;
  } catch (error) {
    // If parsing fails completely, return empty Cheerio instance
    // This allows calling code to check for empty DOM rather than crashing
    console.error("[LoadDOM] Error parsing HTML:", error instanceof Error ? error.message : "Unknown error");
    return cheerio.load("");
  }
}

