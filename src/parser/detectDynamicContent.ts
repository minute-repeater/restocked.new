import { loadDom } from "./loadDom.js";
import { getText, extractCleanText } from "./textExtraction.js";
import { extractEmbeddedJson } from "./jsonExtraction.js";

/**
 * Result of dynamic content detection
 */
export interface DynamicContentResult {
  /**
   * Whether the content is likely dynamically rendered
   */
  isLikelyDynamic: boolean;
  /**
   * Array of indicators that suggest dynamic content
   */
  indicators: string[];
}

/**
 * Detect if HTML content is likely dynamically rendered by JavaScript
 * Uses heuristics to identify JS-dependent pages
 *
 * @param html - HTML string to analyze
 * @returns Detection result with indicators
 */
export function detectDynamicContent(html: string): DynamicContentResult {
  const indicators: string[] = [];

  if (!html || typeof html !== "string") {
    return {
      isLikelyDynamic: false,
      indicators: [],
    };
  }

  const $ = loadDom(html);
  const body = $("body");

  // Heuristic 1: Extremely small HTML body
  const bodyHTML = body.html() || "";
  if (bodyHTML.length < 500) {
    indicators.push("Very small body content (< 500 chars)");
  }

  // Heuristic 2: Body with mostly script tags
  const scriptTags = body.find("script").length;
  const totalElements = body.children().length;
  if (totalElements > 0 && scriptTags / totalElements > 0.5) {
    indicators.push("Body contains mostly script tags");
  }

  // Heuristic 3: Presence of hydration markers
  const hydrationMarkers = [
    "__NEXT_DATA__",
    "data-reactroot",
    "data-react-helmet",
    "__REACT_QUERY_STATE__",
    "__APOLLO_STATE__",
    "data-reactid",
    "ng-app",
    "ng-controller",
    "x-data", // Alpine.js
    "v-if", // Vue.js
  ];

  for (const marker of hydrationMarkers) {
    if (html.includes(marker)) {
      indicators.push(`Found hydration marker: ${marker}`);
      break; // Only add once
    }
  }

  // Heuristic 4: Large JS bundles (many script tags with src)
  const scriptTagsWithSrc = body.find('script[src]').length;
  if (scriptTagsWithSrc > 10) {
    indicators.push(`Many external script tags (${scriptTagsWithSrc})`);
  }

  // Heuristic 5: Absence of meaningful text content
  const bodyText = extractCleanText(body);
  const textLength = bodyText.length;
  if (textLength < 200) {
    indicators.push(`Very little text content (${textLength} chars)`);
  }

  // Heuristic 6: Document clearly relying on JS rendering
  // Check for common patterns like empty divs with IDs that suggest JS will populate them
  const emptyDivsWithIds = body.find('div[id]:empty').length;
  if (emptyDivsWithIds > 5) {
    indicators.push(`Many empty divs with IDs (${emptyDivsWithIds})`);
  }

  // Heuristic 7: Check for common SPA frameworks
  const spaFrameworks = [
    "react",
    "vue",
    "angular",
    "svelte",
    "next.js",
    "nuxt",
    "gatsby",
  ];
  const htmlLower = html.toLowerCase();
  for (const framework of spaFrameworks) {
    if (htmlLower.includes(framework)) {
      indicators.push(`Detected SPA framework: ${framework}`);
      break;
    }
  }

  // Heuristic 8: Check for JSON data that suggests client-side rendering
  const embeddedJson = extractEmbeddedJson(html);
  if (embeddedJson.length > 0) {
    // Check if JSON contains common client-side state patterns
    const jsonString = JSON.stringify(embeddedJson);
    if (
      jsonString.includes("props") ||
      jsonString.includes("state") ||
      jsonString.includes("initialState")
    ) {
      indicators.push("Found client-side state in embedded JSON");
    }
  }

  // Heuristic 9: Check for noscript tag with important content
  // If noscript has substantial content, it suggests the page needs JS
  const noscript = body.find("noscript");
  if (noscript.length > 0) {
    const noscriptText = extractCleanText(noscript);
    if (noscriptText.length > 100) {
      indicators.push("Substantial content in noscript tag");
    }
  }

  // Determine if likely dynamic based on indicators
  // If we have 2+ strong indicators, consider it dynamic
  const isLikelyDynamic = indicators.length >= 2;

  return {
    isLikelyDynamic,
    indicators,
  };
}

