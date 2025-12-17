import type { ProductShell } from "../../extractor/productTypes.js";
import type { CreateProductInput } from "../../db/types.js";

/**
 * Normalized product data ready for database insertion
 */
export interface NormalizedProduct extends CreateProductInput {
  vendor: string | null;
}

/**
 * Normalize ProductShell for database insertion
 * - Trims string fields
 * - Extracts vendor from URL domain
 * - Normalizes canonical URL
 * - Ensures metadata is safe
 */
export function normalizeProductShell(
  productShell: ProductShell
): NormalizedProduct {
  // Extract vendor from finalURL or url domain
  const urlToUse = productShell.finalURL || productShell.url;
  const vendor = extractVendorFromURL(urlToUse);

  // Normalize canonical URL (use finalURL if available, otherwise url)
  const canonicalUrl = productShell.finalURL || productShell.url;

  // Trim and normalize string fields
  const name = productShell.title?.trim() || null;
  const description = productShell.description?.trim() || null;

  // Get main image (first image if available)
  const mainImageUrl =
    productShell.images && productShell.images.length > 0
      ? productShell.images[0].trim()
      : null;

  // Ensure metadata is safe (no functions, dates, etc.)
  const safeMetadata = sanitizeMetadata({
    ...productShell.metadata,
    notes: productShell.notes,
    images: productShell.images,
    fetchedAt: productShell.fetchedAt,
  });

  return {
    url: productShell.url.trim(),
    canonical_url: canonicalUrl.trim(),
    name,
    description,
    vendor,
    main_image_url: mainImageUrl,
    metadata: safeMetadata,
  };
}

/**
 * Extract vendor/domain from URL
 * Returns lowercase domain without www prefix
 */
function extractVendorFromURL(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();
    // Remove www. prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }
    return hostname || null;
  } catch {
    return null;
  }
}

/**
 * Sanitize metadata to ensure it's JSON-safe
 * Removes functions, circular references, and other non-serializable values
 */
function sanitizeMetadata(obj: any): any {
  if (obj === null || obj === undefined) {
    return {};
  }

  if (typeof obj !== "object") {
    // Primitives are safe
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMetadata(item));
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Skip functions and other non-serializable types
  if (typeof obj === "function") {
    return undefined;
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip functions
    if (typeof value === "function") {
      continue;
    }

    // Recursively sanitize nested objects
    const sanitizedValue = sanitizeMetadata(value);
    if (sanitizedValue !== undefined) {
      sanitized[key] = sanitizedValue;
    }
  }

  return sanitized;
}









