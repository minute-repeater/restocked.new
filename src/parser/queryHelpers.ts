import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element, AnyNode } from "domhandler";

/**
 * Type guard to check if a node is an Element
 */
function isElement(node: AnyNode | undefined | null): node is Element {
  return node !== null && node !== undefined && node.type === "tag";
}

/**
 * Safely query for the first element matching a selector
 * Returns null if not found
 *
 * @param $ - Cheerio root instance
 * @param selector - CSS selector string
 * @returns First matching element or null
 */
export function safeQuery(
  $: CheerioAPI,
  selector: string
): Cheerio<Element> | null {
  if (!selector || typeof selector !== "string") {
    return null;
  }

  try {
    const result = $(selector);
    if (result.length > 0) {
      // Filter to ensure we only return Element nodes
      const firstNode = result.get(0);
      if (firstNode && isElement(firstNode)) {
        return $(firstNode) as Cheerio<Element>;
      }
    }
    return null;
  } catch (error) {
    // Invalid selector or other error
    return null;
  }
}

/**
 * Find all elements matching a selector
 * Returns empty array if none found
 *
 * @param $ - Cheerio root instance
 * @param selector - CSS selector string
 * @returns Array of matching elements
 */
export function findAll($: CheerioAPI, selector: string): Cheerio<Element>[] {
  if (!selector || typeof selector !== "string") {
    return [];
  }

  try {
    const results = $(selector);
    const elements: Cheerio<Element>[] = [];
    results.each((_, el) => {
      if (isElement(el)) {
        elements.push($(el) as Cheerio<Element>);
      }
    });
    return elements;
  } catch (error) {
    return [];
  }
}

/**
 * Safely get an attribute value from an element
 * Returns null if attribute doesn't exist or element is invalid
 *
 * @param el - Cheerio element instance
 * @param name - Attribute name
 * @returns Attribute value or null
 */
export function getAttr(el: Cheerio<Element> | null, name: string): string | null {
  if (!el || !name || typeof name !== "string") {
    return null;
  }

  try {
    const value = el.attr(name);
    return value !== undefined ? value : null;
  } catch (error) {
    return null;
  }
}

/**
 * Get inner HTML of an element safely
 * Returns empty string if element is invalid
 *
 * @param el - Cheerio element instance
 * @returns Inner HTML string
 */
export function getHTML(el: Cheerio<Element> | null): string {
  if (!el) {
    return "";
  }

  try {
    return el.html() || "";
  } catch (error) {
    return "";
  }
}

/**
 * Check if an element exists matching the selector
 *
 * @param $ - Cheerio root instance
 * @param selector - CSS selector string
 * @returns True if at least one element exists
 */
export function exists($: CheerioAPI, selector: string): boolean {
  if (!selector || typeof selector !== "string") {
    return false;
  }

  try {
    return $(selector).length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Count elements matching a selector
 *
 * @param $ - Cheerio root instance
 * @param selector - CSS selector string
 * @returns Number of matching elements
 */
export function count($: CheerioAPI, selector: string): number {
  if (!selector || typeof selector !== "string") {
    return 0;
  }

  try {
    return $(selector).length;
  } catch (error) {
    return 0;
  }
}

