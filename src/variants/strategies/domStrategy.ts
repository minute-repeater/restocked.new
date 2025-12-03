import { VariantStrategy } from "./baseStrategy.js";
import { findAll, getAttr } from "../../parser/queryHelpers.js";
import { extractCleanText } from "../../parser/textExtraction.js";
import { loadDom, type CheerioAPI } from "../../parser/loadDom.js";
import { MAX_VARIANTS } from "../variantConstants.js";
import type {
  VariantExtractionContext,
  VariantExtractionResult,
  VariantShell,
  VariantAttribute,
} from "../variantTypes.js";

/**
 * Normalize attribute name
 * Lowercases, trims whitespace, and removes special characters
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
 * Extract variant attributes from select dropdowns
 *
 * @param $ - Cheerio root instance
 * @returns Map of attribute names to arrays of values
 */
function extractFromSelects($: CheerioAPI): Map<string, string[]> {
  const attributeMap = new Map<string, string[]>();
  const selects = findAll($, "select");

  for (const select of selects) {
    const name = getAttr(select, "name") || getAttr(select, "id") || "";
    if (!name) {
      continue;
    }

    const normalizedName = normalizeAttributeName(name);
    if (!normalizedName) {
      continue;
    }

    const values: string[] = [];
    const options = select.find("option");

    options.each((_, optionEl) => {
      const option = $(optionEl);
      const value = getAttr(option, "value");
      const text = extractCleanText(option);

      // Prefer value attribute, fallback to text content
      const optionValue = value && value.trim() ? value.trim() : text;
      if (optionValue && optionValue.toLowerCase() !== "select" && optionValue.toLowerCase() !== "choose") {
        values.push(optionValue);
      }
    });

    if (values.length > 0) {
      const unique = uniqueValues(values);
      if (unique.length > 0) {
        attributeMap.set(normalizedName, unique);
      }
    }
  }

  return attributeMap;
}

/**
 * Extract variant attributes from radio button groups
 *
 * @param $ - Cheerio root instance
 * @returns Map of attribute names to arrays of values
 */
function extractFromRadios($: CheerioAPI): Map<string, string[]> {
  const attributeMap = new Map<string, string[]>();
  const radios = findAll($, 'input[type="radio"]');

  // Group radios by name attribute
  const radioGroups = new Map<string, string[]>();

  for (const radio of radios) {
    const name = getAttr(radio, "name");
    if (!name) {
      continue;
    }

    const normalizedName = normalizeAttributeName(name);
    if (!normalizedName) {
      continue;
    }

    const value = getAttr(radio, "value");
    const id = getAttr(radio, "id");

    // Try to get label text if available
    let labelText = "";
    if (id) {
      const label = $(`label[for="${id}"]`);
      if (label.length > 0) {
        labelText = extractCleanText(label);
      }
    }

    // Prefer value attribute, fallback to label text
    const radioValue = value && value.trim() ? value.trim() : labelText;
    if (!radioValue) {
      continue;
    }

    if (!radioGroups.has(normalizedName)) {
      radioGroups.set(normalizedName, []);
    }
    radioGroups.get(normalizedName)!.push(radioValue);
  }

  // Deduplicate values for each group
  for (const [name, values] of radioGroups.entries()) {
    const unique = uniqueValues(values);
    if (unique.length > 0) {
      attributeMap.set(name, unique);
    }
  }

  return attributeMap;
}

/**
 * Extract variant attributes from buttons and swatches with data attributes
 *
 * @param $ - Cheerio root instance
 * @returns Map of attribute names to arrays of values
 */
