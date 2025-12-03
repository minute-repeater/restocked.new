import { VariantStrategy } from "./baseStrategy.js";
import type {
  VariantExtractionContext,
  VariantExtractionResult,
  VariantShell,
  VariantAttribute,
} from "../variantTypes.js";

/**
 * Common keys that indicate variant arrays or variant-like structures
 */
const VARIANT_KEYS = [
  "variants",
  "variant",
  "choices",
  "options",
  "attributes",
  "attribute_values",
  "product_options",
  "product_variants",
  "offers", // JSON-LD
  "itemOffered", // JSON-LD
];

/**
 * Keys that should be excluded from attributes (they're metadata, not attributes)
 */
const EXCLUDED_ATTRIBUTE_KEYS = [
  "id",
  "sku",
  "price",
  "availability",
  "available",
  "in_stock",
  "stock",
  "quantity",
  "url",
  "link",
  "image",
  "images",
  "title",
  "name",
  "description",
  "metadata",
  "meta",
  "@type",
  "@context",
  "product_id",
  "variant_id",
  "productId",
  "variantId",
];

/**
 * Common attribute name patterns (case-insensitive)
 */
const ATTRIBUTE_PATTERNS = [
  "size",
  "color",
  "colour",
  "length",
  "style",
  "material",
  "waist",
  "inseam",
  "width",
  "height",
  "fit",
  "flavor",
  "flavour",
  "pattern",
  "finish",
  "type",
  "variant_name",
  "option",
  "attribute",
];

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
 * Check if a key looks like an attribute name
 *
 * @param key - Key to check
 * @returns True if key matches attribute patterns
 */
function isAttributeKey(key: string): boolean {
  const normalized = normalizeAttributeName(key);
  return ATTRIBUTE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Check if a key should be excluded from attributes
 *
 * @param key - Key to check
 * @returns True if key should be excluded
 */
function isExcludedKey(key: string): boolean {
  const normalized = normalizeAttributeName(key);
  return EXCLUDED_ATTRIBUTE_KEYS.some((excluded) => normalized === excluded);
}

/**
 * Extract variant ID from an object
 * Tries multiple common ID fields
 *
 * @param obj - Variant-like object
 * @returns ID string or null
 */
function extractVariantId(obj: any): string | null {
  if (!obj || typeof obj !== "object") {
    return null;
  }

  // Try common ID fields
  const idFields = ["id", "sku", "variant_id", "variantId", "product_id", "productId"];
  for (const field of idFields) {
    if (obj[field] !== undefined && obj[field] !== null) {
      return String(obj[field]);
    }
  }

  return null;
}

/**
 * Extract attributes from a variant-like object
 * Applies rules to identify attribute-like key-value pairs
 *
 * @param obj - Variant-like object
 * @returns Array of VariantAttribute objects
 */
function extractAttributesFromVariant(obj: any): VariantAttribute[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return [];
  }

  const attributes: VariantAttribute[] = [];

  for (const [key, value] of Object.entries(obj)) {
    // Skip excluded keys
    if (isExcludedKey(key)) {
      continue;
    }

    // Check if key looks like an attribute
    if (!isAttributeKey(key)) {
      continue;
    }

    // Value must be string or number
    if (typeof value !== "string" && typeof value !== "number") {
      continue;
    }

    // Skip empty values
    const stringValue = String(value).trim();
    if (!stringValue) {
      continue;
    }

    const normalizedName = normalizeAttributeName(key);
    if (normalizedName) {
      attributes.push({
        name: normalizedName,
        value: stringValue,
      });
    }
  }

  return attributes;
}

/**
 * Check if an object looks like a variant
 * A variant-like object has:
 * - At least 2 attribute-like fields, OR
 * - Contains common variant ID fields
 *
 * @param obj - Object to check
 * @returns True if object looks like a variant
 */
function isVariantLikeObject(obj: any): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return false;
  }

  // Check for variant ID fields
  if (extractVariantId(obj) !== null) {
    return true;
  }

  // Count attribute-like fields
  let attributeCount = 0;
  for (const key of Object.keys(obj)) {
    if (!isExcludedKey(key) && isAttributeKey(key)) {
      const value = obj[key];
      if (
        (typeof value === "string" || typeof value === "number") &&
        String(value).trim()
      ) {
        attributeCount++;
      }
    }
  }

  return attributeCount >= 2;
}

/**
 * Recursively traverse JSON structure to find variant-like objects
 * Collects arrays and objects that match variant patterns
 *
 * @param obj - Object to traverse
 * @param depth - Current depth (prevents infinite recursion)
 * @param maxDepth - Maximum depth to traverse
 * @returns Array of variant-like objects found
 */
