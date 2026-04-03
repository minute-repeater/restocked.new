import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { createUser, verifyCredentials, getUserById, findOrCreateGoogleUser } from '../services/user.service.js';
import { requestPasswordReset, resetPassword } from '../services/passwordReset.service.js';
import { generateToken, authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config.js';

const router: RouterType = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const user = await createUser(email, password);
    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await verifyCredentials(email, password);
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const user = await getUserById(userId);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        isAdmin: user.isAdmin || false,
        createdAt: user.createdAt.toISOString(),
        hasSubscription: user.hasSubscription,
        cancelAtPeriodEnd: user.cancelAtPeriodEnd,
        currentPeriodEnd: user.currentPeriodEnd?.toISOString() ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/forgot-password
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(email);

    // Always return 200 — don't reveal if email exists
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

// POST /auth/reset-password
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await resetPassword(token, password);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    next(error);
  }
});

// POST /auth/google
const googleSchema = z.object({
  idToken: z.string().min(1),
});

router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = googleSchema.parse(req.body);

    if (!config.googleClientId) {
      throw new AppError(501, 'Google sign-in is not configured');
    }

    const client = new OAuth2Client(config.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError(401, 'Invalid Google token');
    }

    const user = await findOrCreateGoogleUser(
      payload.sub,
      payload.email,
      payload.email_verified ?? false
    );

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
