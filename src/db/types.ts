/**
 * Database-facing types
 * These represent the structure of data as stored in PostgreSQL
 * Separate from extraction types (ProductShell, VariantShell, etc.)
 */

/**
 * Product as stored in the database
 */
export interface DBProduct {
  id: number;
  url: string;
  canonical_url: string | null;
  name: string | null;
  description: string | null;
  vendor: string | null;
  main_image_url: string | null;
  metadata: any; // JSONB
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

/**
 * Variant as stored in the database
 */
export interface DBVariant {
  id: number;
  product_id: number;
  sku: string | null;
  attributes: any; // JSONB array of VariantAttribute
  currency: string | null;
  current_price: number | null;
  current_stock_status: string | null;
  is_available: boolean | null;
  last_checked_at: string | null;
  metadata: any; // JSONB
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

/**
 * Input type for creating a product
 */
export interface CreateProductInput {
  url: string;
  canonical_url?: string | null;
  name?: string | null;
  description?: string | null;
  vendor?: string | null;
  main_image_url?: string | null;
  metadata?: any;
}

/**
 * Input type for creating a variant
 */
export interface CreateVariantInput {
  product_id: number;
  sku?: string | null;
  attributes: any; // JSONB array of VariantAttribute
  currency?: string | null;
  current_price?: number | null;
  current_stock_status?: string | null;
  is_available?: boolean | null;
  metadata?: any;
}









