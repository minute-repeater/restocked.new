import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock setup (available inside vi.mock factories) ───────────────

const { mockDb, chain } = vi.hoisted(() => {
  // Build chainable mock that resolves to configurable results
  function chain(result: unknown = []) {
    const obj: Record<string, unknown> = {};
    const methods = ['select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'insert', 'values', 'returning', 'update', 'set', 'execute'];
    for (const m of methods) {
      obj[m] = vi.fn(() => {
        if (m === 'returning' || m === 'limit') return result;
        return obj;
      });
    }
    // Make thenable so `await db.select()...orderBy()` resolves to result
    obj.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return obj;
  }

  const mockDb = {
    query: {
      users: { findFirst: vi.fn() },
      products: { findFirst: vi.fn() },
      trackedItems: { findFirst: vi.fn() },
      variants: { findFirst: vi.fn() },
    },
    select: vi.fn(() => chain()),
    insert: vi.fn(() => chain()),
    update: vi.fn(() => chain()),
    execute: vi.fn(),
  };

  return { mockDb, chain };
});

// ─── Module mocks ──────────────────────────────────────────────────────────

vi.mock('@covet/db', () => ({
  db: mockDb,
  products: { id: 'products.id', normalizedUrl: 'products.normalizedUrl', url: 'products.url', name: 'products.name', imageUrl: 'products.imageUrl', retailer: 'products.retailer' },
  trackedItems: { id: 'trackedItems.id', userId: 'trackedItems.userId', productId: 'trackedItems.productId', variantId: 'trackedItems.variantId', targetPrice: 'trackedItems.targetPrice', isActive: 'trackedItems.isActive', createdAt: 'trackedItems.createdAt' },
  stockChecks: { id: 'stockChecks.id', productId: 'stockChecks.productId', variantId: 'stockChecks.variantId', inStock: 'stockChecks.inStock', price: 'stockChecks.price', checkedAt: 'stockChecks.checkedAt', currency: 'stockChecks.currency' },
  notifications: { id: 'notifications.id', trackedItemId: 'notifications.trackedItemId', type: 'notifications.type', status: 'notifications.status', sentAt: 'notifications.sentAt', createdAt: 'notifications.createdAt' },
  variants: { id: 'variants.id', productId: 'variants.productId', name: 'variants.name', sku: 'variants.sku' },
  users: { id: 'users.id', plan: 'users.plan' },
  eq: vi.fn((a: unknown, b: unknown) => ({ _eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ _and: args })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
  isNull: vi.fn((col: unknown) => ({ _isNull: col })),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
}));

vi.mock('../config.js', () => ({
  config: {
    env: 'test',
    port: 3000,
    databaseUrl: 'postgres://test',
    jwtSecret: 'test-secret-that-is-at-least-32-characters-long',
    frontendUrl: 'http://localhost:5173',
  },
}));

vi.mock('@covet/scraper', () => ({
  extractProductData: vi.fn(),
  closeBrowser: vi.fn(),
}));

vi.mock('@covet/shared/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────────

import {
  addTrackedItem,
  updateTrackedItem,
  deleteTrackedItem,
  getStockHistory,
  getItemNotifications,
} from '../services/tracking.service.js';
import { extractProductData, closeBrowser } from '@covet/scraper';

// ─── Helpers ───────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-1', email: 'test@test.com', plan: 'free' as const };
const MOCK_PRODUCT = {
  id: 'prod-1',
  url: 'https://example.com/product',
  normalizedUrl: 'https://example.com/product',
  name: 'Test Product',
  imageUrl: 'https://example.com/img.jpg',
  retailer: 'example',
};

function resetMocks() {
  vi.clearAllMocks();
  // Default: user exists on free plan
  mockDb.query.users.findFirst.mockResolvedValue(MOCK_USER);
  // Default: no existing products
  mockDb.query.products.findFirst.mockResolvedValue(null);
  // Default: no existing tracked items
  mockDb.query.trackedItems.findFirst.mockResolvedValue(null);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('tracking.service', () => {
  beforeEach(resetMocks);

  // ── addTrackedItem ──────────────────────────────────────────────────────

  describe('addTrackedItem', () => {
    it('throws 404 when user does not exist', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(addTrackedItem('nonexistent', 'https://example.com/product'))
        .rejects.toThrow('User not found');
    });

    it('throws 403 when free plan limit is reached (3 items)', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(MOCK_USER);

      // Count query returns 3 (at free plan limit)
      const countChain = chain([{ count: 3 }]);
      mockDb.select.mockReturnValueOnce(countChain as ReturnType<typeof mockDb.select>);

      await expect(addTrackedItem('user-1', 'https://example.com/product'))
        .rejects.toThrow('Plan limit reached');
    });

    it('throws 403 when basic plan limit is reached (25 items)', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({ ...MOCK_USER, plan: 'basic' });

      const countChain = chain([{ count: 25 }]);
      mockDb.select.mockReturnValueOnce(countChain as ReturnType<typeof mockDb.select>);

      await expect(addTrackedItem('user-1', 'https://example.com/product'))
        .rejects.toThrow('Plan limit reached');
    });

    it('allows adding items when under plan limit', async () => {
      // Count: under limit
      const countChain = chain([{ count: 1 }]);
      mockDb.select.mockReturnValueOnce(countChain as ReturnType<typeof mockDb.select>);

      // Scraper returns data
      vi.mocked(extractProductData).mockResolvedValue({
        data: {
          name: 'New Product',
          imageUrl: 'https://example.com/img.jpg',
          price: 5000,
          currency: 'USD',
          inStock: true,
          variants: [],
          retailer: 'example',
          confidence: 0.9,
        },
        fetchResult: { html: '', finalUrl: '', statusCode: 200, usedBrowser: false },
      });

      // Product insert
      const insertProductChain = chain([MOCK_PRODUCT]);
      mockDb.insert.mockReturnValueOnce(insertProductChain as ReturnType<typeof mockDb.insert>);

      // Stock check insert
      const stockInsertChain = chain([]);
      mockDb.insert.mockReturnValueOnce(stockInsertChain as ReturnType<typeof mockDb.insert>);

      // Tracked item insert
      const trackedInsertChain = chain([{ id: 'track-1', userId: 'user-1', productId: 'prod-1', isActive: true }]);
      mockDb.insert.mockReturnValueOnce(trackedInsertChain as ReturnType<typeof mockDb.insert>);

      const result = await addTrackedItem('user-1', 'https://example.com/product');
      expect(result).toBeTruthy();
      expect(result.id).toBe('track-1');
    });

    it('throws 409 when already tracking same product', async () => {
      // Count: under limit
      const countChain = chain([{ count: 0 }]);
      mockDb.select.mockReturnValueOnce(countChain as ReturnType<typeof mockDb.select>);

      // Product already exists
      mockDb.query.products.findFirst.mockResolvedValue(MOCK_PRODUCT);

      // Already tracking (active)
      mockDb.query.trackedItems.findFirst.mockResolvedValue({
        id: 'track-1',
        userId: 'user-1',
        productId: 'prod-1',
        isActive: true,
      });

      await expect(addTrackedItem('user-1', 'https://example.com/product'))
        .rejects.toThrow('Already tracking this product');
    });

    it('reactivates an inactive tracked item instead of creating new', async () => {
      // Count: under limit
      const countChain = chain([{ count: 0 }]);
      mockDb.select.mockReturnValueOnce(countChain as ReturnType<typeof mockDb.select>);

      // Product exists
      mockDb.query.products.findFirst.mockResolvedValue(MOCK_PRODUCT);

      // Tracked item exists but inactive
      mockDb.query.trackedItems.findFirst.mockResolvedValue({
        id: 'track-1',
        userId: 'user-1',
        productId: 'prod-1',
        isActive: false,
        targetPrice: null,
      });

      // Update returns reactivated item
      const updateChain = chain([{ id: 'track-1', isActive: true }]);
      mockDb.update.mockReturnValueOnce(updateChain as ReturnType<typeof mockDb.update>);

      const result = await addTrackedItem('user-1', 'https://example.com/product');
      expect(result).toBeTruthy();
      expect(result.isActive).toBe(true);
    });

    it('creates product with minimal data when scraper fails', async () => {
      // Count: under limit
      const countChain = chain([{ count: 0 }]);
      mockDb.select.mockReturnValueOnce(countChain as ReturnType<typeof mockDb.select>);

      // Scraper fails
      vi.mocked(extractProductData).mockRejectedValue(new Error('Scraper timeout'));
      vi.mocked(closeBrowser).mockResolvedValue(undefined);

      // Fallback product insert (URL-only)
      const insertProductChain = chain([{ ...MOCK_PRODUCT, name: null, imageUrl: null }]);
      mockDb.insert.mockReturnValueOnce(insertProductChain as ReturnType<typeof mockDb.insert>);

      // Tracked item insert
      const trackedInsertChain = chain([{ id: 'track-1', userId: 'user-1', productId: 'prod-1', isActive: true }]);
      mockDb.insert.mockReturnValueOnce(trackedInsertChain as ReturnType<typeof mockDb.insert>);

      const result = await addTrackedItem('user-1', 'https://example.com/product');
      expect(result).toBeTruthy();
      expect(closeBrowser).toHaveBeenCalled();
    });
  });

  // ── updateTrackedItem ───────────────────────────────────────────────────

  describe('updateTrackedItem', () => {
    it('throws 404 when item does not belong to user', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue(null);

      await expect(updateTrackedItem('user-1', 'track-99', { targetPrice: 5000 }))
        .rejects.toThrow('Tracked item not found');
    });

    it('updates target price successfully', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue({
        id: 'track-1',
        userId: 'user-1',
        targetPrice: null,
      });

      const updateChain = chain([{ id: 'track-1', targetPrice: 5000 }]);
      mockDb.update.mockReturnValueOnce(updateChain as ReturnType<typeof mockDb.update>);

      const result = await updateTrackedItem('user-1', 'track-1', { targetPrice: 5000 });
      expect(result.targetPrice).toBe(5000);
    });

    it('can set isActive to false (pause tracking)', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue({
        id: 'track-1',
        userId: 'user-1',
        isActive: true,
      });

      const updateChain = chain([{ id: 'track-1', isActive: false }]);
      mockDb.update.mockReturnValueOnce(updateChain as ReturnType<typeof mockDb.update>);

      const result = await updateTrackedItem('user-1', 'track-1', { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('can clear target price by setting to null', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue({
        id: 'track-1',
        userId: 'user-1',
        targetPrice: 5000,
      });

      const updateChain = chain([{ id: 'track-1', targetPrice: null }]);
      mockDb.update.mockReturnValueOnce(updateChain as ReturnType<typeof mockDb.update>);

      const result = await updateTrackedItem('user-1', 'track-1', { targetPrice: null });
      expect(result.targetPrice).toBeNull();
    });
  });

  // ── deleteTrackedItem ───────────────────────────────────────────────────

  describe('deleteTrackedItem', () => {
    it('throws 404 when item does not belong to user', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue(null);

      await expect(deleteTrackedItem('user-1', 'track-99'))
        .rejects.toThrow('Tracked item not found');
    });

    it('soft deletes by setting isActive to false', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue({
        id: 'track-1',
        userId: 'user-1',
        isActive: true,
      });

      const updateChain = chain([]);
      mockDb.update.mockReturnValueOnce(updateChain as ReturnType<typeof mockDb.update>);

      await deleteTrackedItem('user-1', 'track-1');

      // Verify update was called (soft delete, not hard delete)
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ── getStockHistory ─────────────────────────────────────────────────────

  describe('getStockHistory', () => {
    it('throws 404 when item does not belong to user', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue(null);

      await expect(getStockHistory('user-1', 'track-99'))
        .rejects.toThrow('Tracked item not found');
    });

    it('returns stock checks for owned item', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue({
        id: 'track-1',
        userId: 'user-1',
        productId: 'prod-1',
        variantId: null,
      });

      const checks = [
        { inStock: true, price: 5000, currency: 'USD', checkedAt: new Date() },
        { inStock: false, price: 5000, currency: 'USD', checkedAt: new Date(Date.now() - 3600000) },
      ];

      const selectChain = chain(checks);
      mockDb.select.mockReturnValueOnce(selectChain as ReturnType<typeof mockDb.select>);

      const result = await getStockHistory('user-1', 'track-1');
      expect(result).toHaveLength(2);
      expect(result[0].inStock).toBe(true);
      expect(result[1].inStock).toBe(false);
    });
  });

  // ── getItemNotifications ────────────────────────────────────────────────

  describe('getItemNotifications', () => {
    it('throws 404 when item does not belong to user', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue(null);

      await expect(getItemNotifications('user-1', 'track-99'))
        .rejects.toThrow('Tracked item not found');
    });

    it('returns notifications for owned item', async () => {
      mockDb.query.trackedItems.findFirst.mockResolvedValue({
        id: 'track-1',
        userId: 'user-1',
        productId: 'prod-1',
      });

      const notifs = [
        { id: 'n-1', type: 'back_in_stock', status: 'sent', sentAt: new Date(), createdAt: new Date() },
      ];

      const selectChain = chain(notifs);
      mockDb.select.mockReturnValueOnce(selectChain as ReturnType<typeof mockDb.select>);

      const result = await getItemNotifications('user-1', 'track-1');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('back_in_stock');
    });
  });
});
