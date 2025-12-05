import type { VariantShell } from "../../variants/variantTypes.js";
import type { CreateVariantInput } from "../../db/types.js";

/**
 * Normalized variant data ready for database insertion
 */
export interface NormalizedVariant {
  attributes: Record<string, string>;
  sku: string | null;
  currency: string | null;
  current_price: number | null;
  current_stock_status: string | null;
  is_available: boolean | null;
  metadata: Record<string, any>;
}

/**
 * Normalize VariantShell for database insertion
 * - Converts attributes array to deterministic JSONB object
 * - Normalizes currency casing
 * - Maps stock status
 * - Ensures metadata is safe
 */
export function normalizeVariantShell(
  variant: VariantShell,
  priceShell: { currency: string | null; amount: number | null } | null,
  stockShell: { status: string } | null
): NormalizedVariant {
  // Convert attributes array to deterministic object (sorted keys)
  const attributes = variantAttributesToObject(variant.attributes);

  // Extract SKU from variant ID or metadata
  const sku = variant.id || variant.metadata?.sku || null;

  // Get currency from priceShell or variant metadata
  const currency = priceShell?.currency
    ? normalizeCurrency(priceShell.currency)
    : variant.metadata?.currency
    ? normalizeCurrency(variant.metadata.currency)
    : null;

  // Get price from priceShell or variant.price
  const current_price =
    priceShell?.amount ?? variant.price ?? variant.metadata?.price ?? null;

  // Map stock status
  const stockStatus = stockShell?.status || variant.metadata?.stockStatus || null;
  const current_stock_status = normalizeStockStatus(stockStatus);

  // Derive is_available from stock status or variant.isAvailable
  const is_available =
    variant.isAvailable !== null
      ? variant.isAvailable
      : current_stock_status === "in_stock"
      ? true
      : current_stock_status === "out_of_stock"
      ? false
      : null;

  // Sanitize metadata
  const safeMetadata = sanitizeMetadata({
    ...variant.metadata,
    variantURL: variant.variantURL,
    variantId: variant.id,
  });

  return {
    attributes,
    sku,
    currency,
    current_price,
    current_stock_status,
    is_available,
    metadata: safeMetadata,
  };
}

/**
 * Convert variant attributes array to a deterministic JSONB object
 * Sorts keys alphabetically for consistent matching
 */
function variantAttributesToObject(
  attributes: Array<{ name: string; value: string }>
): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const attr of attributes) {
    if (attr.name && attr.value) {
      obj[attr.name.trim()] = attr.value.trim();
    }
  }
  // Sort keys for deterministic ordering
  const sorted: Record<string, string> = {};
  const sortedKeys = Object.keys(obj).sort();
  for (const key of sortedKeys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

/**
 * Normalize currency code to uppercase
 */
function normalizeCurrency(currency: string | null): string | null {
  if (!currency) return null;
  return currency.trim().toUpperCase();
}

/**
 * Normalize stock status to valid enum value
 */
function normalizeStockStatus(status: string | null): string | null {
  if (!status) return null;

  const normalized = status.toLowerCase().trim();

  // Map common variations to standard statuses
  const statusMap: Record<string, string> = {
    "in stock": "in_stock",
    "in-stock": "in_stock",
    "available": "in_stock",
    "out of stock": "out_of_stock",
    "out-of-stock": "out_of_stock",
    "unavailable": "out_of_stock",
    "sold out": "out_of_stock",
    "low stock": "low_stock",
    "low-stock": "low_stock",
    "backorder": "backorder",
    "back order": "backorder",
    "preorder": "preorder",
    "pre-order": "preorder",
    "pre order": "preorder",
    "unknown": "unknown",
  };

  return (
    statusMap[normalized] ||
    (["in_stock", "out_of_stock", "low_stock", "backorder", "preorder", "unknown"].includes(
      normalized
    )
      ? normalized
      : "unknown")
  );
}

/**
 * Sanitize metadata to ensure it's JSON-safe
 */
function sanitizeMetadata(obj: any): Record<string, any> {
  if (obj === null || obj === undefined) {
    return {};
  }

  if (typeof obj !== "object") {
    // Primitives are safe
    return {};
  }

  if (Array.isArray(obj)) {
    return { array: obj.map((item) => sanitizeMetadata(item)) };
  }

  if (obj instanceof Date) {
    return { date: obj.toISOString() };
  }

  // Skip functions
  if (typeof obj === "function") {
    return {};
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "function") {
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      const nested = sanitizeMetadata(value);
      if (Object.keys(nested).length > 0) {
        sanitized[key] = nested;
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}