function extractFromButtonsAndSwatches($: CheerioAPI): Map<string, string[]> {
  const attributeMap = new Map<string, string[]>();
  
  // Find buttons and divs that might be variant selectors
  const candidates = findAll($, "button, div[class*='swatch'], div[class*='option'], div[class*='variant']");

  for (const candidate of candidates) {
    // Look for data-* attributes that might contain variant info
    const attrs = candidate.attr();
    if (!attrs) {
      continue;
    }

    // Check all data attributes
    for (const [attrName, attrValue] of Object.entries(attrs)) {
      if (!attrName.startsWith("data-")) {
        continue;
      }

      // Extract attribute name from data-* (e.g., data-size -> size)
      const variantAttrName = attrName.replace(/^data-/, "");
      if (!variantAttrName || !attrValue) {
        continue;
      }

      const normalizedName = normalizeAttributeName(variantAttrName);
      if (!normalizedName) {
        continue;
      }

      const value = String(attrValue).trim();
      if (!value) {
        continue;
      }

      // Also check text content as fallback
      const textContent = extractCleanText(candidate);
      const finalValue = value || textContent;

      if (!attributeMap.has(normalizedName)) {
        attributeMap.set(normalizedName, []);
      }
      attributeMap.get(normalizedName)!.push(finalValue);
    }

    // Also check for common variant patterns in class names
    const className = getAttr(candidate, "class") || "";
    const classMatch = className.match(/(?:size|color|length|fit|material)[-_]?(\w+)/i);
    if (classMatch) {
      const variantType = normalizeAttributeName(classMatch[1] || classMatch[0]);
      const textValue = extractCleanText(candidate);
      if (variantType && textValue) {
        if (!attributeMap.has(variantType)) {
          attributeMap.set(variantType, []);
        }
        attributeMap.get(variantType)!.push(textValue);
      }
    }
  }

  // Deduplicate values for each attribute
  for (const [name, values] of attributeMap.entries()) {
    const unique = uniqueValues(values);
    attributeMap.set(name, unique);
  }

  return attributeMap;
}

/**
 * Build variant combinations from attribute groups
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
      metadata: {},
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
 * DOM-based variant extraction strategy
 * Extracts variants from DOM structures: select dropdowns, radio buttons, buttons, swatches
 */
export class DomVariantStrategy extends VariantStrategy {
  name = "dom-variant-strategy";

  extract(context: VariantExtractionContext): VariantExtractionResult {
    const notes: string[] = [];
    const attributeMap = new Map<string, string[]>();

    // Step 1: Extract from select dropdowns
    const selectAttributes = extractFromSelects(context.$);
    if (selectAttributes.size > 0) {
      notes.push(`Found ${selectAttributes.size} variant dropdown(s)`);
      for (const [name, values] of selectAttributes.entries()) {
        attributeMap.set(name, values);
      }
    }

    // Step 2: Extract from radio button groups
    const radioAttributes = extractFromRadios(context.$);
    if (radioAttributes.size > 0) {
      notes.push(`Found ${radioAttributes.size} radio button group(s)`);
      for (const [name, values] of radioAttributes.entries()) {
        // Merge with existing attributes if name matches
        if (attributeMap.has(name)) {
          const existing = attributeMap.get(name)!;
          const merged = uniqueValues([...existing, ...values]);
          attributeMap.set(name, merged);
        } else {
          attributeMap.set(name, values);
        }
      }
    }

    // Step 3: Extract from buttons and swatches
    const buttonAttributes = extractFromButtonsAndSwatches(context.$);
    if (buttonAttributes.size > 0) {
      notes.push(`Found ${buttonAttributes.size} button/swatch group(s)`);
      for (const [name, values] of buttonAttributes.entries()) {
        // Merge with existing attributes if name matches
        if (attributeMap.has(name)) {
          const existing = attributeMap.get(name)!;
          const merged = uniqueValues([...existing, ...values]);
          attributeMap.set(name, merged);
        } else {
          attributeMap.set(name, values);
        }
      }
    }

    // Step 4: Build variant combinations
    const variants = buildVariantCombinations(attributeMap);
    const originalCount = variants.length;

    // Step 5: Cap variants if they exceed MAX_VARIANTS
    let finalVariants = variants;
    if (originalCount > MAX_VARIANTS) {
      finalVariants = variants.slice(0, MAX_VARIANTS);
      notes.push(
        `Variant combinations exceeded ${MAX_VARIANTS} (found ${originalCount}). Trimmed for performance.`
      );
    }

    // Step 6: Add summary notes
    if (attributeMap.size > 0) {
      notes.push(`Detected ${attributeMap.size} attribute(s)`);
      const totalValues = Array.from(attributeMap.values()).reduce(
        (sum, values) => sum + values.length,
        0
      );
      notes.push(`Found ${totalValues} total attribute values`);
    }

    if (finalVariants.length > 0) {
      notes.push(`Built ${finalVariants.length} variant combination(s) from DOM`);
    } else if (attributeMap.size === 0) {
      notes.push("No variant structures found in DOM");
    }

    return {
      variants: finalVariants,
      notes: notes.length > 0 ? notes : undefined,
    };
  }
}
