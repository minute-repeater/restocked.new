import { pgTable, uuid, varchar, timestamp, boolean, pgEnum, index } from 'drizzle-orm/pg-core';

export const planTierEnum = pgEnum('plan_tier', ['free', 'basic', 'premium']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  plan: planTierEnum('plan').notNull().default('free'),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  authProvider: varchar('auth_provider', { length: 50 }).notNull().default('email'),
  googleId: varchar('google_id', { length: 255 }).unique(),
  isAdmin: boolean('is_admin').notNull().default(false),
  // Stripe billing
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeCurrentPeriodEnd: timestamp('stripe_current_period_end', { withTimezone: true }),
  stripeCancelAtPeriodEnd: boolean('stripe_cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  stripeCustomerIdIdx: index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
}));

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userNotificationSettings = pgTable('user_notification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  emailEnabled: varchar('email_enabled').notNull().default('true'),
  emailAddress: varchar('email_address', { length: 255 }), // override email, null = use user.email
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
