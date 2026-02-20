import { pgTable, uuid, varchar, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull(),
    normalizedUrl: text('normalized_url').notNull().unique(),
    name: varchar('name', { length: 500 }),
    imageUrl: text('image_url'),
    retailer: varchar('retailer', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    normalizedUrlIdx: index('products_normalized_url_idx').on(table.normalizedUrl),
    retailerIdx: index('products_retailer_idx').on(table.retailer),
  })
);

export const variants = pgTable(
  'variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(), // e.g., "Size: Large"
    sku: varchar('sku', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('variants_product_id_idx').on(table.productId),
  })
);

export const stockChecks = pgTable(
  'stock_checks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => variants.id, { onDelete: 'cascade' }),
    inStock: boolean('in_stock').notNull(),
    price: integer('price'), // stored in cents
    currency: varchar('currency', { length: 3 }), // ISO 4217
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdCheckedAtIdx: index('stock_checks_product_checked_idx').on(
      table.productId,
      table.checkedAt
    ),
    variantIdCheckedAtIdx: index('stock_checks_variant_checked_idx').on(
      table.variantId,
      table.checkedAt
    ),
  })
);
