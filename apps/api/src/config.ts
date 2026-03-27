import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().default('alerts@covet.deals'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Stripe billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_BASIC_MONTHLY: z.string().optional(),
  STRIPE_PRICE_BASIC_ANNUAL: z.string().optional(),
  STRIPE_PRICE_PREMIUM_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PREMIUM_ANNUAL: z.string().optional(),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return {
    env: result.data.NODE_ENV,
    port: parseInt(result.data.PORT, 10),
    databaseUrl: result.data.DATABASE_URL,
    jwtSecret: result.data.JWT_SECRET,
    frontendUrl: result.data.FRONTEND_URL,
    resendApiKey: result.data.RESEND_API_KEY,
    fromEmail: result.data.FROM_EMAIL,
    googleClientId: result.data.GOOGLE_CLIENT_ID,
    // Stripe billing
    stripeSecretKey: result.data.STRIPE_SECRET_KEY,
    stripeWebhookSecret: result.data.STRIPE_WEBHOOK_SECRET,
    stripePriceBasicMonthly: result.data.STRIPE_PRICE_BASIC_MONTHLY,
    stripePriceBasicAnnual: result.data.STRIPE_PRICE_BASIC_ANNUAL,
    stripePricePremiumMonthly: result.data.STRIPE_PRICE_PREMIUM_MONTHLY,
    stripePricePremiumAnnual: result.data.STRIPE_PRICE_PREMIUM_ANNUAL,
  };
}

export const config = loadConfig();
