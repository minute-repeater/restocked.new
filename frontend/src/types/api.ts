// API Response Types

export interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  role?: string; // Optional - backend may include this
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Product {
  id: number;
  url: string;
  canonical_url: string | null;
  name: string | null;
  description: string | null;
  vendor: string | null;
  main_image_url: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface Variant {
  id: number;
  product_id: number;
  sku: string | null;
  attributes: Record<string, any>;
  currency: string | null;
  current_price: number | null;
  current_stock_status: string | null;
  is_available: boolean | null;
  last_checked_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface TrackedItem {
  id: number;
  user_id: string;
  product_id: number;
  variant_id: number | null;
  alias: string | null;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
  product: {
    id: number;
    name: string | null;
    url: string;
    main_image_url: string | null;
    created_at: string;
    updated_at: string;
  };
  variant: {
    id: number;
    current_price: number | null;
    current_stock_status: string | null;
    attributes: Record<string, any>;
  } | null;
}

export interface TrackedItemsResponse {
  items: TrackedItem[];
}

export interface ProductResponse {
  product: Product;
  variants: Variant[];
}

export interface PriceHistoryEntry {
  id: number;
  variant_id: number;
  recorded_at: string;
  price: number | null;
  currency: string | null;
  raw: string | null;
  metadata: any;
}

export interface StockHistoryEntry {
  id: number;
  variant_id: number;
  recorded_at: string;
  status: string;
  raw: string | null;
  metadata: any;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

