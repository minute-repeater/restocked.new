import { VariantStrategy } from "./baseStrategy.js";
import { findAll, getAttr } from "../../parser/queryHelpers.js";
import { extractCleanText, normalizeText } from "../../parser/textExtraction.js";
import { MAX_VARIANTS } from "../variantConstants.js";
import type {
  VariantExtractionContext,
  VariantExtractionResult,
  VariantShell,
  VariantAttribute,
} from "../variantTypes.js";

/**
 * Allowed attribute names (case-insensitive)
 * This list is configurable and extendable
 */
const ALLOWED_ATTRIBUTE_NAMES = [
  "size",
  "color",
  "colour",
  "length",
  "material",
  "style",
  "fit",
  "waist",
  "inseam",
  "height",
  "width",
  "depth",
  "model",
  "flavor",
  "flavour",
  "variant",
  "option",
  "pattern",
  "finish",
  "type",
];

/**
 * Normalize attribute name
 * Lowercases, trims whitespace, and removes special characters
 * Uses the same normalization rules as other strategies
 *
 * @param name - Raw attribute name
 * @returns Normalized attribute name
 */
function normalizeAttributeName(name: string): string {
  if (!name || typeof name !== "string") {
    return "";
  }
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_");
}

/**
 * Check if a normalized attribute name is allowed
 *
 * @param normalizedName - Normalized attribute name
 * @returns True if attribute name is allowed
 */
function isAllowedAttributeName(normalizedName: string): boolean {
  return ALLOWED_ATTRIBUTE_NAMES.some((allowed) =>
    normalizedName.includes(allowed)
  );
}

/**
 * Extract unique values from an array, preserving order
 *
 * @param values - Array of values
 * @returns Array of unique values
 */
function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  }
  return unique;
}

/**
 * Calculate Cartesian product of arrays
 * Generates all possible combinations of values from multiple arrays
 * Includes early bailout to prevent memory explosion
 *
 * @param arrays - Array of arrays to combine
 * @returns Array of arrays representing all combinations (capped at MAX_VARIANTS)
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) {
    return [];
  }
  if (arrays.length === 1) {
    return arrays[0].map((item) => [item]);
  }

  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);

  const result: T[][] = [];
  for (const item of first) {
    for (const combination of restProduct) {
      result.push([item, ...combination]);
      // Early bailout to prevent memory explosion
      if (result.length >= MAX_VARIANTS) {
        break;
      }
    }
    // Early bailout check after inner loop
    if (result.length >= MAX_VARIANTS) {
      break;
    }
  }

  return result;
}

/**
 * Extract attribute-value pairs from text patterns
 * Looks for patterns like "Size: M", "Color: Red", etc.
 *
 * @param html - HTML string to scan
 * @returns Map of attribute names to arrays of values
 */
function extractFromTextPatterns(html: string): Map<string, string[]> {
  const attributeMap = new Map<string, string[]>();

  // Pattern: (size|color|length|material|fit|waist|inseam|...)\s*[:\-]\s*(\w+)
  const attributePattern =
    /\b(size|color|colour|length|material|style|fit|waist|inseam|height|width|depth|model|flavor|flavour|variant|option|pattern|finish|type)\s*[:\-]\s*([^\s<,;]+)/gi;

  let match;
  while ((match = attributePattern.exec(html)) !== null) {
    const rawName = match[1];
    const rawValue = match[2];

    if (!rawName || !rawValue) {
      continue;
    }

    const normalizedName = normalizeAttributeName(rawName);
    if (!normalizedName || !isAllowedAttributeName(normalizedName)) {
      continue;
    }

    const value = rawValue.trim();
    if (!value) {
      continue;
    }

    if (!attributeMap.has(normalizedName)) {
      attributeMap.set(normalizedName, []);
    }
    attributeMap.get(normalizedName)!.push(value);
  }

  // Deduplicate values for each attribute
  for (const [name, values] of attributeMap.entries()) {
    attributeMap.set(name, uniqueValues(values));
  }

  return attributeMap;
}

/**
 * Extract attribute-value pairs from definition lists (<dl>, <dt>, <dd>)
 *
 * @param $ - Cheerio root instance
 * @returns Map of attribute names to arrays of values
 */
