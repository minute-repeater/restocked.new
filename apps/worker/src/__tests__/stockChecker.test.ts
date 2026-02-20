import { describe, it, expect, vi } from 'vitest';

// Mock all heavy dependencies that stockChecker imports
vi.mock('@restocked/db', () => ({
  db: {},
  products: {},
  trackedItems: {},
  stockChecks: {},
  notifications: {},
  users: {},
  userNotificationSettings: {},
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  isNull: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('@restocked/scraper', () => ({
  extractProductData: vi.fn(),
  closeBrowser: vi.fn(),
}));

vi.mock('@restocked/shared/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../notifications/email.js', () => ({
  sendEmailNotification: vi.fn(),
}));

vi.mock('../config.js', () => ({
  config: {
    env: 'test',
    databaseUrl: 'postgres://localhost/test',
    resendApiKey: 'test-key',
    fromEmail: 'test@test.com',
  },
}));

import { getNotificationType, type ProductToCheck } from '../jobs/stockChecker.js';

function makeProduct(overrides: Partial<ProductToCheck> = {}): ProductToCheck {
  return {
    productId: 'prod-1',
    productUrl: 'https://example.com/product',
    productName: 'Test Product',
    variantId: null,
    trackedItemId: 'track-1',
    userId: 'user-1',
    userEmail: 'test@example.com',
    targetPrice: null,
    lastInStock: null,
    lastPrice: null,
    ...overrides,
  };
}

describe('getNotificationType', () => {
  describe('back_in_stock', () => {
    it('should trigger when product goes from out-of-stock to in-stock', () => {
      const product = makeProduct({ lastInStock: false });
      const result = getNotificationType(product, { inStock: true, price: 5000 });
      expect(result).toBe('back_in_stock');
    });

    it('should NOT trigger when product was already in stock', () => {
      const product = makeProduct({ lastInStock: true });
      const result = getNotificationType(product, { inStock: true, price: 5000 });
      expect(result).toBeNull();
    });

    it('should NOT trigger when product stays out of stock', () => {
      const product = makeProduct({ lastInStock: false });
      const result = getNotificationType(product, { inStock: false, price: 5000 });
      expect(result).toBeNull();
    });

    it('should NOT trigger when lastInStock is null (first check)', () => {
      const product = makeProduct({ lastInStock: null });
      const result = getNotificationType(product, { inStock: true, price: 5000 });
      expect(result).toBeNull();
    });
  });

  describe('price_drop', () => {
    it('should trigger when price drops ≥5%', () => {
      const product = makeProduct({ lastPrice: 10000 });
      const result = getNotificationType(product, { inStock: true, price: 9400 });
      expect(result).toBe('price_drop');
    });

    it('should trigger at exactly 5% drop', () => {
      const product = makeProduct({ lastPrice: 10000 });
      const result = getNotificationType(product, { inStock: true, price: 9500 });
      expect(result).toBe('price_drop');
    });

    it('should NOT trigger when price drops <5%', () => {
      const product = makeProduct({ lastPrice: 10000 });
      const result = getNotificationType(product, { inStock: true, price: 9600 });
      expect(result).toBeNull();
    });

    it('should NOT trigger when price increases', () => {
      const product = makeProduct({ lastPrice: 10000 });
      const result = getNotificationType(product, { inStock: true, price: 11000 });
      expect(result).toBeNull();
    });

    it('should NOT trigger when no previous price', () => {
      const product = makeProduct({ lastPrice: null });
      const result = getNotificationType(product, { inStock: true, price: 5000 });
      expect(result).toBeNull();
    });

    it('should NOT trigger when current price is null', () => {
      const product = makeProduct({ lastPrice: 10000 });
      const result = getNotificationType(product, { inStock: true, price: null });
      expect(result).toBeNull();
    });
  });

  describe('price_target_hit', () => {
    it('should trigger when price drops to target', () => {
      const product = makeProduct({ targetPrice: 9000, lastPrice: 9500 });
      const result = getNotificationType(product, { inStock: true, price: 9000 });
      expect(result).toBe('price_target_hit');
    });

    it('should trigger when price drops below target', () => {
      const product = makeProduct({ targetPrice: 9000, lastPrice: 9500 });
      const result = getNotificationType(product, { inStock: true, price: 8500 });
      expect(result).toBe('price_target_hit');
    });

    it('should NOT trigger when previous price was already at/below target', () => {
      const product = makeProduct({ targetPrice: 9000, lastPrice: 8500 });
      const result = getNotificationType(product, { inStock: true, price: 8000 });
      // This should be price_drop, not price_target_hit (already below target)
      expect(result).not.toBe('price_target_hit');
    });

    it('should NOT trigger when no target price set', () => {
      const product = makeProduct({ targetPrice: null, lastPrice: 10000 });
      const result = getNotificationType(product, { inStock: true, price: 5000 });
      // Should be price_drop instead
      expect(result).not.toBe('price_target_hit');
    });

    it('should NOT trigger when no previous price', () => {
      const product = makeProduct({ targetPrice: 9000, lastPrice: null });
      const result = getNotificationType(product, { inStock: true, price: 8000 });
      expect(result).toBeNull();
    });
  });

  describe('no notification', () => {
    it('should return null when nothing changed', () => {
      const product = makeProduct({ lastInStock: true, lastPrice: 5000 });
      const result = getNotificationType(product, { inStock: true, price: 5000 });
      expect(result).toBeNull();
    });

    it('should return null on first check (no previous data)', () => {
      const product = makeProduct({ lastInStock: null, lastPrice: null });
      const result = getNotificationType(product, { inStock: true, price: 5000 });
      expect(result).toBeNull();
    });

    it('should return null when inStock is null (scraper failed)', () => {
      const product = makeProduct({ lastInStock: false });
      const result = getNotificationType(product, { inStock: null, price: 5000 });
      expect(result).toBeNull();
    });
  });

  describe('priority', () => {
    it('should prioritize back_in_stock over price_drop', () => {
      // Product comes back in stock AND has a big price drop
      const product = makeProduct({ lastInStock: false, lastPrice: 10000 });
      const result = getNotificationType(product, { inStock: true, price: 8000 });
      expect(result).toBe('back_in_stock');
    });

    it('should prioritize back_in_stock over price_target_hit', () => {
      const product = makeProduct({ lastInStock: false, lastPrice: 10000, targetPrice: 9000 });
      const result = getNotificationType(product, { inStock: true, price: 8000 });
      expect(result).toBe('back_in_stock');
    });
  });
});
