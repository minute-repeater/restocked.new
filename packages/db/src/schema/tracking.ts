import { pgTable, uuid, integer, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { products, variants } from './products.js';

export const trackedItems = pgTable(
  'tracked_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => variants.id, { onDelete: 'cascade' }),
    targetPrice: integer('target_price'), // cents - notify if price <= this
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('tracked_items_user_id_idx').on(table.userId),
    productIdIdx: index('tracked_items_product_id_idx').on(table.productId),
    // Prevent duplicate tracking: user can only track a product+variant combo once
    // NULL variantId is handled separately (user tracks base product)
    uniqueUserProductVariant: unique('tracked_items_user_product_variant_unique').on(
      table.userId,
      table.productId,
      table.variantId
    ),
  })
);