function extractFromDefinitionLists(
  $: VariantExtractionContext["$"]
): Map<string, string[]> {
  const attributeMap = new Map<string, string[]>();
  const dlElements = findAll($, "dl");

  for (const dl of dlElements) {
    const dts = dl.find("dt");
    const dds = dl.find("dd");

    dts.each((index, dtEl) => {
      const dt = $(dtEl);
      const dd = dds.eq(index);

      const labelText = extractCleanText(dt);
      const valueText = extractCleanText(dd);

      if (!labelText || !valueText) {
        return;
      }

      const normalizedName = normalizeAttributeName(labelText);
      if (!normalizedName || !isAllowedAttributeName(normalizedName)) {
        return;
      }

      if (!attributeMap.has(normalizedName)) {
        attributeMap.set(normalizedName, []);
      }
      attributeMap.get(normalizedName)!.push(valueText);
    });
  }

  // Deduplicate values
  for (const [name, values] of attributeMap.entries()) {
    attributeMap.set(name, uniqueValues(values));
  }

  return attributeMap;
}

/**
 * Extract attribute groups from unordered/ordered lists
 * Looks for <li> items with data-attribute or aria-label attributes
 *
 * @param $ - Cheerio root instance
 * @returns Map of attribute names to arrays of values
 */
function extractFromOptionLists(
  $: VariantExtractionContext["$"]
): Map<string, string[]> {
  const attributeMap = new Map<string, string[]>();
  const listElements = findAll($, "ul, ol");

  for (const list of listElements) {
    // Check for parent heading or label
    const prevHeading = list.prev("h1, h2, h3, h4, h5, h6");
    const parentHeading = list.parent().find("> h1, > h2, > h3, > h4, > h5, > h6").first();
    const heading = prevHeading.length > 0 ? prevHeading : parentHeading;
    const headingText = heading.length > 0 ? extractCleanText(heading) : "";

    const listItems = list.find("li");
    const items: Array<{ name: string; value: string }> = [];

    listItems.each((_, liEl) => {
      const li = $(liEl);
      const dataAttr = getAttr(li, "data-attribute");
      const ariaLabel = getAttr(li, "aria-label");
      const text = extractCleanText(li);

      if (!text) {
        return;
      }

      // Try to get attribute name from data-attribute, aria-label, or heading
      let attrName = dataAttr || ariaLabel || headingText || "";
      const normalizedName = normalizeAttributeName(attrName);

      if (normalizedName && isAllowedAttributeName(normalizedName)) {
        items.push({ name: normalizedName, value: text });
      } else if (headingText) {
        // Fallback: use heading text as attribute name
        const headingNormalized = normalizeAttributeName(headingText);
        if (headingNormalized && isAllowedAttributeName(headingNormalized)) {
          items.push({ name: headingNormalized, value: text });
        }
      }
    });

    // Group items by attribute name
    for (const item of items) {
      if (!attributeMap.has(item.name)) {
        attributeMap.set(item.name, []);
      }
      attributeMap.get(item.name)!.push(item.value);
    }
  }

  // Deduplicate values
  for (const [name, values] of attributeMap.entries()) {
    attributeMap.set(name, uniqueValues(values));
  }

  return attributeMap;
}

/**
 * Extract attribute groups from buttons/spans with visible text
 * Groups elements by parent and class similarity
 *
 * @param $ - Cheerio root instance
 * @returns Map of attribute names to arrays of values
 */
