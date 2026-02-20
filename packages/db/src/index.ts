export { db, type Database } from './client.js';
export * from './schema/index.js';

// Re-export drizzle utilities that repositories will need
export { eq, and, or, desc, asc, isNull, sql, inArray } from 'drizzle-orm';
