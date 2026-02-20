import { pgTable, uuid, varchar, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { trackedItems } from './tracking.js';

export const notificationTypeEnum = pgEnum('notification_type', [
  'back_in_stock',
  'price_drop',
  'price_target_hit',
]);

export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'failed']);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    trackedItemId: uuid('tracked_item_id')
      .notNull()
      .references(() => trackedItems.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    status: notificationStatusEnum('status').notNull().default('pending'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    errorMessage: varchar('error_message', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    statusIdx: index('notifications_status_idx').on(table.status),
    trackedItemIdIdx: index('notifications_tracked_item_id_idx').on(table.trackedItemId),
  })
);