function extractFromTextClusters(
  $: VariantExtractionContext["$"]
): Map<string, string[]> {
  const attributeMap = new Map<string, string[]>();

  // Look for groups of buttons/spans with similar classes
  const candidates = findAll($, "button, span, div, a");
  const clusters = new Map<string, Array<{ parent: string; text: string }>>();

  for (const candidate of candidates) {
    const text = extractCleanText(candidate);
    if (!text || text.length > 50) {
      // Skip long text (likely not a variant value)
      continue;
    }

    const className = getAttr(candidate, "class") || "";
    const parent = candidate.parent();
    const parentId = parent.attr("id") || parent.attr("class") || "";

    // Look for variant-like class names
    const variantClassPattern = /(?:option|variant|choice|size|color|swatch|attribute)/i;
    if (variantClassPattern.test(className) || variantClassPattern.test(parentId)) {
      const clusterKey = parentId || className || "default";
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push({ parent: parentId, text });
    }
  }

  // Try to infer attribute name from parent context
  for (const [clusterKey, items] of clusters.entries()) {
    if (items.length < 2) {
      // Need at least 2 items to form a group
      continue;
    }

    // Try to infer attribute name from cluster key or parent
    const inferredName = normalizeAttributeName(clusterKey);
    let attrName = "";

    if (isAllowedAttributeName(inferredName)) {
      attrName = inferredName;
    } else {
      // Try common patterns
      for (const allowed of ALLOWED_ATTRIBUTE_NAMES) {
        if (clusterKey.toLowerCase().includes(allowed)) {
          attrName = allowed;
          break;
        }
      }
    }

    if (attrName) {
      const values = items.map((item) => item.text);
      if (!attributeMap.has(attrName)) {
        attributeMap.set(attrName, []);
      }
      attributeMap.get(attrName)!.push(...values);
    }
  }

  // Deduplicate values
  for (const [name, values] of attributeMap.entries()) {
    attributeMap.set(name, uniqueValues(values));
  }

  return attributeMap;
}

/**
 * Extract attribute groups from product meta sections
 * Looks for structured attribute/value pairs in divs with classes like "attribute", "meta", etc.
 *
 * @param $ - Cheerio root instance
 * @returns Map of attribute names to arrays of values
 */
function extractFromMetaSections(
  $: VariantExtractionContext["$"]
): Map<string, string[]> {
  const attributeMap = new Map<string, string[]>();

  // Look for product-attributes, product-meta, attribute sections
  const metaSections = findAll(
    $,
    ".product-attributes, .product-meta, .attributes, [class*='attribute'], [class*='meta']"
  );

  for (const section of metaSections) {
    // Look for label/value pairs
    const labels = section.find(".label, .name, dt, strong, b");
    const values = section.find(".value, .val, dd, span, p");

    labels.each((index, labelEl) => {
      const label = $(labelEl);
      const value = values.eq(index) || label.next();

      const labelText = extractCleanText(label);
      const valueText = extractCleanText(value);

      if (!labelText || !valueText) {
        return;
      }

      const normalizedName = normalizeAttributeName(labelText);
      if (!normalizedName || !isAllowedAttributeName(normalizedName)) {
        return;
      }

      if (!attributeMap.has(normalizedName)) {
        attributeMap.set(normalizedName, []);
      }
      attributeMap.get(normalizedName)!.push(valueText);
    });
  }

  // Deduplicate values
  for (const [name, values] of attributeMap.entries()) {
    attributeMap.set(name, uniqueValues(values));
  }

  return attributeMap;
}

/**
 * Build variant combinations from attribute map
 *
 * @param attributeMap - Map of attribute names to arrays of values
 * @returns Array of VariantShell objects (capped at MAX_VARIANTS)
 */
function buildVariantCombinations(
  attributeMap: Map<string, string[]>
): VariantShell[] {
  if (attributeMap.size === 0) {
    return [];
  }

  // Convert map to arrays for Cartesian product
  const attributeNames: string[] = [];
  const attributeValueArrays: string[][] = [];

  for (const [name, values] of attributeMap.entries()) {
    if (values.length > 0) {
      attributeNames.push(name);
      attributeValueArrays.push(values);
    }
  }

  if (attributeValueArrays.length === 0) {
    return [];
  }

  // Generate all combinations
  const combinations = cartesianProduct(attributeValueArrays);

  // Build VariantShell objects
  let variants: VariantShell[] = combinations.map((combination) => {
    const attributes: VariantAttribute[] = combination.map((value, index) => ({
      name: attributeNames[index],
      value: String(value),
    }));

    return {
      id: null,
      attributes,
      isAvailable: null,
      price: null,
      variantURL: null,
      metadata: { source: "heuristic" },
    };
  });

  // Cap variants if they exceed MAX_VARIANTS
  const originalCount = variants.length;
  if (originalCount > MAX_VARIANTS) {
    variants = variants.slice(0, MAX_VARIANTS);
    console.warn(
      `[Extractor] Variant explosion prevented: ${originalCount} -> ${variants.length}`
    );
  }

  return variants;
}

