import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
} from '../services/billing.service.js';

const router: RouterType = Router();
router.use(authenticate);

const checkoutSchema = z.object({
  plan: z.enum(['basic', 'premium']),
  interval: z.enum(['monthly', 'annual']),
});

// POST /billing/checkout
router.post('/checkout', async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { plan, interval } = checkoutSchema.parse(req.body);
    const url = await createCheckoutSession(userId, plan, interval);
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

// POST /billing/portal
router.post('/portal', async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const url = await createPortalSession(userId);
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

// GET /billing/status
router.get('/status', async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const status = await getBillingStatus(userId);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

export default router;
