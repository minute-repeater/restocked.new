import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  RESEND_API_KEY: z.string(),
  FROM_EMAIL: z.string().email().default('alerts@covet.deals'),
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
    databaseUrl: result.data.DATABASE_URL,
    resendApiKey: result.data.RESEND_API_KEY,
    fromEmail: result.data.FROM_EMAIL,
  };
}

export const config = loadConfig();
