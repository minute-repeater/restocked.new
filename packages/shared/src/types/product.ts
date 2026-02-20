export interface Product {
  id: string;
  url: string;
  normalizedUrl: string;
  name: string | null;
  imageUrl: string | null;
  retailer: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Variant {
  id: string;
  productId: string;
  name: string; // e.g., "Size: Large", "Color: Blue"
  sku: string | null;
  createdAt: Date;
}

export interface StockCheck {
  id: string;
  productId: string;
  variantId: string | null;
  inStock: boolean;
  price: number | null; // stored as cents
  currency: string | null;
  checkedAt: Date;
}

// Extraction results from scraper
export interface ExtractedProductData {
  name: string | null;
  imageUrl: string | null;
  price: number | null; // cents
  currency: string | null;
  inStock: boolean | null;
  variants: ExtractedVariant[];
  retailer: string | null;
  confidence: number; // 0-1, how confident we are in the extraction
}

export interface ExtractedVariant {
  name: string;
  sku: string | null;
  inStock: boolean | null;
  price: number | null;
}
