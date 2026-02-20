import type { Product, Variant, StockCheck } from './product.js';

export interface TrackedItem {
  id: string;
  userId: string;
  productId: string;
  variantId: string | null; // null = tracking base product, not specific variant
  targetPrice: number | null; // cents - notify if price drops to/below this
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Joined data for API responses
export interface TrackedItemWithDetails {
  id: string;
  userId: string;
  targetPrice: number | null;
  isActive: boolean;
  createdAt: Date;
  product: {
    id: string;
    url: string;
    name: string | null;
    imageUrl: string | null;
    retailer: string | null;
  };
  variant: {
    id: string;
    name: string;
  } | null;
  latestCheck: {
    inStock: boolean;
    price: number | null;
    checkedAt: Date;
  } | null;
}

// Detail panel types
export interface StockCheckRecord {
  inStock: boolean;
  price: number | null;
  currency: string | null;
  checkedAt: Date;
}

export interface NotificationRecord {
  id: string;
  type: 'back_in_stock' | 'price_drop' | 'price_target_hit';
  status: 'pending' | 'sent' | 'failed';
  sentAt: Date | null;
  createdAt: Date;
}

export interface VariantInfo {
  id: string;
  name: string;
  sku: string | null;
}

export interface ItemDetailResponse {
  item: TrackedItemWithDetails;
  variants: VariantInfo[];
  stockHistory: StockCheckRecord[];
  notifications: NotificationRecord[];
}

// API request types
export interface AddTrackedItemRequest {
  url: string;
  variantId?: string;
  targetPrice?: number; // cents
}

export interface UpdateTrackedItemRequest {
  targetPrice?: number | null;
  isActive?: boolean;
}
