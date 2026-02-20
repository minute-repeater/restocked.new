import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const isProduction = process.env.NODE_ENV === 'production';

// Create postgres.js client with production-ready settings
const queryClient = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  ssl: isProduction ? 'require' : false,
});

// Create drizzle instance with schema for relational queries
export const db = drizzle(queryClient, { schema });

// Export for migrations
export const migrationClient = postgres(connectionString, {
  max: 1,
  ssl: isProduction ? 'require' : false,
});

// Type exports
export type Database = typeof db;
