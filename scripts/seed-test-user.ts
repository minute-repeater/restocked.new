#!/usr/bin/env node
/**
 * Seed a test user for local/staging login.
 *
 * Usage (from monorepo root):
 *   npx tsx --env-file=.env scripts/seed-test-user.ts
 */

import { execSync } from 'node:child_process';
import { db, users, userNotificationSettings, eq } from '../packages/db/src/index.js';

const TEST_EMAIL = 'test@covet.deals';
const TEST_PASSWORD = 'CovetTest2026!';

async function hashPassword(password: string): Promise<string> {
  const escaped = password.replace(/'/g, "'\\''");
  return execSync(
    `node -e "require('bcrypt').hash('${escaped}',12).then(h=>process.stdout.write(h))"`,
    { cwd: `${process.cwd()}/apps/api`, encoding: 'utf-8' }
  );
}

async function main() {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, TEST_EMAIL),
  });

  if (existing) {
    console.log(`\n  Test user already exists: ${TEST_EMAIL}`);
    console.log(`  Password: ${TEST_PASSWORD}\n`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(TEST_PASSWORD);

  const [user] = await db
    .insert(users)
    .values({
      email: TEST_EMAIL,
      passwordHash,
      emailVerified: true,
    })
    .returning({ id: users.id, email: users.email, plan: users.plan });

  await db.insert(userNotificationSettings).values({
    userId: user.id,
    emailEnabled: 'true',
  });

  console.log(`\n  Test user created`);
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  Plan:     ${user.plan}`);
  console.log(`  ID:       ${user.id}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to seed test user:', err);
  process.exit(1);
});