/**
 * Attribute-based heuristic variant extraction strategy
 * Extracts variants from ambiguous, non-standard, or poorly structured HTML
 * This is a fallback strategy that fills in gaps when DOM and JSON strategies fail
 */
export class AttributesVariantStrategy extends VariantStrategy {
  name = "attributes-variant-strategy";

  extract(context: VariantExtractionContext): VariantExtractionResult {
    const notes: string[] = [];
    const attributeMap = new Map<string, string[]>();

    // Step 1: Scan DOM for heuristic attribute/value pairs from multiple sources

    // A. Extract from text patterns
    const textPatterns = extractFromTextPatterns(context.html);
    if (textPatterns.size > 0) {
      notes.push(`Found ${textPatterns.size} attribute(s) from text patterns`);
      for (const [name, values] of textPatterns.entries()) {
        if (!attributeMap.has(name)) {
          attributeMap.set(name, []);
        }
        attributeMap.get(name)!.push(...values);
      }
    }

    // B. Extract from definition lists
    const definitionLists = extractFromDefinitionLists(context.$);
    if (definitionLists.size > 0) {
      notes.push(`Found ${definitionLists.size} attribute(s) from definition lists`);
      for (const [name, values] of definitionLists.entries()) {
        if (!attributeMap.has(name)) {
          attributeMap.set(name, []);
        }
        attributeMap.get(name)!.push(...values);
      }
    }

    // C. Extract from option lists
    const optionLists = extractFromOptionLists(context.$);
    if (optionLists.size > 0) {
      notes.push(`Found ${optionLists.size} attribute(s) from option lists`);
      for (const [name, values] of optionLists.entries()) {
        if (!attributeMap.has(name)) {
          attributeMap.set(name, []);
        }
        attributeMap.get(name)!.push(...values);
      }
    }

    // D. Extract from text clusters
    const textClusters = extractFromTextClusters(context.$);
    if (textClusters.size > 0) {
      notes.push(`Found ${textClusters.size} attribute(s) from text clusters`);
      for (const [name, values] of textClusters.entries()) {
        if (!attributeMap.has(name)) {
          attributeMap.set(name, []);
        }
        attributeMap.get(name)!.push(...values);
      }
    }

    // E. Extract from meta sections
    const metaSections = extractFromMetaSections(context.$);
    if (metaSections.size > 0) {
      notes.push(`Found ${metaSections.size} attribute(s) from meta sections`);
      for (const [name, values] of metaSections.entries()) {
        if (!attributeMap.has(name)) {
          attributeMap.set(name, []);
        }
        attributeMap.get(name)!.push(...values);
      }
    }

    // Deduplicate values for each attribute
    for (const [name, values] of attributeMap.entries()) {
      attributeMap.set(name, uniqueValues(values));
    }

    // Step 2: If no groups found, return empty
    if (attributeMap.size === 0) {
      return {
        variants: [],
        notes: ["No heuristic attributes detected"],
      };
    }

    // Step 3: Build variant combinations
    const variants = buildVariantCombinations(attributeMap);
    const originalCount = variants.length;

    // Step 4: Cap variants if they exceed MAX_VARIANTS
    let finalVariants = variants;
    if (originalCount > MAX_VARIANTS) {
      finalVariants = variants.slice(0, MAX_VARIANTS);
      notes.push(
        `Variant combinations exceeded ${MAX_VARIANTS} (found ${originalCount}). Trimmed for performance.`
      );
    }

    // Step 5: Add summary notes
    notes.push(`Detected ${attributeMap.size} attribute group(s)`);
    const totalValues = Array.from(attributeMap.values()).reduce(
      (sum, values) => sum + values.length,
      0
    );
    notes.push(`Found ${totalValues} total attribute values`);
    if (finalVariants.length > 0) {
      notes.push(`Built ${finalVariants.length} variant combination(s) from heuristics`);
    }

    return {
      variants: finalVariants,
      notes: notes.length > 0 ? notes : undefined,
    };
  }
}
