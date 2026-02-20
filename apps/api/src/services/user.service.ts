import bcrypt from 'bcrypt';
import { db, users, userNotificationSettings, eq } from '@restocked/db';
import { AppError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;

export async function createUser(email: string, password: string) {
  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existing) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
    })
    .returning({
      id: users.id,
      email: users.email,
      plan: users.plan,
      createdAt: users.createdAt,
    });

  // Create default notification settings
  await db.insert(userNotificationSettings).values({
    userId: user.id,
    emailEnabled: 'true',
  });

  return user;
}

export async function verifyCredentials(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user || !user.passwordHash) {
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  return {
    id: user.id,
    email: user.email,
    plan: user.plan,
    createdAt: user.createdAt,
  };
}

export async function findOrCreateGoogleUser(
  googleId: string,
  email: string,
  emailVerified: boolean
) {
  // 1. Check by googleId first (already linked)
  let user = await db.query.users.findFirst({
    where: eq(users.googleId, googleId),
  });

  if (user) {
    return {
      id: user.id,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
    };
  }

  // 2. Check by email (link existing email/password account)
  user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (user) {
    await db
      .update(users)
      .set({
        googleId,
        emailVerified: emailVerified || user.emailVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return {
      id: user.id,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
    };
  }

  // 3. Create new user (Google-only, no password)
  const [newUser] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash: null,
      googleId,
      authProvider: 'google',
      emailVerified: emailVerified,
    })
    .returning({
      id: users.id,
      email: users.email,
      plan: users.plan,
      createdAt: users.createdAt,
    });

  // Create default notification settings
  await db.insert(userNotificationSettings).values({
    userId: newUser.id,
    emailEnabled: 'true',
  });

  return newUser;
}

export async function getUserById(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return {
    id: user.id,
    email: user.email,
    plan: user.plan,
    createdAt: user.createdAt,
  };
}
