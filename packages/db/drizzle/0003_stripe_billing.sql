ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255) UNIQUE;
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" varchar(255);
ALTER TABLE "users" ADD COLUMN "stripe_current_period_end" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "stripe_cancel_at_period_end" boolean NOT NULL DEFAULT false;
CREATE INDEX "users_stripe_customer_id_idx" ON "users" ("stripe_customer_id");
