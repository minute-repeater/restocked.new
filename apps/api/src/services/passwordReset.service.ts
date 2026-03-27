import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { db, users, passwordResetTokens, eq, and, isNull } from '@covet/db';
import { createLogger } from '@covet/shared/logger';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';

const log = createLogger('api:passwordReset');
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Initiates a password reset. Generates a token, stores a hash, and sends an email.
 * Always returns void (never reveals if email exists).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  // Always return silently — don't reveal if email exists
  if (!user) {
    log.debug({ email }, 'Password reset requested for non-existent email');
    return;
  }

  // Generate a random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, SALT_ROUNDS);

  // Invalidate any existing unused tokens for this user
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt)
      )
    );

  // Store the new token
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
  });

  // Send email
  const resetUrl = `${config.frontendUrl}/reset-password?token=${rawToken}`;

  if (!config.resendApiKey) {
    log.warn('RESEND_API_KEY not set, skipping password reset email');
    log.info({ resetUrl }, 'Password reset link (dev mode)');
    return;
  }

  try {
    const resend = new Resend(config.resendApiKey);
    await resend.emails.send({
      from: config.fromEmail,
      to: user.email,
      subject: 'Reset your Covet password',
      html: getResetEmailHtml(resetUrl),
    });

    log.info({ userId: user.id }, 'Password reset email sent');
  } catch (error) {
    log.error({ err: error, userId: user.id }, 'Failed to send password reset email');
    // Don't throw — we already stored the token, and we don't want to leak info
  }
}

/**
 * Resets a password using a valid token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }

  // Find all unexpired, unused tokens
  const recentTokens = await db
    .select()
    .from(passwordResetTokens)
    .where(and(isNull(passwordResetTokens.usedAt)));

  // Check each token against the provided one
  let matchedToken: (typeof recentTokens)[0] | null = null;
  for (const t of recentTokens) {
    // Skip expired tokens
    if (t.expiresAt < new Date()) continue;

    const matches = await bcrypt.compare(token, t.tokenHash);
    if (matches) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) {
    throw new AppError(400, 'Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update user password
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, matchedToken.userId));

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, matchedToken.id));

  log.info({ userId: matchedToken.userId }, 'Password reset successful');
}

function getResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #FAF9F6;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
    <div style="padding: 32px;">
      <h1 style="margin: 0 0 16px; font-size: 24px; color: #2D2926; font-weight: 300;">
        Reset Your Password
      </h1>
      <p style="margin: 0 0 24px; font-size: 15px; color: #6B6661; line-height: 1.6;">
        We received a request to reset the password for your Covet account. Click the button below to set a new password.
      </p>
      <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background: #2D2926; color: white; text-decoration: none; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 500;">
        Reset Password
      </a>
      <p style="margin: 24px 0 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <div style="padding: 16px 32px; background: #FAF9F6; border-top: 1px solid #E8E2D9;">
      <p style="margin: 0; font-size: 11px; color: #9ca3af; letter-spacing: 0.1em; text-transform: uppercase;">
        Covet
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