function flattenAndCollect(
  obj: any,
  depth: number = 0,
  maxDepth: number = 10
): any[] {
  const results: any[] = [];

  if (depth > maxDepth) {
    return results;
  }

  if (!obj || typeof obj !== "object") {
    return results;
  }

  // If it's an array, check each element
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (isVariantLikeObject(item)) {
        results.push(item);
      } else {
        // Recursively search nested structures
        results.push(...flattenAndCollect(item, depth + 1, maxDepth));
      }
    }
    return results;
  }

  // Check if current object is variant-like
  if (isVariantLikeObject(obj)) {
    results.push(obj);
  }

  // Check for variant keys
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = normalizeAttributeName(key);
    
    // If key matches variant patterns, explore it
    if (VARIANT_KEYS.some((vk) => normalizedKey.includes(vk))) {
      if (Array.isArray(value)) {
        // Check array elements
        for (const item of value) {
          if (isVariantLikeObject(item)) {
            results.push(item);
          } else {
            results.push(...flattenAndCollect(item, depth + 1, maxDepth));
          }
        }
      } else if (value && typeof value === "object") {
        // Recursively search nested object
        results.push(...flattenAndCollect(value, depth + 1, maxDepth));
      }
    } else {
      // Continue recursive search
      results.push(...flattenAndCollect(value, depth + 1, maxDepth));
    }
  }

  return results;
}

/**
 * Deduplicate variants by comparing their attributes
 * Two variants are considered duplicates if they have the same attribute set
 *
 * @param variants - Array of variants to deduplicate
 * @returns Deduplicated array of variants
 */
function deduplicateVariants(variants: VariantShell[]): VariantShell[] {
  const seen = new Set<string>();
  const unique: VariantShell[] = [];

  for (const variant of variants) {
    // Create signature from variant ID or attributes
    let signature: string;

    if (variant.id) {
      signature = `id:${variant.id}`;
    } else {
      // Create signature from sorted attributes
      const attrs = variant.attributes
        .map((attr) => `${attr.name}:${attr.value}`)
        .sort()
        .join("|");
      signature = `attrs:${attrs}`;
    }

    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(variant);
    }
  }

  return unique;
}

/**
 * JSON-based variant extraction strategy
 * Extracts variants from embedded JSON structures using generic pattern matching
 */
export class JsonVariantStrategy extends VariantStrategy {
  name = "json-variant-strategy";

  extract(context: VariantExtractionContext): VariantExtractionResult {
    const notes: string[] = [];
    const allVariants: VariantShell[] = [];

    if (!context.jsonBlobs || context.jsonBlobs.length === 0) {
      return {
        variants: [],
        notes: ["No JSON blobs found in context"],
      };
    }

    notes.push(`Found ${context.jsonBlobs.length} JSON source(s)`);

    // Process each JSON blob
    for (let i = 0; i < context.jsonBlobs.length; i++) {
      const blob = context.jsonBlobs[i];
      if (!blob || typeof blob !== "object") {
        continue;
      }

      try {
        // Recursively find variant-like objects
        const variantObjects = flattenAndCollect(blob);

        if (variantObjects.length > 0) {
          notes.push(
            `Detected ${variantObjects.length} variant-like object(s) in JSON source ${i + 1}`
          );

          // Convert variant objects to VariantShell
          for (const variantObj of variantObjects) {
            const id = extractVariantId(variantObj);
            const attributes = extractAttributesFromVariant(variantObj);

            // Only include if we have at least one attribute
            if (attributes.length > 0) {
              allVariants.push({
                id,
                attributes,
                isAvailable: null,
                price: null,
                variantURL: null,
                metadata: {
                  source: `json_blob_${i + 1}`,
                  original: variantObj,
                },
              });
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        notes.push(`Error processing JSON source ${i + 1}: ${errorMessage}`);
      }
    }

    // Deduplicate variants
    const uniqueVariants = deduplicateVariants(allVariants);

    // Add summary notes
    if (uniqueVariants.length > 0) {
      notes.push(`Extracted ${uniqueVariants.length} unique variant(s) from JSON`);
      const totalAttributes = uniqueVariants.reduce(
        (sum, v) => sum + v.attributes.length,
        0
      );
      notes.push(`Total attributes extracted: ${totalAttributes}`);
    } else {
      notes.push("No variants extracted from JSON sources");
    }

    return {
      variants: uniqueVariants,
      notes: notes.length > 0 ? notes : undefined,
    };
  }
}
