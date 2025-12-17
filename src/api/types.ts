import type { DBProduct, DBVariant } from "../db/types.js";

/**
 * API response types for consistent JSON responses
 */

/**
 * Product response with variants
 */
export interface ProductResponse {
  product: DBProduct;
  variants: DBVariant[];
  notes?: string[];
}

/**
 * Variant response with full history
 */
export interface VariantResponse {
  variant: DBVariant;
  priceHistory: Array<{
    id: number;
    variant_id: number;
    recorded_at: string;
    price: number | null;
    currency: string | null;
    raw: string | null;
    metadata: any;
  }>;
  stockHistory: Array<{
    id: number;
    variant_id: number;
    recorded_at: string;
    status: string;
    raw: string | null;
    metadata: any;
  }>;
}

/**
 * Check run response
 */
export interface CheckRunResponse {
  checkRun: {
    id: number;
    product_id: number;
    started_at: string;
    finished_at: string | null;
    status: string;
    error_message: string | null;
    metadata: any;
  };
  product: DBProduct;
  variants: DBVariant[];
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
}









